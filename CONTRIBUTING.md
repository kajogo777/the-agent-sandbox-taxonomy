# Contributing to the Agent Sandbox Taxonomy

Thank you for your interest in improving the AST. Contributions fall into four categories:

1. **Score corrections** — Fix an inaccurate score with evidence
2. **New product submissions** — Add a sandbox product not yet in the taxonomy
3. **Vendor self-assessments** — Score your own product (vendors welcome!)
4. **Taxonomy improvements** — Propose changes to layers, threats, or scoring rules

---

## Quick Start

```bash
# Fork and clone
git clone https://github.com/<your-fork>/the-agent-sandbox-taxonomy.git
cd the-agent-sandbox-taxonomy

# Edit products.yaml, then regenerate visuals
uv run python scripts/generate.py

# Verify the build
cd web && pnpm install && pnpm build && cd ..

# Commit and open a PR
```

---

## 1. Score Corrections

Found an inaccurate score? Open a PR that:

1. Updates the product entry in `products.yaml`
2. Includes **evidence** in the `note` field (link to source code, docs, or test results)
3. Updates `last_reviewed` to today's date
4. Updates `evidence_level` if your evidence is stronger than the current level
5. Runs `uv run python scripts/generate.py` to regenerate SVGs

**Every note must include S and G justification.** See the [Note Format](#note-format) section below.

---

## 2. New Product Submissions

To add a product not yet in the taxonomy:

1. Copy the template below into `products.yaml`
2. Research the product following the [evidence priority order](#evidence-priority)
3. Score each layer using the [mechanism reference tables](README.md#appendix-a-layer-mechanism-reference)
4. Run `uv run python scripts/generate.py`
5. Open a PR with your scores and evidence

### Product Entry Template

```yaml
- name: "Product Name"
  portability:
    - cloud          # or: linux, mac, any-os, docker, k8s, kvm, cloud-managed
  layers:
    L1:
      s: null        # 0-4 or null (not addressed)
      g: null        # 0-3 or null
      note: |
        [Mechanism name]; [how enforcement works].
        S:[score] — [justification referencing scoring criteria].
        G:[score] — [justification].
        Evidence: [source code / docs / API reference / blog].
    L2:
      s: null
      g: null
      note: ""
    L3:
      s: null
      g: null
      note: ""
    L4:
      s: null
      g: null
      note: ""
    L5:
      s: null
      g: null
      note: ""
    L6:
      s: null
      g: null
      note: ""
    L7:
      s: null
      g: null
      note: ""
  notes: "Gaps: [identify layers with 0 or —]. Complements: [what fills the gaps]"
  last_reviewed: "2026-03-19"       # date of your review
  evidence_level: docs              # verified | source-code | docs | inferred
```

---

## 3. Vendor Self-Assessments

**Vendors: we actively encourage you to score your own product.** You know your architecture better than anyone. Self-assessments are reviewed by maintainers before merging.

### How It Works

1. Fork the repo and add your product to `products.yaml` using the template above
2. Score each layer honestly — inflated scores will be caught in review
3. Include detailed notes with evidence links (source code preferred)
4. Set `evidence_level` to the strongest evidence you're providing
5. Open a PR with the title: `[Vendor] Add <Product Name> score card`

### What We Look For in Review

| ✓ Good | ✗ Will Be Questioned |
|--------|---------------------|
| S/G justification in every note | Mechanism name only, no reasoning |
| Links to source code or architecture docs | Marketing page as sole evidence |
| Conservative scores with `WARNING:` flags | Every layer at S:3+ with no caveats |
| Honest gaps identified in `notes` | "No gaps" when L6 is clearly `null` |
| `NEEDS REVIEW:` on uncertain layers | Confident scores from blog posts |

### Scoring Rules Reminder

- **Cooperative enforcement → always S:1.** If the process can bypass it, it's S:1.
- **Escape hatch → caps at S:1.** If there's a `--dangerously-skip-*` flag, note it.
- **HITL is not L6.** Human-in-the-loop is valuable but scored `—` at L6.
- **Compliance certs are not layer scores.** SOC 2 is organizational, not sandbox enforcement.
- **Roadmap features = 0.** Score current state only.
- **When in doubt, score lower.** Scores can be revised upward with better evidence.

### After Submission

A maintainer will:
1. Cross-reference your scores against public documentation
2. Flag any scores that seem inconsistent with the evidence
3. Request clarification on `WARNING:` or `NEEDS REVIEW:` items
4. Merge once scores are agreed upon

Your product will appear in the [score cards](README.md#appendix-b-product-score-cards), the [web explorer](web/), and the threat coverage matrix.

---

## Evidence Priority

When researching a product, use evidence in this order (strongest first):

| Priority | Source | Trust Level |
|----------|--------|-------------|
| 1 | **Source code** — sandbox config, seccomp profiles, Dockerfile, VM setup | Ground truth |
| 2 | **Architecture / security docs** — whitepapers, threat models | High |
| 3 | **API / CLI reference** — configuration options reveal actual capabilities | Medium-high |
| 4 | **README and docs site** — intent and scope | Medium |
| 5 | **Blog posts and announcements** — treat as claims, not evidence | Low |

---

## Note Format

Every layer note in `products.yaml` must include explicit reasoning. A future reviewer should understand *why* this score was assigned without re-researching the product.

**Required elements (in order):**

1. **Mechanism** — What the product uses
2. **S justification** — Why this strength score, referencing the criteria
3. **G justification** — Why this granularity score
4. **Evidence source** — Where the information came from
5. **Flags** — `WARNING:` for ambiguous enforcement, `NEEDS REVIEW:` for assumptions

**Good example:**
```
Firecracker microVM via KVM; dedicated Linux guest kernel per sandbox.
S:4 — hardware boundary: host kernel attack surface doesn't exist inside
the VM (hypervisor-enforced isolation). G:1 — binary: sandbox is either
running or not, no per-workload isolation tuning. Evidence: architecture
docs + open-source Firecracker VMM.
```

**Bad example (will be rejected):**
```
Firecracker microVM (KVM); dedicated Linux guest kernel; minimal VMM
```

---

## Running ast-probe for Verified Scores

The strongest evidence is hands-on testing. If you can run `ast-probe` inside the sandbox:

```bash
# Download and run inside the sandbox
curl -LO https://github.com/kajogo777/the-agent-sandbox-taxonomy/releases/latest/download/ast-probe-linux-amd64
chmod +x ast-probe-linux-amd64
./ast-probe-linux-amd64 --product "your-product" --out report.json
```

Include the probe output in your PR. Set `evidence_level: verified`.

---

## Regenerating Assets

After editing `products.yaml`, always regenerate:

```bash
# Regenerate SVG heatmap and threat coverage matrix
uv run python scripts/generate.py

# Rebuild the web explorer (optional, CI does this)
cd web && pnpm install && pnpm build
```

---

## Code of Conduct

- Be respectful in reviews — scoring disagreements are technical, not personal
- Vendors: honest self-assessment builds trust; inflated scores erode it
- All contributions are reviewed by maintainers before merging
- Scores are living data — they can be updated as products evolve
