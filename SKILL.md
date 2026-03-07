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

A flat list of tags answering: **what OS does it run on, and what infrastructure does it need?**

Tags cover two dimensions — **OS support** and **infrastructure dependencies** — combined in a single array.

| Tag | Dimension | Meaning |
|---|---|---|
| **any-os** | OS | Works on Linux, macOS, and Windows |
| **linux** | OS | Requires Linux |
| **mac** | OS | Supports macOS |
| **cloud** | Infra | Runs in vendor's cloud; OS abstracted away |
| **docker** | Infra | Requires Docker or compatible container runtime |
| **k8s** | Infra | Requires a Kubernetes cluster |
| **kvm** | Infra | Requires `/dev/kvm` (bare metal or nested virtualization) |

No infrastructure tag means the tool runs directly on the OS with no extra dependencies.

Products typically have multiple tags (e.g., `[linux, mac]` or `[any-os, cloud]`).

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
| Kernel/hypervisor network filter | 3 | 2 | **Opaque**: iptables, eBPF, or Network Extension |
| MITM proxy (iptables redirect) | 2 | 3 | **Opaque**: all traffic redirected regardless of process |
| MITM proxy (kernel-redirected) | 3 | 3 | **Opaque**: TLS-terminating; per-URL/method policies |
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

> **⚠ Confidence notice.** Scoring from documentation and source code alone produces a **preliminary score card**. Scores at S:3+ are architectural claims that ideally require hands-on verification (running the sandbox, testing bypass attempts, inspecting enforcement at runtime). Flag any score where evidence is indirect or incomplete — a preliminary score card is useful for comparison but should not be treated as a security audit.

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

#### Where to Look (in priority order)

1. **Source code** — The authoritative source. Look for sandbox setup, isolation config, network rules, seccomp profiles, Dockerfile/VM config. If open source, this is ground truth.
2. **Architecture / security documentation** — Whitepapers, security model docs, threat models. Look for enforcement mechanism descriptions, not feature lists.
3. **API / CLI reference** — Configuration options reveal what's actually controllable. If there's no config for network policy, there's probably no network policy.
4. **README and docs site** — Good for understanding intent and scope. Cross-reference claims against source code or API surface.
5. **Blog posts and announcements** — Lowest priority. Treat as claims requiring corroboration, not evidence.

#### Evidence Trust Levels

Evidence quality is **independent of the strength score being assigned**. A blog post claiming S:1 is just as suspect as a blog post claiming S:4 — the trust level describes the *source*, not the *score*.

Each product in the score card carries an `evidence_level` tag from this scale:

| Level | Source | How to Use |
|---|---|---|
| **verified** | Hands-on testing, runtime inspection, bypass attempts | Score directly. Highest confidence. No flag needed. |
| **source-code** | Open-source repo: sandbox config, seccomp profiles, Dockerfile, VM setup | Score directly. Ground truth for mechanism identification, but no runtime verification. Flag if code is ambiguous or experimental (`WARNING:`). |
| **docs** | Official documentation — architecture docs, API/CLI reference, README, security whitepapers | Score, but flag for review if claims cannot be cross-referenced against source code or API surface (`NEEDS REVIEW:`). |
| **inferred** | Indirect evidence — blog posts, marketing pages, changelog mentions, or reasonable inference from related products | Flag with `WARNING:` and note the evidence gap. Score based on what can be corroborated; uncorroborated claims alone are insufficient. Lowest confidence. |

If a layer has no evidence at all (not mentioned anywhere), mark it `—` (not addressed).

> **🔍 NEEDS HUMAN REVIEW:** Any score where the best available evidence is `docs` or `inferred` should be flagged for human verification. This applies equally to S:1 and S:4 — low trust evidence is low trust regardless of the score it supports.

#### Conservative Scoring Rules

- **Undocumented = not scored.** If a layer has no documentation and no source code evidence, mark it `—` (not addressed), not `0`.
- **Uncorroborated claims → flag, don't inflate.** If a blog says "we use hypervisor-enforced network isolation" but no API/config/source confirms it, flag with `WARNING:` and note the evidence gap. Score based on what *is* verifiable, not what is claimed.
- **Roadmap features = 0.** Features described as "coming soon," "on roadmap," or "planned" do not count. Score current state only.
- **"Default off" features score the default.** If network filtering exists but is disabled by default and most users won't enable it, note both the default score and the configured score. The fingerprint uses the **configured** score (what the product *can* do), but flag the default gap.
- **Compliance certifications (SOC 2, ISO 27001) are not layer scores.** They indicate organizational controls, not sandbox enforcement mechanisms. Note them but don't let them inflate S/G scores.
- **When in doubt, score lower.** A score can always be revised upward with better evidence. An inflated score misleads.

#### Handling Ambiguity

- **Multiple deployment modes** — Score the strongest available mode but note the weakest (e.g., "S:4 (microVM); WARNING: Linux legacy mode is S:2 (container)").
- **Platform-managed vs self-hosted** — If the product has both, score the platform-managed version unless the user specifies otherwise. Note differences.
- **Shared kernel vs dedicated kernel** — If docs say "container" without specifying the runtime, assume shared kernel (S:2). Only score S:3+ with evidence of gVisor, Kata, Firecracker, or equivalent.

> **🔍 NEEDS HUMAN REVIEW:** When documentation is ambiguous or contradictory (e.g., blog claims a feature that API docs don't expose), flag the affected layers for human review rather than guessing. Use `WARNING:` prefix in the score card notes and explain the discrepancy.

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

Apply the threshold rules below **mechanically** for each threat. Do not eyeball — use the layer scores from Step 2 and the rules to determine the symbol. Treat `~` (not addressed) as 0 for threshold comparisons.

| Rating | Symbol | Meaning |
|---|---|---|
| Addressed | **●** | All primary defense layers meet their thresholds — the threat is actively defended or structurally eliminated |
| Partial | **◐** | At least one primary defense layer contributes (meets its threshold) but not all do |
| Not addressed | **○** | No primary defense layer meets its threshold — the threat is real and unmitigated |

#### Threat threshold rules

For each threat, the **primary defense layers** and their **thresholds** are listed. Apply them mechanically:

**T1 — Data Exfiltration** (primary: L3, L4, L5)
- ● if **all three** of L3 >= 2, L4 >= 2, L5 >= 2
- ◐ if **at least one** of L3 >= 2, L4 >= 2, L5 >= 2
- ○ if **none** meet the threshold

**T2 — Supply Chain Compromise** (primary: L3, L4, L7)
- ● if **all three** of L3 >= 2, L4 >= 2, L7 >= 2
- ◐ if **at least one** of L3 >= 2, L4 >= 2, L7 >= 2
- ○ if **none** meet the threshold

**T3 — Destructive Operations** (split local/remote, then combine)
- **T3-Local** (primary: L1, L3): ● if **both** L1 >= 2 AND L3 >= 2; ◐ if **one**; ○ if **neither**
- **T3-Remote** (primary: L4, L6): ● if **both** L4 >= 2 AND L6 >= 2; ◐ if **one**; ○ if **neither**
- Use notation: `L●/R○`, `L●/R◐`, `L+R` (both ●), etc.

**T4 — Lateral Movement** (primary: L4, L1)
- ● if **both** L4 >= 2 AND L1 >= 2
- ◐ if **one** of L4 >= 2, L1 >= 2
- ○ if **neither** meets the threshold

**T5 — Persistence** (primary: L1, L3, L6; OR ephemeral)
- ● if sandbox is **ephemeral** (destroyed after session, L1 >= 4 with ephemeral lifecycle), OR if **all three** of L1 >= 2, L3 >= 2, L6 >= 2
- ◐ if **at least one** of L1 >= 2, L3 >= 2, L6 >= 2
- ○ if **none** meet the threshold

**T6 — Privilege Escalation** (primary: L1, L2)
- ● if **both** L1 >= 3 AND L2 >= 2 (kernel/hardware isolation + external resource caps)
- ◐ if **at least one** of L1 >= 2, L2 >= 2
- ○ if **neither** meets the threshold

**T7 — Denial of Service** (primary: L2, L1)
- ● if **both** L2 >= 2 AND L1 >= 2
- ◐ if **at least one** of L2 >= 2, L1 >= 2
- ○ if **neither** meets the threshold

#### T3 notation

Always split T3 into local and remote:
- `L●/R○` = local mitigated, remote not
- `L●/R◐` = local mitigated, remote partially
- `full L+R` = both fully mitigated
- Use the combined result for the single T3 column in the threat matrix: if both are ●, T3 = ●; if mixed, T3 = the lower of the two

### Step 4: Produce the Score Card

Output the score card in this format:

```
### [Product Name]
**Fingerprint: `L1:S/L2:S/L3:S/L4:S/L5:S/L6:S/L7:S`** · Portability: `[tags]`
**Confidence: preliminary | verified** (preliminary = documentation/source review only; verified = includes hands-on testing)

| Layer | S.G | Notes |
|---|---|---|
| L1 Compute | S.G | [mechanism, enforcement method, evidence source] |
| L2 Resource | S.G | [mechanism, enforcement method, evidence source] |
| L3 Filesystem | S.G | [mechanism, enforcement method, evidence source] |
| L4 Network | S.G | [mechanism, enforcement method, evidence source] |
| L5 Credentials | S.G | [mechanism, enforcement method, evidence source] |
| L6 Action | S.G | [mechanism, enforcement method, evidence source] |
| L7 Observability | S.G | [mechanism, enforcement method, evidence source] |

Threats: T1[●◐○] T2[●◐○] T3[●◐○](L[●◐○]/R[●◐○]) T4[●◐○] T5[●◐○] T6[●◐○] T7[●◐○]
Gaps: [identify layers with 0 or — that matter]
Complements: [what kind of tool would fill the gaps]
Review flags: [list any layers needing human verification, with reasons]
```

For each layer note, include: (1) the mechanism name, (2) how enforcement works, and (3) where the evidence came from — source code, docs, API reference, or blog. Use `WARNING:` prefix for layers where documentation is ambiguous or enforcement is unverified. Use `NEEDS REVIEW:` prefix for layers where the score depends on an assumption that should be verified by a human.

### Step 5: Validate

Run these sanity checks on your score card:
- **No upper layer is stronger than L1** in strength. If L1 is S:2, no other layer can realistically be S:4 (the isolation foundation is weaker than the claim).
- **Cooperative mechanisms are always S:1.** If you scored something S:2+ but the process can bypass it, downgrade.
- **L4:0 with credentials present = T1 risk.** Flag this explicitly.
- **Threat scores must match threshold rules.** Re-derive each threat symbol from the layer scores using the rules in Step 3. If your intuitive assessment differs from the mechanical result, the mechanical result wins.
- **No product should have T7:○ if L1 >= 2.** Strong compute isolation provides partial DoS defense even without dedicated resource caps.
- **Every product with L1 >= 2 AND L3 >= 2 gets T3-Local ●.** If you have any isolation at all, local destructive operations are addressed at baseline.
- **T2 is universally hard.** Requires L3 >= 2, L4 >= 2, AND L7 >= 2 for ●. Most products score ◐.
- **Every S:3+ score has architectural evidence.** If you scored S:3 or S:4 but your evidence is only marketing copy or a blog post, downgrade and flag for review.
- **Check for blog-to-docs gaps.** If a security feature is described in a blog but absent from API/CLI docs, flag it with `WARNING:` and score conservatively.
- **Evidence trust matches confidence.** Review every layer's trust level (see Step 1). Any layer scored from architecture docs or lower without corroboration should carry a `NEEDS REVIEW:` flag — regardless of the strength score assigned.

> **🔍 NEEDS HUMAN REVIEW:** After completing the score card, list all layers where (a) the best evidence is architecture docs or lower (no source code, no hands-on testing), (b) documentation was ambiguous or contradictory, or (c) a feature was claimed but could not be verified. These are candidates for hands-on verification before the score card is considered final.

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
- No infrastructure → process wrappers (no infra tag needed)
- Docker available → container wrappers, sidecars (`docker`)
- Cloud/K8s → full platform range (`cloud`, `k8s`)

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

### Anti-Pattern: Platform Without Network Controls

A cloud platform provides excellent L1/L2/L3, but the user deploys with default (unrestricted) network access and passes cloud credentials as env vars. The agent runs in a perfect microVM but can still exfiltrate credentials, delete cloud resources, and reach internal services.

**This is the most common configuration in practice and a false sense of security.** Strong L1 is necessary but not sufficient. Look at the fingerprint: if L4 is `0`, you have a problem.

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
