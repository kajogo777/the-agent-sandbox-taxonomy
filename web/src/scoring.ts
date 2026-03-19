import type { Product, ThreatResult, ThreatLevel, LayerKey } from "./types";
import { LAYERS } from "./types";

function getLayerS(product: Product, layer: string): number {
  const ld = product.layers[layer];
  if (!ld) return 0;
  return ld.s ?? 0;
}

function rate(conditions: boolean[]): ThreatLevel {
  if (conditions.every(Boolean)) return "full";
  if (conditions.some(Boolean)) return "partial";
  return "none";
}

const ORDER: Record<ThreatLevel, number> = { full: 2, partial: 1, none: 0 };
const REVERSE: Record<number, ThreatLevel> = {
  2: "full",
  1: "partial",
  0: "none",
};
const SYM: Record<ThreatLevel, string> = {
  full: "●",
  partial: "◐",
  none: "○",
};

export function computeThreats(product: Product): ThreatResult {
  const L1 = getLayerS(product, "L1");
  const L2 = getLayerS(product, "L2");
  const L3 = getLayerS(product, "L3");
  const L4 = getLayerS(product, "L4");
  const L5 = getLayerS(product, "L5");
  const L6 = getLayerS(product, "L6");
  const L7 = getLayerS(product, "L7");

  const T1 = rate([L3 >= 2, L4 >= 2, L5 >= 2]);
  const T2 = rate([L3 >= 2, L4 >= 2, L7 >= 2]);

  const t3_local = rate([L1 >= 2, L3 >= 2]);
  const t3_remote = rate([L4 >= 2, L6 >= 2]);
  const T3 = REVERSE[Math.min(ORDER[t3_local], ORDER[t3_remote])];
  const T3_detail = `L${SYM[t3_local]}/R${SYM[t3_remote]}`;

  const T4 = rate([L4 >= 2, L1 >= 2]);
  const T5 = rate([L1 >= 2, L3 >= 2, L6 >= 2]);

  let T6: ThreatLevel;
  if (L1 >= 3 && L2 >= 2) T6 = "full";
  else if (L1 >= 2 || L2 >= 2) T6 = "partial";
  else T6 = "none";

  const T7 = rate([L2 >= 2, L1 >= 2]);

  return {
    T1,
    T2,
    T3,
    T3_local: t3_local,
    T3_remote: t3_remote,
    T3_detail,
    T4,
    T5,
    T6,
    T7,
  };
}

export function getFingerprint(product: Product): string {
  return LAYERS.map((l) => {
    const s = product.layers[l]?.s;
    return s === null || s === undefined ? "—" : String(s);
  }).join("/");
}

export function composeProducts(a: Product, b: Product): Record<LayerKey, { s: number | null; g: number | null }> {
  const result: Record<string, { s: number | null; g: number | null }> = {};
  for (const l of LAYERS) {
    const aS = a.layers[l]?.s ?? null;
    const bS = b.layers[l]?.s ?? null;
    const aG = a.layers[l]?.g ?? null;
    const bG = b.layers[l]?.g ?? null;

    let s: number | null;
    if (aS === null && bS === null) s = null;
    else s = Math.max(aS ?? 0, bS ?? 0);

    let g: number | null;
    if (aG === null && bG === null) g = null;
    else g = Math.max(aG ?? 0, bG ?? 0);

    result[l] = { s, g };
  }
  return result as Record<LayerKey, { s: number | null; g: number | null }>;
}
