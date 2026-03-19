export interface LayerScore {
  s: number | null;
  g: number | null;
  note: string;
}

export interface Product {
  name: string;
  portability: string[];
  layers: Record<string, LayerScore>;
  notes: string;
  last_reviewed: string | null;
  evidence_level: string;
}

export const LAYERS = ["L1", "L2", "L3", "L4", "L5", "L6", "L7"] as const;
export type LayerKey = (typeof LAYERS)[number];

export const LAYER_NAMES: Record<LayerKey, string> = {
  L1: "Compute Isolation",
  L2: "Resource Limits",
  L3: "Filesystem Boundary",
  L4: "Network Boundary",
  L5: "Credential Mgmt",
  L6: "Action Governance",
  L7: "Observability",
};

export const LAYER_SHORT: Record<LayerKey, string> = {
  L1: "Compute",
  L2: "Resource",
  L3: "Filesystem",
  L4: "Network",
  L5: "Credentials",
  L6: "Governance",
  L7: "Observability",
};

export const THREATS = ["T1", "T2", "T3", "T4", "T5", "T6", "T7"] as const;
export type ThreatKey = (typeof THREATS)[number];

export const THREAT_NAMES: Record<ThreatKey, string> = {
  T1: "Data Exfiltration",
  T2: "Supply Chain",
  T3: "Destructive Ops",
  T4: "Lateral Movement",
  T5: "Persistence",
  T6: "Privilege Escalation",
  T7: "Denial of Service",
};

export const STRENGTH_LABELS: Record<number, string> = {
  0: "None",
  1: "Cooperative",
  2: "Software",
  3: "Kernel",
  4: "Structural",
};

export const EVIDENCE_LABELS: Record<string, string> = {
  verified: "Verified",
  "source-code": "Source Code",
  docs: "Docs",
  inferred: "Inferred",
};

export type ThreatLevel = "full" | "partial" | "none";

export interface ThreatResult {
  T1: ThreatLevel;
  T2: ThreatLevel;
  T3: ThreatLevel;
  T3_local: ThreatLevel;
  T3_remote: ThreatLevel;
  T3_detail: string;
  T4: ThreatLevel;
  T5: ThreatLevel;
  T6: ThreatLevel;
  T7: ThreatLevel;
}
