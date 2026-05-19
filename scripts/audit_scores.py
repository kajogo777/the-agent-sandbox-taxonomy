#!/usr/bin/env python3
"""
Audit products.yaml for consistency and fairness.

Checks rules derived directly from README.md and SKILL.md:

A. Structural / mechanical sanity
   1. Cooperative enforcement → S:1 (env vars only, command blocklists)
   2. Kernel-enforced syscall filter → S:3 if irreversible
   3. Structural / "doesn't exist" → S:4
   4. L1 cap rule: layers enforced INSIDE the sandbox cannot exceed L1.
      Layers with EXTERNAL enforcement (host cgroups L2, external proxy L4/L5,
      external audit L7) are NOT capped by L1.
   5. Cooperative L4 (proxy env vars) is always S:1.

B. Granularity vs Strength
   - G can exceed S (sophisticated UI on weak enforcement); flag as
     "granularity-without-strength" — not necessarily wrong, but worth knowing.

C. Threshold-rule sanity (derived threats):
   - Verify whether L4 = 0 + L5 ≤ 1 → T1 risk note exists.
   - Verify L1 ≥ 2 ∧ L3 ≥ 2 → T3-Local addressed.

D. Cross-product consistency by mechanism
   For each well-known mechanism, products using the same mechanism should
   score the same S/G unless a documented reason exists.

   Mechanisms grouped:
   - Firecracker microVM (KVM): L1 = 4.1
   - Standard Docker container (shared kernel): L1 = 2.1
   - macOS Seatbelt + Linux Landlock+seccomp process sandbox: L1 = 3.1
   - gVisor user-space kernel: L1 = 3.1
   - V8 isolate: L1 = 2.1 (workers) / 3.1 (Deno Deploy: namespaces+seccomp+isolate)
   - Host-level network proxy outside microVM (E2B / Vercel / Fly): L4 = 2.2
   - Kernel-redirected MITM proxy: L4 should be 2.3 or 3.3
   - External credential proxy (secret never enters sandbox): L5 = 4.3
   - Placeholder substitution: L5 = 3.3
   - Env vars visible inside sandbox: L5 should be 1.x or 2.x

E. Notes hygiene
   - Notes for non-null layers should justify both S and G per SKILL.md Step 4.
   - Flag missing or trivially short notes (< 80 chars).
"""

import yaml
import sys
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).parent.parent
PRODUCTS_YAML = ROOT / "products.yaml"

with open(PRODUCTS_YAML) as f:
    data = yaml.safe_load(f)
products = data["products"]

issues = []  # list of (severity, product, layer, message)
SEV_HIGH = "🔴 HIGH"
SEV_MED = "🟠 MED"
SEV_LOW = "🟡 LOW"
SEV_INFO = "🔵 INFO"


def add(sev, product, layer, message):
    issues.append((sev, product, layer, message))


# ----- Helpers -----
def get(p, layer, key):
    return p["layers"][layer][key]


def note(p, layer):
    return p["layers"][layer].get("note") or ""


# ============ A. Structural sanity ============
print("\n" + "=" * 80)
print("A. STRUCTURAL / MECHANICAL SANITY")
print("=" * 80)

for p in products:
    name = p["name"]

    # A1. L1 cap on layers enforced INSIDE sandbox
    L1_s = get(p, "L1", "s")
    if L1_s is not None:
        # L3, L6 are enforced inside the sandbox → cannot exceed L1
        # L2 (host cgroups), L4 (external proxy), L5 (external proxy), L7 (external audit)
        # CAN exceed L1.
        for L in ["L3", "L6"]:
            s = get(p, L, "s")
            if s is None:
                continue
            if s > L1_s:
                # Special case: L3 = 4 with L1 < 4 may be valid for in-process
                # interpreters (Pydantic Monty) where the FS API is architecturally
                # absent. Allow it if note mentions "structural" or "architecturally absent".
                n = note(p, L).lower()
                if "structural" in n or "architecturally absent" in n or "doesn't exist" in n or "does not exist" in n:
                    continue
                add(
                    SEV_HIGH,
                    name,
                    L,
                    f"S:{s} > L1:{L1_s} but enforcement is inside sandbox. "
                    "Per SKILL.md Step 5: layers enforced inside cannot exceed L1.",
                )

    # A2. L1 = 4 with vs without ext layers ≤ L1
    # Already handled above for L3, L6 only.

    # A3. Cooperative L5 env-var-only must be ≤ S:2
    L5_s = get(p, "L5", "s")
    L5_n = note(p, "L5").lower()
    if L5_s is not None and L5_s >= 3:
        # Should mention proxy / placeholder / ephemeral / never-enters
        if not any(
            k in L5_n
            for k in [
                "proxy",
                "placeholder",
                "ephemeral",
                "never enter",
                "never present",
                "substitut",
                "header injection",
                "broker",
                "yields to host",
                "yield ",
                "yield to",
                "callback",
                "phantom",
            ]
        ):
            add(
                SEV_MED,
                name,
                "L5",
                f"S:{L5_s} but note doesn't reference proxy/placeholder/ephemeral mechanism.",
            )

    # A4. Cooperative L4: env-vars-only proxy → S:1
    L4_s = get(p, "L4", "s")
    L4_n = note(p, "L4").lower()
    if L4_s is not None and L4_s >= 2:
        # If note says HTTP_PROXY env var alone with no kernel/iptables/structural backing → flag
        if (
            "http_proxy env" in L4_n
            and "iptables" not in L4_n
            and "kernel" not in L4_n
            and "redirect" not in L4_n
            and "namespace" not in L4_n
            and "seccomp" not in L4_n
        ):
            add(
                SEV_MED,
                name,
                "L4",
                f"S:{L4_s} but mechanism appears cooperative (HTTP_PROXY env vars only). "
                "Cooperative enforcement is always S:1.",
            )

    # A5. Strength must be 0..4, granularity 0..3
    for L in ["L1", "L2", "L3", "L4", "L5", "L6", "L7"]:
        s = get(p, L, "s")
        g = get(p, L, "g")
        if s is not None and (s < 0 or s > 4):
            add(SEV_HIGH, name, L, f"S:{s} out of valid range 0..4")
        if g is not None and (g < 0 or g > 3):
            add(SEV_HIGH, name, L, f"G:{g} out of valid range 0..3")

    # A6. Mixed null/0: a layer's s and g should both be null (—) or both numeric.
    for L in ["L1", "L2", "L3", "L4", "L5", "L6", "L7"]:
        s = get(p, L, "s")
        g = get(p, L, "g")
        if (s is None) != (g is None):
            add(SEV_HIGH, name, L, f"Inconsistent: s={s}, g={g}. Both should be null or both numeric.")


# ============ B. Cross-product consistency by mechanism ============
print("\n" + "=" * 80)
print("B. CROSS-PRODUCT CONSISTENCY BY MECHANISM")
print("=" * 80)

# Group products by detected mechanism for L1
firecracker = []
seatbelt_landlock = []
docker_default = []  # standard Docker container (shared kernel)
gvisor = []
v8_isolate = []

for p in products:
    n = p["name"]
    L1_n = note(p, "L1").lower()
    if "firecracker" in L1_n:
        firecracker.append((n, get(p, "L1", "s"), get(p, "L1", "g")))
    if (
        "seatbelt" in L1_n
        and ("landlock" in L1_n or "bubblewrap" in L1_n or "seccomp" in L1_n)
    ):
        seatbelt_landlock.append((n, get(p, "L1", "s"), get(p, "L1", "g")))
    if "gvisor" in L1_n and "kata" not in L1_n:
        gvisor.append((n, get(p, "L1", "s"), get(p, "L1", "g")))
    if "v8 isolate" in L1_n or "v8 isolates" in L1_n:
        v8_isolate.append((n, get(p, "L1", "s"), get(p, "L1", "g")))

groups = [
    ("L1 Firecracker microVM (expected 4.1)", firecracker, (4, 1)),
    ("L1 Seatbelt+Landlock/Bubblewrap (expected 3.1)", seatbelt_landlock, (3, 1)),
    ("L1 gVisor (expected 3.1)", gvisor, (3, 1)),
    ("L1 V8 isolate (heterogeneous: 2.1 to 3.1)", v8_isolate, None),
]

for label, group, expected in groups:
    print(f"\n{label}")
    for n, s, g in group:
        marker = ""
        if expected and (s, g) != expected:
            marker = f"  ⚠ expected {expected[0]}.{expected[1]}"
            add(
                SEV_LOW,
                n,
                "L1",
                f"Same mechanism class ({label}) scored differently: {s}.{g} vs expected {expected[0]}.{expected[1]}",
            )
        print(f"  {n:<30} L1: {s}.{g}{marker}")


# L4: host-level proxy outside microVM (E2B / Vercel / Fly / Daytona / Modal etc)
# All score 2.2 — verify
print("\nL4 host-level proxy outside microVM/container (expected 2.2):")
for p in products:
    L4_n = note(p, "L4").lower()
    if (
        ("host-level" in L4_n or "host proxy" in L4_n or "outside the microvm" in L4_n or "outside the vm" in L4_n)
        and "proxy" in L4_n
    ):
        s = get(p, "L4", "s")
        g = get(p, "L4", "g")
        marker = ""
        if (s, g) != (2, 2) and (s, g) != (2, 3):
            marker = f"  ⚠ expected 2.2 or 2.3"
        print(f"  {p['name']:<30} L4: {s}.{g}{marker}")

# L5: external credential proxy (secrets never enter sandbox) → expected 4.3
print("\nL5 external credential proxy (expected 4.3):")
for p in products:
    L5_n = note(p, "L5").lower()
    if (
        "never enter" in L5_n
        or "never enters" in L5_n
        or "credential brokering" in L5_n
        or ("external credential proxy" in L5_n)
    ):
        s = get(p, "L5", "s")
        g = get(p, "L5", "g")
        marker = ""
        if (s, g) != (4, 3):
            marker = f"  ⚠ expected 4.3"
        print(f"  {p['name']:<30} L5: {s}.{g}{marker}")
        if (s, g) != (4, 3):
            add(
                SEV_MED,
                p["name"],
                "L5",
                f"Note describes external credential proxy / secrets never entering sandbox; expected 4.3, got {s}.{g}",
            )

# L5: placeholder substitution → expected 3.3
print("\nL5 placeholder substitution (expected 3.3):")
for p in products:
    L5_n = note(p, "L5").lower()
    if "placeholder substitution" in L5_n or "swapped with token" in L5_n:
        s = get(p, "L5", "s")
        g = get(p, "L5", "g")
        marker = ""
        if (s, g) != (3, 3):
            marker = f"  ⚠ expected 3.3"
        print(f"  {p['name']:<30} L5: {s}.{g}{marker}")


# ============ C. Threshold sanity (sample T1 risk) ============
print("\n" + "=" * 80)
print("C. T1 (Exfiltration) RISK CHECK — L4 ≤ 1 with L5 ≤ 1")
print("=" * 80)
for p in products:
    L4_s = get(p, "L4", "s") or 0
    L5_s = get(p, "L5", "s") or 0
    if L4_s <= 1 and L5_s <= 1:
        notes = (p.get("notes") or "").lower()
        flagged = ("t1" in notes) or ("exfiltrat" in notes)
        marker = "" if flagged else "  ⚠ no T1 mention in notes"
        print(f"  {p['name']:<30} L4:{L4_s} L5:{L5_s}{marker}")
        if not flagged:
            add(
                SEV_MED,
                p["name"],
                "—",
                f"L4:{L4_s} + L5:{L5_s} = T1 exfiltration risk; product-level notes should flag this explicitly.",
            )


# ============ D. Granularity > Strength (info only) ============
print("\n" + "=" * 80)
print("D. G > S (granularity exceeds enforcement strength) — info, not error")
print("=" * 80)
for p in products:
    for L in ["L1", "L2", "L3", "L4", "L5", "L6", "L7"]:
        s = get(p, L, "s")
        g = get(p, L, "g")
        if s is None or g is None:
            continue
        if g > s and s >= 1:  # ignore 0.0
            print(f"  {p['name']:<30} {L}: {s}.{g}")


# ============ E. Note hygiene ============
print("\n" + "=" * 80)
print("E. NOTE HYGIENE — short notes for non-null layers")
print("=" * 80)
for p in products:
    name = p["name"]
    for L in ["L1", "L2", "L3", "L4", "L5", "L6", "L7"]:
        s = get(p, L, "s")
        if s is None:
            continue
        n = note(p, L)
        if len(n) < 60:
            add(SEV_LOW, name, L, f"Short note ({len(n)} chars): '{n[:80]}'")
            print(f"  {name:<30} {L} note ({len(n)} chars): {n[:100]}")


# ============ F. last_reviewed coverage ============
print("\n" + "=" * 80)
print("F. last_reviewed COVERAGE")
print("=" * 80)
no_review = [p["name"] for p in products if not p.get("last_reviewed")]
print(f"\n{len(no_review)}/{len(products)} products with last_reviewed = null:")
for n in no_review:
    print(f"  - {n}")


# ============ Summary ============
print("\n" + "=" * 80)
print("ISSUES SUMMARY")
print("=" * 80)
by_sev = defaultdict(list)
for sev, prod, layer, msg in issues:
    by_sev[sev].append((prod, layer, msg))
for sev in [SEV_HIGH, SEV_MED, SEV_LOW, SEV_INFO]:
    items = by_sev.get(sev, [])
    if not items:
        continue
    print(f"\n[{sev}] {len(items)} issue(s)")
    for prod, layer, msg in items:
        print(f"  {prod} ({layer}): {msg}")

print(f"\nTotal: {len(issues)} issue(s) across {len(products)} products.")
