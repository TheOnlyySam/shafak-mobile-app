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
  grayBg: '#FAB12F',
  danger: '#EF4444',
  color: '#FA812F',
  eta: '#B4E50D'
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
  SHIPPED: { bg: '#E0EAFF', text: '#1D4ED8' },
  'ON HOLD': { bg: '#FEE2E2', text: '#B91C1C' },
};
const getStatusStyle = (s?: string | null) =>
  s ? (STATUS_STYLES[String(s).toUpperCase()] ?? { bg: THEME.grayBg, text: THEME.subText }) : { bg: THEME.grayBg, text: THEME.subText };

/** Conservative UTF-8 “un-mojibake” fixer. */
function demojibake(value: unknown): string {
  const s = (value ?? '').toString().trim();
  if (!s) return '';

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

  // --- DATA PICKING & NORMALIZATION
  const brand = demojibake(
    (car as any).brand ??
    (car as any).brandName ??
    (car as any).brand_name ??
    (car as any).make ??
    ''
  );

  const model = demojibake(
    (car as any).model ??
    (car as any).modelName ??
    (car as any).model_name ??
    ''
  );

  const year = (car as any).year ?? (car as any).makingYear ?? '';

  const title = [model, year].filter(Boolean).join(' · ') || 'Vehicle';

  // agent (with fallback fix via agents.php, cached)
  const agentRaw =
    (car as any).agent_name ??
    (car as any).agentName ??
    (car as any).agent_full_name ??
    (car as any).agent ??
    (car as any).name ??
    (car as any).agent_username ??
    '';

  const agent = demojibake(agentRaw);
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
  const lot = (car as any).lot ? String((car as any).lot) : '';
  const color = (car as any).color ? String((car as any).color) : '';
  const auctionType = (car as any).auctionType ? String((car as any).auctionType) : '';

  async function copyVIN() {
    const text = ((car as any).vin ?? '').toString().trim();
    if (!text) return;
    try {
      await Clipboard.setStringAsync(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  // --- UI
  return (
    <View style={styles.card}>
      {/* HERO IMAGE */}
      <Pressable
        onPress={() => onGallery?.((car as any).id)}
        style={styles.hero}
        accessibilityRole="imagebutton"
        accessibilityLabel="Open gallery"
      >
        <Image
          source={(car as any).image ? { uri: (car as any).image } : undefined}
          style={styles.heroImage}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={200}
        />
        {/* status badge */}
        {(car as any).status ? (
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]} numberOfLines={1}>
              {String((car as any).status).replace(/_/g, ' ')}
            </Text>
          </View>
        ) : null}

        {/* VIN bar */}
        {(car as any).vin ? (
          <View style={styles.heroBar}>
            <Text style={styles.heroBarText} numberOfLines={1}>
              VIN: <Text onPress={copyVIN} style={styles.heroBarVin} numberOfLines={1}>{(car as any).vin}</Text>
            </Text>
            <Pressable onPress={copyVIN} hitSlop={12} style={styles.heroCopyBtn}>
              <Text style={styles.heroCopyBtnText}>{copied ? 'Copied' : 'Copy'}</Text>
            </Pressable>
          </View>
        ) : null}
      </Pressable>

      {/* BODY */}
      <View style={styles.body}>
        {/* BRAND */}
        {brand ? (
          <Text
            style={[
              styles.brand,
              isArabic(brand) && { textAlign: 'right', writingDirection: 'rtl' },
            ]}
            numberOfLines={1}
          >
            {brand}
          </Text>
        ) : null}

        {/* TITLE (model · year) */}
        <Text
          style={[
            styles.title,
            isArabic(title) && { textAlign: 'right', writingDirection: 'rtl' },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>

        {/* INFO PILLS */}
        <View style={styles.pillRow}>
          {(car as any).destination ? (
            <View style={styles.pill}>
              <Text
                style={[
                  styles.pillText,
                  isArabic(destination) && { writingDirection: 'rtl', textAlign: 'right' },
                ]}
                numberOfLines={1}
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
          {lot ? (
            <View style={styles.pill}><Text style={styles.pillText}>Lot {lot}</Text></View>
          ) : null}
          {color ? (
            <View style={styles.pill}><Text style={styles.pillText}>{color}</Text></View>
          ) : null}
          {auctionType ? (
            <View style={styles.pill}><Text style={styles.pillText}>{auctionType}</Text></View>
          ) : null}
        </View>

        {/* AGENT */}
        {(agentFixed || agent) ? (
          <Text
            style={[
              styles.agent,
              isArabic(agentFixed || agent) && { textAlign: 'right', writingDirection: 'rtl' },
            ]}
            numberOfLines={1}
          >
            <Text style={styles.agentLabel}></Text>{agentFixed || agent}
          </Text>
        ) : null}

        {/* ACTIONS */}
        <View style={styles.actions}>
          <Pressable onPress={() => onGallery?.((car as any).id)} style={[styles.cta, styles.ctaPrimary]}>
            <Text style={styles.ctaPrimaryText}>View gallery</Text>
          </Pressable>
          {onEdit ? (
            <Pressable onPress={() => onEdit(car)} style={[styles.cta, styles.ctaGhost]}>
              <Text style={styles.ctaGhostText}>Edit</Text>
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
    backgroundColor: THEME.cardBg,
    borderRadius: 14,
    overflow: 'hidden',
    marginVertical: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    // subtle shadow
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  // HERO
  hero: { width: '100%', height: 250, backgroundColor: THEME.grayBg, position: 'relative' },
  heroImage: { width: '100%', height: '100%', backgroundColor: THEME.grayBg },
  badge: { position: 'absolute', top: 10, left: 10, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  heroBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroBarText: { color: '#fff', fontSize: 12, flex: 1 },
  heroBarVin: { color: '#fff', fontWeight: '800' },
  heroCopyBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#ffffff', borderRadius: 999 },
  heroCopyBtnText: { color: THEME.color, fontWeight: '800', fontSize: 12 },

  // BODY
  body: { padding: 12 },

  brand: { fontSize: 13, fontWeight: '800', color: THEME.color, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

  title: { fontSize: 18, fontWeight: '800', color: THEME.text, marginBottom: 10 },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  pill: { backgroundColor: THEME.grayBg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { color: THEME.text, fontSize: 12, fontWeight: '600', writingDirection: 'auto' },

  agent: { color: THEME.text, writingDirection: 'auto' },
  agentLabel: { fontWeight: '700', color: THEME.subText },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },

  cta: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  ctaPrimary: { backgroundColor: THEME.color },
  ctaPrimaryText: { color: '#fff', fontWeight: '800' },
  ctaGhost: { backgroundColor: '#EEF2FF' },
  ctaGhostText: { color: THEME.accent, fontWeight: '800' },

  toast: { position: 'absolute', right: 12, top: 12, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  toastText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
