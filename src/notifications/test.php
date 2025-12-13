<?php
require_once __DIR__ . '/_bootstrap.php';
header('Content-Type: application/json; charset=utf-8');

$claims = authUser($APP_SECRET);
if (!$claims) { http_response_code(401); echo json_encode(array('error'=>'Unauthorized')); exit; }

$role    = strtoupper(isset($claims['role']) ? $claims['role'] : '');
$isAdmin = in_array($role, array('ADMIN','SUPER'), true);

// helpers
function uuidv4() {
  $d = openssl_random_pseudo_bytes(16);
  $d[6] = chr((ord($d[6]) & 0x0f) | 0x40);
  $d[8] = chr((ord($d[8]) & 0x3f) | 0x80);
  return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($d), 4));
}
function bool01($v){ return ($v === true || $v === 1 || $v === '1' || $v === 'yes' || $v === 'YES' || $v === 'on') ? 1 : 0; }

function sendExpoPush($expoToken, $title, $body, $data = []) {
  $payload = [
    'to'    => $expoToken,
    'sound'=> 'default',
    'title'=> $title,
    'body' => $body,
    'data' => $data,
  ];

  $ch = curl_init("https://exp.host/--/api/v2/push/send");
  curl_setopt($ch, CURLOPT_POST, true);
  curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
  curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_exec($ch);
  curl_close($ch);
}

function notifyAgent($pdo, $agentId, $title, $body, $data = []) {
  $stmt = $pdo->prepare("
    INSERT INTO notifications (id, title, body, audience, agentId, is_read, createdAt)
    VALUES (?, ?, ?, 'AGENT', ?, 0, NOW())
  ");
  $stmt->execute([
    uuidv4(),
    $title,
    $body,
    $agentId
  ]);

  $tok = $pdo->prepare("
    SELECT expo_token FROM user_push_tokens WHERE user_id = ?
  ");
  $tok->execute([$agentId]);

  foreach ($tok->fetchAll(PDO::FETCH_COLUMN) as $expoToken) {
    sendExpoPush($expoToken, $title, $body, $data);
  }
}

$in = jsonBody(); // mobile sends JSON

// sanitize allow-list
$allowed = array(
  'auctionType','modelid','makingYear','color','vin','lot','issueDate',
  'purchaseDate','pickupDate','warehouseDate',
  'userid','terminalid','destination','status','eta','containerNumber',
  'car_key','title','note'
);

$cols = array();
foreach ($allowed as $k) {
  if (array_key_exists($k, $in)) $cols[$k] = $in[$k];
}

// normalize booleans
if (isset($cols['car_key'])) $cols['car_key'] = bool01($cols['car_key']);
if (isset($cols['title']))   $cols['title']   = bool01($cols['title']);

// default status for new rows
if (!isset($cols['status']) || $cols['status'] === '' || $cols['status'] === null) $cols['status'] = 'WAREHOUSE';

// UPDATE if id present
if (!empty($in['id'])) {
  $id = (string)$in['id'];

  // fetch old status before update
  $oldStmt = $pdo->prepare("SELECT status, userid FROM `car` WHERE `id` = ?");
  $oldStmt->execute([$id]);
  $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);

  $oldStatus  = $oldRow['status'] ?? null;
  $carOwnerId = $oldRow['userid'] ?? null;

  // non-admins may only update their own car
  if (!$isAdmin) {
    $chk = $pdo->prepare("SELECT userid FROM `car` WHERE `id` = ?");
    $chk->execute(array($id));
    $owner = $chk->fetchColumn();
    if (!$owner || (string)$owner !== (string)$claims['id']) {
      http_response_code(403);
      echo json_encode(array('error'=>'Forbidden (owner)'), JSON_UNESCAPED_UNICODE); exit;
    }
  }

  if (!$cols) { echo json_encode(array('ok'=>true, 'id'=>$id)); exit; }

  // build SET
  $set = array();
  $bind = array();
  foreach ($cols as $c => $v) { $set[] = "`$c` = ?"; $bind[] = $v; }
  $sql = "UPDATE `car` SET ".implode(', ', $set).", `updatedAt` = NOW() WHERE `id` = ?";
  $bind[] = $id;

  try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($bind);

    // --------------------
    // NOTIFICATIONS (NON-BLOCKING)
    // --------------------
    try {
      if ($carOwnerId) {

        $chk = $pdo->prepare("
          SELECT purchaseDate, warehouseDate, containerNumber
          FROM car WHERE id = ?
        ");
        $chk->execute([$id]);
        $now = $chk->fetch(PDO::FETCH_ASSOC);

        // Priority rule:
        // If containerNumber is newly added => send ONLY shipping notification (even if warehouseDate was added too)
        // Else if warehouseDate is newly added => send warehouse notification
        // Else if purchaseDate is newly added AND there is still no warehouseDate => send purchased notification

        $containerAdded = empty($oldRow['containerNumber']) && !empty($now['containerNumber']);
        $warehouseNow   = !empty($now['warehouseDate']);
        $warehouseAdded = empty($oldRow['warehouseDate']) && $warehouseNow;
        $purchaseAdded  = empty($oldRow['purchaseDate']) && !empty($now['purchaseDate']);

        // 1) SHIPPING (highest priority)
        if ($containerAdded) {
          notifyAgent(
            $pdo,
            $carOwnerId,
            'Car Shipped',
            'Your car is now being shipped.',
            ['carId' => $id]
          );

        // 2) WAREHOUSE
        } elseif ($warehouseAdded) {
          notifyAgent(
            $pdo,
            $carOwnerId,
            'Car at Warehouse',
            'Your car has arrived at the warehouse.',
            ['carId' => $id]
          );

        // 3) PURCHASED
        } elseif ($purchaseAdded && !$warehouseNow) {
          notifyAgent(
            $pdo,
            $carOwnerId,
            'Car Purchased',
            'Your car has been purchased.',
            ['carId' => $id]
          );
        }
      }
    } catch (Throwable $e) {
      // never block save
    }

    echo json_encode(array('ok'=>true, 'id'=>$id)); exit;
  } catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(array('error'=>'Save failed', 'detail'=>$e->getMessage()), JSON_UNESCAPED_UNICODE); exit;
  }
}

// CREATE
$required = array('modelid','makingYear','vin','lot','userid','terminalid','destination');
$missing = array();
foreach ($required as $rk) {
  if (!array_key_exists($rk, $cols) || $cols[$rk]==='' || $cols[$rk]===null) $missing[] = $rk;
}
if ($missing) { http_response_code(400); echo json_encode(array('error'=>'Missing fields','missing'=>$missing), JSON_UNESCAPED_UNICODE); exit; }

$newId = uuidv4();
$cols['id']        = $newId;
$cols['createdAt'] = null; // NOW()
$cols['updatedAt'] = null; // NOW()

// build INSERT
$fields = array_keys($cols);
$place  = array();
$bind   = array();
for ($i=0; $i<count($fields); $i++) $place[] = ($fields[$i]==='createdAt' || $fields[$i]==='updatedAt') ? 'NOW()' : '?';
foreach ($fields as $f) {
  if ($f==='createdAt' || $f==='updatedAt') continue;
  $bind[] = $cols[$f];
}

$sql = "INSERT INTO `car` (`".implode('`,`',$fields)."`) VALUES (".implode(',', $place).")";

try {
  $stmt = $pdo->prepare($sql);
  $stmt->execute($bind);

  // --------------------
  // NOTIFICATIONS (NON-BLOCKING)
  // --------------------
  try {
    // Priority on create:
    // containerNumber => shipped only
    // else warehouseDate => warehouse only
    // else purchaseDate => purchased only

    if (!empty($cols['containerNumber'])) {
      notifyAgent(
        $pdo,
        $cols['userid'],
        'Car Shipped',
        'Your car is now being shipped.',
        ['carId' => $newId]
      );

    } elseif (!empty($cols['warehouseDate'])) {
      notifyAgent(
        $pdo,
        $cols['userid'],
        'Car at Warehouse',
        'Your car has arrived at the warehouse.',
        ['carId' => $newId]
      );

    } elseif (!empty($cols['purchaseDate'])) {
      notifyAgent(
        $pdo,
        $cols['userid'],
        'Car Purchased',
        'Your car has been purchased.',
        ['carId' => $newId]
      );
    }
  } catch (Throwable $e) {
    // ignore notification failure
  }

  echo json_encode(array('ok'=>true, 'id'=>$newId)); exit;
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(array('error'=>'Save failed', 'detail'=>$e->getMessage()), JSON_UNESCAPED_UNICODE); exit;
}
