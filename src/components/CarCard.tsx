// src/components/CarCard.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import type { Car } from '../types';
import { createClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

type Props = {
  car: Car;
  onGallery?: (carId: string) => void;
  onEdit?: (car: Car) => void;
};

const THEME = {
  bg: '#F7F8FA',
  cardBg: '#FFFFFF',
  text: '#111827',
  subText: '#6B7280',
  border: '#E5E7EB',
  accent: '#2e6dd8',
  grayBg: '#F3F4F6',
};

// Cache agent names loaded from /agents.php to avoid per-card requests
const agentCache: Record<string, string> = {};
let agentsPromise: Promise<void> | null = null;

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  LOADED: { bg: '#E1FCEF', text: '#047857' },
  DISPATCHED: { bg: '#E0EAFF', text: '#1D4ED8' },
  WAREHOUSE: { bg: '#F3F4F6', text: '#111827' },
  COMPLETED: { bg: '#E1FCEF', text: '#065F46' },
  NEED_TRACKING: { bg: '#FEF3C7', text: '#92400E' },
};
const getStatusStyle = (s?: string | null) =>
  s ? (STATUS_STYLES[String(s).toUpperCase()] ?? { bg: THEME.grayBg, text: THEME.subText }) : { bg: THEME.grayBg, text: THEME.subText };

/** Conservative UTF-8 “un-mojibake” fixer.
 * Tries classic Latin-1→UTF-8 repair and a byte-wise percent decode.
 * Keeps a candidate only if it increases Arabic letter count and has no �.
 */
function demojibake(value: unknown): string {
  const s = (value ?? '').toString().trim();
  if (!s) return '';

  const hasArabic = /[\u0600-\u06FF]/.test(s);
  const hasMarkers = /[ÃÂØÙÐ×¢«»ß�]/.test(s);
  if (!hasMarkers) return s;

  const score = (x: string) => (x.match(/[\u0600-\u06FF]/g) || []).length;
  let best = s;
  let bestScore = score(s);
  const consider = (cand: string) => {
    if (!cand || cand.includes('�')) return;
    const sc = score(cand);
    if (sc > bestScore) { best = cand; bestScore = sc; }
  };

  // 1) Classic fix: decodeURIComponent(escape(s))
  try {
    // @ts-ignore deprecated but available in RN JS runtime
    const fixed = decodeURIComponent(escape(s));
    consider(fixed);
  } catch {}

  // 2) Byte-wise % decode of code units 0–255
  try {
    const pct = Array.from(s, ch => '%' + (ch.charCodeAt(0) & 0xff).toString(16).padStart(2, '0')).join('');
    consider(decodeURIComponent(pct));
  } catch {}

  // 3) latin1 -> utf8 directly (no 0xff mask)
  try {
    const pct2 = Array.from(s, ch => '%' + ch.charCodeAt(0).toString(16).padStart(2, '0')).join('');
    consider(decodeURIComponent(pct2));
  } catch {}

  return best.normalize('NFC');
}
const looksMojibake = (t: string) => /[ÃÂØÙÐ×¢«»ß�]/.test(t) && !/[\u0600-\u06FF]/.test(t);
const isArabic = (t: string) => /[\u0600-\u06FF]/.test(t);

export default function CarCard({ car, onGallery, onEdit }: Props) {
  const { token } = useAuth();
  const client = useMemo(() => createClient(token), [token]);

  const title =
    [demojibake((car as any).model ?? (car as any).make ?? ''), (car as any).year ?? (car as any).makingYear ?? '']
      .filter(Boolean)
      .join(' — ') || 'Vehicle';

  // Try several common fields coming from different APIs, then fix.
  const agentRaw =
    (car as any).agent_name ??
    (car as any).agentName ??
    (car as any).agent_full_name ??
    (car as any).agent ??
    (car as any).name ??
    (car as any).agent_username ??
    '';
  const agent = demojibake(agentRaw);

  // If the agent text looks mojibake and we have an id, try to resolve it via /agents.php (once, cached)
  const agentId =
    (car as any).userid ??
    (car as any).userId ??
    (car as any).agent_id ??
    (car as any).agentId ??
    null;

  const [agentFixed, setAgentFixed] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function ensureAgentsLoaded() {
      if (!agentsPromise) {
        agentsPromise = client
          .get('/agents.php')
          .then((r: any) => {
            const list: any[] = Array.isArray(r?.data) ? r.data : [];
            for (const it of list) {
              const id = (it as any)?.id != null ? String((it as any).id) : '';
              const name = ((it as any)?.name ?? (it as any)?.username ?? '').toString();
              if (id) agentCache[id] = name;
            }
          })
          .catch(() => { /* ignore */ });
      }
      await agentsPromise;
    }

    (async () => {
      if (!agentId) return;
      if (!looksMojibake(agent)) return;
      await ensureAgentsLoaded();
      const resolved = agentCache[String(agentId)];
      if (!cancelled && resolved) setAgentFixed(resolved);
    })();

    return () => { cancelled = true; };
  }, [agentId, agent, client]);

  const statusStyle = useMemo(() => getStatusStyle((car as any).status), [(car as any).status]);
  const [copied, setCopied] = useState(false);
  const destination = demojibake((car as any).destination ?? '');

  async function copyVIN() {
    const text = ((car as any).vin ?? '').toString().trim();
    if (!text) return;
    try {
      await Clipboard.setStringAsync(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => onGallery?.((car as any).id)}
        style={styles.thumbWrap}
        accessibilityRole="imagebutton"
        accessibilityLabel="Open gallery"
      >
        <Image
          source={(car as any).image ? { uri: (car as any).image } : undefined}
          style={styles.thumb}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={200}
        />
        {(car as any).status ? (
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]} numberOfLines={1}>
              {String((car as any).status).replace(/_/g, ' ')}
            </Text>
          </View>
        ) : null}
        <View style={styles.overlayLabel}>
          <Text style={styles.overlayLabelText}>Gallery</Text>
        </View>
      </Pressable>

      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>

        {(car as any).vin ? (
          <View style={styles.vinRow}>
            <Text style={styles.vinLabel}>VIN:</Text>
            {/* Copy when tapping VIN text */}
            <Text style={styles.vin} numberOfLines={1} onPress={copyVIN}>
              {(car as any).vin}
            </Text>
            {/* Primary copy button */}
            <Pressable onPress={copyVIN} hitSlop={12} style={styles.copyPill} accessibilityRole="button" accessibilityLabel="Copy VIN">
              <Text style={styles.copyPillText}>{copied ? 'Copied' : 'Copy'}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.pillRow}>
          {(car as any).destination ? (
            <View style={styles.pill}>
              <Text
                style={[
                  styles.pillText,
                  isArabic(destination) && { writingDirection: 'rtl', textAlign: 'right' },
                ]}
              >
                {destination}
              </Text>
            </View>
          ) : null}
          {(car as any).containerNumber ? (
            <View style={styles.pill}><Text style={styles.pillText}>CNT {(car as any).containerNumber}</Text></View>
          ) : null}
          {(car as any).eta ? (
            <View style={styles.pill}><Text style={styles.pillText}>ETA {(car as any).eta}</Text></View>
          ) : null}
        </View>

        {(agentFixed || agent) ? (
          <Text
            style={[styles.agent, isArabic(agentFixed || agent) && { textAlign: 'right', writingDirection: 'rtl' }]}
            numberOfLines={1}
          >
            <Text style={styles.agentLabel}>Agent: </Text>{agentFixed || agent}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <Pressable onPress={() => onGallery?.((car as any).id)}>
            <Text style={styles.link}>View gallery</Text>
          </Pressable>
          {onEdit ? (
            <Pressable onPress={() => onEdit(car)} style={{ marginLeft: 16 }}>
              <Text style={styles.link}>Edit</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {copied ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>VIN copied</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: THEME.cardBg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.border,
  },
  thumbWrap: {
    width: 110,
    height: 90,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: THEME.grayBg,
    marginRight: 12,
  },
  thumb: { width: '100%', height: '100%', backgroundColor: THEME.grayBg },
  badge: { position: 'absolute', top: 8, left: 8, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  overlayLabel: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(0,0,0,0.35)', paddingVertical: 4, alignItems: 'center' },
  overlayLabelText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  meta: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: THEME.text, marginBottom: 6 },
  vinRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  vinLabel: { color: THEME.subText, fontWeight: '700' },
  vin: { color: THEME.text, flexShrink: 1 },
  copyPill: { marginLeft: 'auto', backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  copyPillText: { color: THEME.accent, fontWeight: '700', fontSize: 12 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  pill: { backgroundColor: THEME.grayBg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { color: THEME.text, fontSize: 12, fontWeight: '600', writingDirection: 'auto' },
  agent: { color: THEME.subText, writingDirection: 'auto' },
  agentLabel: { fontWeight: '700', color: THEME.subText },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  link: { color: THEME.accent, fontWeight: '700' },
  toast: { position: 'absolute', right: 12, top: 12, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  toastText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
