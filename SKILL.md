# Agent Sandbox Taxonomy (AST) — Evaluation & Composition Skill

You are an expert in the Agent Sandbox Taxonomy (AST), a framework for evaluating and comparing AI agent sandbox security. This skill enables two capabilities:

1. **Score any sandbox product** — Evaluate a new or existing sandbox against the AST's 7 defense layers, 7 threat categories, and 3 evaluation dimensions to produce a score card and fingerprint.
2. **Help users choose and compose sandboxes** — Use the decision checklist, composition patterns, and stacking rules to recommend the right sandbox stack for a given use case.

Remember **7-7-3**: **7** defense layers, **7** threat categories, **3** evaluation dimensions (strength, granularity, portability).

---

## Part 1: The Seven Defense Layers

Every sandbox enforces some combination of seven layers. No sandbox covers all seven equally. Most cover two or three well and ignore the rest.

Layers are numbered **bottom-up** because lower layers are foundational.

| Layer | Name | Key Question |
|---|---|---|
| **L1** | Compute Isolation | What separates the agent from the host? |
| **L2** | Resource Limits | Is it constrained in CPU, memory, disk, time? |
| **L3** | Filesystem Boundary | What can it read, write, and delete? |
| **L4** | Network Boundary | What can it communicate with? |
| **L5** | Credential & Secret Management | How are secrets handled around the agent? |
| **L6** | Action Governance | Can you control what operations it performs? |
| **L7** | Observability & Audit | Can you see what the agent did? |

### Critical Relationships Between Layers

- **Lower layers are foundational.** Strong L1 makes L3 easier (a microVM gets a fresh filesystem by default).
- **Upper layers CANNOT be derived from lower ones.** A microVM with perfect L1 but no L4 still lets the agent exfiltrate secrets via a single outbound request. A system with impeccable L1–L5 but no L7 gives you no way to detect misuse.
- **No upper layer can be stronger than L1**, because a process that escapes L1 bypasses everything above it.

### Layer Definitions

**L1 — Compute Isolation**: The foundation. What matters is the **size of the shared attack surface** between workload and host — ranging from full host kernel (containers), through reduced syscall surface (user-space kernels), to minimal VMM (microVMs), to single-purpose kernels (unikernels), to hardware-encrypted memory (confidential computing).

**L2 — Resource Limits**: A fork bomb or memory leak can DoS the host even inside a perfect L1 boundary. Enforcement must happen **outside the sandbox** (cgroups on host, or hypervisor allocation). In-sandbox resource controls can be bypassed by an agent with root inside its sandbox.

**L3 — Filesystem Boundary**: Must be **selective**, not total. Agents legitimately need to read/write project files. The real question is whether sensitive paths (`~/.ssh`, `~/.aws`, `.env`) are accessible.

**L4 — Network Boundary**: The most underappreciated layer. An agent inside a perfect compute sandbox with unrestricted network access can still exfiltrate every secret via a single outbound request. **How traffic is intercepted matters as much as whether it's intercepted.** A boundary relying on `HTTP_PROXY` env vars is fundamentally different from kernel-level interception — the process can trivially bypass proxy env vars via raw sockets. Cooperative enforcement = always S:1, regardless of proxy sophistication.

**L5 — Credential & Secret Management**: Even with strong L1–L4, an agent with API keys can embed them in generated code or commit them to a repo. Ideally, credentials are **never present** in the agent's environment.

**L6 — Action Governance**: Different from L1–L5. Those layers restrict **access to resources**. L6 restricts **what the agent does with the access it has**. Operates at a **semantic level** — "you cannot delete production resources" — governing intent regardless of which layer the action flows through. The tradeoff: L6 is generally software-enforced and bypassable. It is defense-in-depth, most valuable on top of strong L1–L4.

**L7 — Observability & Audit**: Without it, you cannot detect misuse, investigate incidents, improve policies, or demonstrate compliance. Turns a sandbox from a static boundary into an **adaptive security system**.

---

## Part 2: The Seven Threats

Agents can cause seven categories of harm. Sandboxes exist to contain them.

| ID | Threat | What Goes Wrong | Example |
|---|---|---|---|
| **T1** | Data Exfiltration | Reads sensitive data and transmits it externally | Reads SSH keys, sends via outbound request |
| **T2** | Supply Chain Compromise | Introduces malicious code: compromised deps, binary replacement, build artifact poisoning | Malicious install script exfiltrates env vars |
| **T3** | Destructive Operations | Destroys or misconfigures resources, **both local and remote** | `rm -rf /`, cloud resource deletion via API, `kubectl delete namespace` |
| **T4** | Lateral Movement | Reaches systems beyond its intended scope | Scans local network, hits cloud metadata endpoint |
| **T5** | Persistence | Survives sandbox destruction | Writes cron job, modifies shell init files, installs git hooks |
| **T6** | Privilege Escalation | Escapes the sandbox entirely | Exploits kernel CVE, container escape |
| **T7** | Denial of Service | Consumes excessive resources, degrading host or other tenants | Fork bomb, memory bomb, disk filling |

### Sandboxes Are Orthogonal to Agent Alignment

Prompt injection, hallucination, misalignment, bad context, compromised dependencies — these are all reasons an agent might **decide** to do something harmful. They are **vectors**, not threats. The taxonomy deliberately excludes them because sandboxes operate at a different level: they control what an agent **can** do, not what it **chooses** to do.

Getting an agent to make good decisions is an **agent alignment** problem (guardrails, RLHF, system prompts, context filtering). Preventing damage when it makes a bad decision is a **sandboxing** problem. The two are complementary but independent. A perfectly aligned agent still benefits from sandboxing (defense-in-depth). A perfectly sandboxed agent with bad alignment is still contained.

```
                              ┌─────────────────────┐
  Prompt Injection ──┐        │                     │
  Hallucination ─────┤        │  Agent Alignment    │  ← why the agent decided
  Misalignment ──────┼──▶     │  (out of scope)     │
  Bad context ───────┤        │                     │
  Malicious code ────┘        └────────┬────────────┘
                                       │
                                       ▼
                              Agent attempts harmful action
                                       │
                                       ▼
                              ┌─────────────────────┐
                              │                     │
                              │  Sandbox boundary   │  ← what the agent can do
                              │  (this taxonomy)    │
                              │                     │
                              └─────────────────────┘
```

### Threat-to-Layer Defense Map

Use this when scoring. For each threat, identify which layers provide defense and assess whether the product covers them.

| Threat | Primary Defenses | Why Multiple Layers Are Needed |
|---|---|---|
| **T1 Exfiltration** | L3 + L4 + L5 | L3 blocks reading secrets, L4 blocks sending them out, L5 ensures they're not present. Any single layer alone leaks. |
| **T2 Supply Chain** | L3 + L4 + L7 | L4 controls download sources, L3 protects filesystem integrity, L7 detects compromises after the fact. |
| **T3 Destructive Ops** | L3 + **L4** + L6 | L3 covers local destruction. **Remote destruction is a network operation**: needs L4 to block access or L6 to block the action semantically. L1 alone does NOT protect remote resources. |
| **T4 Lateral Movement** | L4 + L1 | L4 blocks outbound access. L1 provides network namespace isolation as secondary. |
| **T5 Persistence** | L3 + L1 + L6 | Ephemeral sandboxes (L1 destroyed) inherently prevent persistence. Persistent sandboxes need L3 to block init file writes and L6 to block scheduled task creation. |
| **T6 Privilege Escalation** | L1 + L2 | L1 strength directly determines escape resistance. Hardware boundaries are fundamentally harder to escape than software. |
| **T7 Denial of Service** | L2 + L1 | L2 caps resources. Enforcement must be outside the sandbox. |

**Threats are not independent.** T2 is often a vector to T1/T3/T4. T5 extends the window for any other threat. T6 nullifies all other layers. T7 can be a direct goal or a side effect.

---

## Part 3: Scoring System

Each layer is rated on **three evaluation dimensions**: Strength, Granularity, and Portability.

### Strength (S: 0–4)

Combines robustness of enforcement, reversibility, and enforcement transparency into a single score.

| Score | Level | What It Means |
|---|---|---|
| **0** | None | No enforcement at this layer |
| **1** | Cooperative | Enforcement the sandboxed process can circumvent, opt out of, or reverse via escape hatch. Includes: proxy env vars the process can ignore, advisory restrictions, configurations with known bypass. **If the process can open a raw socket and skip your filter, it's S:1.** |
| **2** | Software-enforced | Enforced by a separate process/proxy the sandboxed process cannot circumvent from inside, but reconfigurable from outside by the operator. Includes: container-level isolation, hot-reloadable policy engines, MITM proxies with iptables redirect. |
| **3** | Kernel-enforced | Enforced by the OS kernel through mechanisms that cannot be weakened once applied, even by the operator during the session. Includes: Landlock, Seatbelt, seccomp-BPF, kernel-level network filtering. **Irreversible.** |
| **4** | Structural | Enforced by CPU virtualization, hardware encryption, or architectural absence. The protected resource or attack surface **doesn't exist** inside the sandbox. Includes: KVM-isolated microVMs, unikernels, network-disabled sandboxes (no network device), credential proxies (secrets never enter sandbox), confidential VMs (SEV-SNP/TDX). |

**Key scoring rules:**
- Cooperative enforcement is **always S:1**, regardless of how sophisticated the proxy is.
- If the kernel denies the syscall → S:3.
- If there's no network device to use → S:4.
- If there's an escape hatch → caps strength at S:1.

### Granularity (G: 0–3)

How fine-grained is the control at this layer?

| Score | Level | What It Means |
|---|---|---|
| **0** | None | No control |
| **1** | Binary | On/off (e.g., "network: enabled/disabled") |
| **2** | Allowlist/Blocklist | Lists of permitted or denied resources (e.g., "allow these domains", "block these paths") |
| **3** | Per-resource policy | Fine-grained rules per resource, action, and context (e.g., "allow GET but deny DELETE", Cedar/OPA policies) |

### Portability Tags

A flat tag answering: **what must already be in place to use this tool?**

| Tag | Meaning |
|---|---|
| **any-os** | Works on Linux, macOS, and Windows |
| **linux+mac** | Works on Linux and macOS (may use different mechanisms per OS) |
| **linux-only** | Requires Linux (often kernel ≥5.13 for Landlock) |
| **windows** | Supports Windows (may be in addition to other OSes) |
| **cloud-managed** | Runs in vendor's cloud; OS abstracted away |
| **needs-docker** | Requires Docker or compatible container runtime |
| **needs-kvm** | Requires `/dev/kvm` (bare metal or nested virtualization) |
| **needs-k8s** | Requires a Kubernetes cluster |
| **no-infra** | Runs directly on the OS; no Docker, no cloud, no cluster |

Products may have multiple tags (e.g., `linux+mac, no-infra`).

---

## Part 4: The Fingerprint

Every product gets a **fingerprint** — a CVSS-inspired vector string showing its strength score at each layer.

### `0` vs `—` (dash)

Both mean "no coverage," but for different reasons:
- **`0`** = the product *operates* at this layer but provides no enforcement (capability exists, wide open).
- **`—`** = the product *does not address* this layer at all (outside scope).
- For composition, both are treated as "no coverage" — any non-zero score from another product fills the gap.

### Formats

**Full form** (self-describing):
```
L1:4/L2:4/L3:4/L4:0/L5:2/L6:-/L7:2
```

**Compact form** (positional, L1→L7 order):
```
4/4/4/0/2/-/2
```

**Score card notation** uses `S.G` per layer (e.g., `4.1` = structural strength, binary granularity).

**Separator convention:** `:` binds layer to value (full form), `.` separates strength from granularity, `/` separates layers.

---

## Part 5: Layer Mechanism Reference

Use these tables to determine the correct S and G scores for each mechanism you encounter. When evaluating a product, identify which mechanism it uses at each layer, then look up or interpolate the score.

### L1 — Compute Isolation Mechanisms

| Mechanism | S | G | How It Works |
|---|---|---|---|
| Bare process | 0 | 0 | No isolation; full user privileges |
| Linux namespaces + cgroups | 2 | 1 | PID/mount/net/user namespace separation; shared host kernel |
| Namespaces + seccomp/Landlock/Seatbelt | 3 | 1–2 | Kernel-enforced syscall filtering or LSM; irreversible |
| User-space kernel (e.g., gVisor) | 3 | 1 | Intercepts syscalls in userspace; reduced host syscall surface |
| MicroVM — minimal VMM (e.g., Firecracker) | 4 | 1 | Dedicated kernel per workload via KVM |
| MicroVM — container-shaped (e.g., Kata) | 4 | 1 | Container-shaped VM; CRI compatible; needs KVM |
| Unikernel | 4 | 1 | Single-app custom kernel; needs KVM |
| Library OS | 3–4 | 1 | Embedded minimal OS library; experimental |
| Confidential VM (SEV-SNP/TDX) | 4 | 1 | Hardware-encrypted memory; even hypervisor cannot read |

### L2 — Resource Limits Mechanisms

| Mechanism | S | G | How It Works |
|---|---|---|---|
| None | 0 | 0 | No limits |
| cgroups v2 | 3 | 2 | Kernel-enforced CPU/memory/I/O caps |
| VM resource allocation | 4 | 2 | Fixed vCPU/RAM/disk at VM creation |
| Platform quotas | 2 | 2 | Per-session or per-account limits |
| Time-bounded sessions | 2 | 1 | Auto-termination after time limit |

### L3 — Filesystem Boundary Mechanisms

| Mechanism | S | G | How It Works |
|---|---|---|---|
| No restriction | 0 | 0 | Full user filesystem |
| Working-dir-only mount | 3 | 2 | Only project dir visible; all else invisible |
| Sensitive-path blocklist | 3 | 2 | Most paths accessible; ~/.ssh, ~/.aws etc. blocked |
| Ephemeral root | 4 | 1 | Fresh OS per session; project mounted in |
| Immutable root + writable overlay | 4 | 2 | Read-only base; copy-on-write; rollback capable |
| Full independent filesystem | 4 | 1 | Separate disk; no host paths visible |

### L4 — Network Boundary Mechanisms

| Mechanism | S | G | How It Works |
|---|---|---|---|
| No restriction | 0 | 0 | Full network access |
| Proxy env vars | 1 | 2 | **Cooperative**: trivially bypassed via raw sockets |
| Transparent proxy (iptables redirect) | 2 | 3 | **Opaque**: all traffic redirected regardless of process |
| Kernel/hypervisor network filter | 3 | 2 | **Opaque**: iptables, eBPF, or Network Extension |
| MITM proxy (kernel-redirected) | 2–3 | 3 | **Opaque**: TLS-terminating; per-URL/method policies |
| Default-deny + exceptions | 3–4 | 2–3 | **Opaque/Structural**: all egress blocked; allowlist only |
| Network disabled | 4 | 1 | **Structural**: no network interface exists |

### L5 — Credential & Secret Management Mechanisms

| Mechanism | S | G | How It Works |
|---|---|---|---|
| No restriction | 0 | 0 | Full credential set visible |
| Sensitive file blocking | 3 | 2 | Credential files blocked via L3; env vars still visible |
| Env-var filtering | 2 | 2 | Only approved variables forwarded |
| Placeholder substitution | 3 | 3 | Secrets swapped with tokens; restored at execution only |
| External credential proxy | 4 | 3 | Credentials never enter sandbox |
| Ephemeral per-session tokens | 4 | 3 | Time-bound, scoped credentials; auto-expire |

### L6 — Action Governance Mechanisms

| Mechanism | S | G | How It Works |
|---|---|---|---|
| No governance | 0 | 0 | Agent can do anything it has access to |
| Human-in-the-loop | 1 | 1 | Agent proposes; human approves |
| Command blocklist | 2 | 2 | Known-dangerous commands blocked |
| Policy engine (Cedar/OPA) | 2 | 3 | Fine-grained rules per action/resource/context |
| Declarative-only mode | 3 | 3 | Agent produces declarations only; cannot execute directly |

### L7 — Observability & Audit Mechanisms

| Mechanism | S | G | How It Works |
|---|---|---|---|
| No logging | 0 | 0 | No record of agent actions |
| Session-level logs | 1 | 1 | Start/stop, exit codes |
| Command-level audit | 2 | 2 | Every command, file op, tool call logged |
| Full telemetry | 3 | 3 | Network, syscalls, MCP calls, real-time UI |
| Cryptographic audit chain | 3 | 3 | Tamper-evident log with cryptographic commitments |

---

## Part 6: Glossary

| Term | Definition |
|---|---|
| **Blast radius** | Maximum damage when an agent is compromised or misbehaves |
| **Cooperative enforcement** | Enforcement relying on the sandboxed process respecting a convention (e.g., proxy env vars). Bypassable; always S:1 |
| **Defense-in-depth** | Layering multiple independent boundaries so failure of one doesn't compromise the system |
| **Escape hatch** | A mechanism allowing bypass of sandbox restrictions; its existence caps strength at S:1 |
| **Opaque enforcement** | Enforcement that works regardless of the sandboxed process's behavior. Cannot be circumvented; S:2–3 |
| **Structural enforcement** | Enforcement where the protected resource doesn't exist inside the sandbox. Nothing to bypass; S:4 |
| **Agent alignment** | The problem of getting an agent to make good decisions (guardrails, RLHF, context filtering). Complementary to but independent of sandboxing |
| **Vector** | An attack path through which a threat is triggered (prompt injection, hallucination, misalignment, compromised dependency). Distinct from the threat (T1–T7) it activates. Sandboxes are vector-agnostic |

---

## Part 7: How to Score a Sandbox Product

Follow this procedure to evaluate any sandbox product and produce a score card and fingerprint.

### Step 1: Gather Evidence

For each of the 7 layers, determine what the product does. Research its documentation, architecture, and security model. Ask these questions:

| Layer | Investigation Questions |
|---|---|
| **L1** | What isolation technology? Container, microVM, unikernel, process sandbox, confidential VM? What's the shared attack surface with the host? |
| **L2** | Are CPU/memory/disk/time limits enforced? Where — inside the sandbox or outside (host cgroups, hypervisor)? Can the agent bypass them with root? |
| **L3** | What filesystem does the agent see? Host filesystem, project-only mount, ephemeral root? Are sensitive paths (`~/.ssh`, `~/.aws`, `.env`) accessible? |
| **L4** | Is network access restricted? How is it intercepted — env vars (cooperative), iptables/eBPF (opaque), or no network device (structural)? Can the process bypass it with raw sockets? |
| **L5** | How are credentials delivered? Env vars, mounted files, proxy, ephemeral tokens? Are secrets visible inside the sandbox at all? |
| **L6** | Are operations governed? Human-in-the-loop, command blocklists, policy engine, declarative-only? Can the agent perform destructive actions with the access it has? |
| **L7** | What's logged? Nothing, session-level, command-level, full telemetry? Tamper-evident? Real-time visibility? |

### Step 2: Score Each Layer

For each layer:
1. Identify the mechanism used (or "none").
2. Look up the mechanism in the reference tables (Part 5) to get base S and G scores.
3. Apply scoring rules:
   - If the process can circumvent the enforcement → cap at S:1 (cooperative).
   - If there's an escape hatch or override → cap at S:1.
   - If enforcement is by a separate process but reconfigurable → S:2.
   - If enforcement is kernel-level and irreversible → S:3.
   - If the attack surface doesn't exist inside the sandbox → S:4.
4. If a layer is not addressed at all by the product → mark as `—`.
5. If the product operates at the layer but provides no enforcement → mark as `0`.

### Step 3: Assess Threat Coverage

For each of the 7 threats, use the threat-to-layer defense map (Part 2) and the product's layer scores to determine coverage:

| Rating | Symbol | Meaning |
|---|---|---|
| Addressed | **●** | The product actively defends against or structurally eliminates this threat (e.g., ephemeral sandbox = T5● because persistence is architecturally impossible) |
| Partial | **◐** | Some layers contribute but gaps remain (e.g., local destruction mitigated but remote not) |
| Not addressed | **○** | The threat is real but this product provides no defense against it (a gap to fill via composition) |

For T3 (Destructive Operations), always distinguish **local vs remote**:
- Local destruction → primarily L3 + L1
- Remote destruction → primarily L4 + L6 (network operation)
- Use notation: `L●/R○` (local mitigated / remote not), `L+R` (both mitigated)

### Step 4: Produce the Score Card

Output the score card in this format:

```
### [Product Name]
**Fingerprint: `L1:S/L2:S/L3:S/L4:S/L5:S/L6:S/L7:S`** · Portability: `[tags]`

| Layer | S.G | Notes |
|---|---|---|
| L1 Compute | S.G | [mechanism and key details] |
| L2 Resource | S.G | [mechanism and key details] |
| L3 Filesystem | S.G | [mechanism and key details] |
| L4 Network | S.G | [mechanism and key details] |
| L5 Credentials | S.G | [mechanism and key details] |
| L6 Action | S.G | [mechanism and key details] |
| L7 Observability | S.G | [mechanism and key details] |

Threats: T1[●◐○] T2[●◐○] T3[●◐○](L[●◐○]/R[●◐○]) T4[●◐○] T5[●◐○] T6[●◐○] T7[●◐○]
Gaps: [identify layers with 0 or — that matter]
Complements: [what kind of tool would fill the gaps]
```

### Step 5: Validate

Run these sanity checks on your score card:
- **No upper layer is stronger than L1** in strength. If L1 is S:2, no other layer can realistically be S:4 (the isolation foundation is weaker than the claim).
- **Cooperative mechanisms are always S:1.** If you scored something S:2+ but the process can bypass it, downgrade.
- **L4:0 with credentials present = T1 risk.** Flag this explicitly.
- **Remote destruction (T3/R) requires L4 or L6.** L1 alone does not protect remote resources. If L4 is 0 and L6 is 0 or —, T3 remote is ○.
- **Ephemeral sandbox + L1 destroyed = T5 ●.** Persistent sandboxes without L3/L6 coverage leave T5 open.
- **T2 is universally hard.** Most products score ◐ or ○. Don't over-credit.

---

## Part 8: How to Help a User Choose and Compose Sandboxes

### The Decision Checklist

Walk the user through these 8 questions in order. Each answer maps to layer requirements.

**1. What is your trust level in the code?**
- Untrusted (third-party, generated, public repos) → requires **L1 S:4** (microVM/unikernel)
- Own reviewed code → **L1 S:2–3** acceptable

**2. Does the agent interact with remote resources (cloud, databases, APIs)?**
- Yes with read-write access → L1 does NOT protect remote resources. Need **L4** (block destructive endpoints), **L6** (block destructive actions semantically), or **L5** (scoped read-only credentials)
- No → less critical, but still consider L4 for exfiltration prevention

**3. Does the agent need network access?**
- No → disable it (**L4 S:4**). Eliminates T1 and T4 in one step
- Yes → use allowlists (S:2–3) and invest in L5 and L7

**4. Does the agent handle credentials?**
- Ideally: never present (**L5 S:4** via proxy or ephemeral tokens)
- Rule: never pass raw credentials if avoidable

**5. Can you tolerate human-in-the-loop?**
- No (autonomous agents) → need **L6 S:2+** (policy engine)
- Yes → L6 S:1 (human approval) is acceptable

**6. Do you need audit trails?**
- Compliance or team use → **L7 S:2+** with structured logs
- Regulatory → consider cryptographic audit chains

**7. Ephemeral or persistent sandbox?**
- Ephemeral → inherently addresses T5
- Persistent → must explicitly address T5 via immutable filesystem or monitored mutation

**8. What are your portability constraints?**
- No infrastructure → `no-infra` process wrappers
- Docker available → container wrappers, sidecars
- Cloud/K8s → full platform range

### Composition Rules

**The stacking rule: take the maximum strength at each layer.**

```
Product A     4/4/4/0/2/-/2
Product B     -/-/1/2/3/2/3
──────────────────────────────
Composed      4/4/4/2/3/2/3   ← max at each position
```

- `0` and `—` are both treated as "no coverage" for composition
- Any non-zero score from another product fills the gap
- The composed stack is only as weak as its weakest **uncovered** layer

### Composition Patterns

Use these archetypes to guide recommendations:

**Pattern 1: Platform + Policy Layer** — *"Strong box, smart guardrails"*
- Cloud sandbox platform provides L1–L3 (hardware-isolated compute, resource limits, ephemeral filesystem)
- Policy tool layers L4–L7 (network policies, credential management, action governance, observability)
- Result: full-stack coverage

**Pattern 2: OS-Level Wrapper + Policy Sidecar** — *"Lightweight local protection"*
- Kernel-level process wrapper provides L1/L3/L5 with irreversible enforcement
- Policy sidecar adds L4/L6/L7
- Result: full stack minus L2. Zero cost, no cloud dependency

**Pattern 3: Built-in Sandbox + Cloud Fallback** — *"Local for speed, cloud for untrusted"*
- Agent's built-in sandbox handles trusted interactive work (L1/L3/L4)
- Untrusted operations offload to a cloud platform with full L1–L3

**Pattern 4: K8s-Native Stack** — *"Enterprise, self-hosted, policy-driven"*
- Kubernetes sandbox CRD (L1/L2/L3) + NetworkPolicy (L4) + policy engine (L6) + secrets manager (L5) + monitoring stack (L7)
- Result: full stack, self-hosted

### Anti-Patterns to Flag

**Anti-Pattern: Platform Without Network Controls**
A cloud platform provides excellent L1/L2/L3 but deploys with default (unrestricted) network access and passes cloud credentials as env vars. The agent runs in a perfect microVM but can still exfiltrate credentials, delete cloud resources, and reach internal services. **This is the most common configuration in practice and a false sense of security.** If L4 is `0`, flag it.

**Anti-Pattern: Strong Isolation, No Observability**
Perfect L1–L5 but no L7. You cannot detect misuse, investigate incidents, or improve policies. The sandbox is a black box.

**Anti-Pattern: Cooperative Network "Enforcement"**
A sophisticated HTTP proxy that relies on the process honoring `HTTP_PROXY` env vars. Looks impressive in a demo but the process can bypass it trivially. Always S:1.

### Recommendation Procedure

1. Walk through the 8-question checklist with the user
2. Map answers to minimum layer requirements (which layers need what minimum S score)
3. Identify candidate products that cover the required layers at the required strength
4. If no single product covers all requirements → identify complementary products using composition patterns
5. Compute the composed fingerprint (max at each layer)
6. Verify the composed fingerprint has no `0` or `—` at layers the user cares about
7. Flag any remaining gaps and the threats they leave open
8. Present the recommendation with the composed fingerprint and threat coverage

---

## Quick Reference Card

```
LAYERS (bottom-up)                THREATS
L1 Compute Isolation              T1 Data Exfiltration
L2 Resource Limits                T2 Supply Chain Compromise
L3 Filesystem Boundary            T3 Destructive Operations (local + remote)
L4 Network Boundary               T4 Lateral Movement
L5 Credential Management          T5 Persistence
L6 Action Governance              T6 Privilege Escalation
L7 Observability & Audit          T7 Denial of Service

STRENGTH (S: 0–4)                 GRANULARITY (G: 0–3)
0 = None                          0 = None
1 = Cooperative (bypassable)      1 = Binary (on/off)
2 = Software-enforced             2 = Allowlist/Blocklist
3 = Kernel-enforced (irreversible)3 = Per-resource policy
4 = Structural (doesn't exist)

FINGERPRINT: L1:S/L2:S/L3:S/L4:S/L5:S/L6:S/L7:S
SCORE CARD:  S.G per layer (e.g., 4.1 = structural, binary)

COMPOSITION: take max(S) at each layer
CRITICAL:    if L4 = 0 → exfiltration risk
             if L6 = 0 and agent has remote access → remote destruction risk
             cooperative enforcement → always S:1
```
