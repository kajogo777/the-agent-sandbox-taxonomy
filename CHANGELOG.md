# Changelog

All notable changes to product scores and the taxonomy are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Added
- Interactive web explorer (React SPA) at [ast.georgebuilds.dev](https://ast.georgebuilds.dev) — filterable score cards, threat coverage matrix, and composition simulator
- `CONTRIBUTING.md` with vendor self-assessment template and scoring guidelines
- `CHANGELOG.md` for tracking score changes
- `reviewed_by` field in `products.yaml` for reviewer attribution
- Deploy script (`scripts/deploy-web.sh`) for Cloudflare Pages

---

## [1.0.0] — 2026-03-08

### Added
- Initial taxonomy: 7 defense layers, 7 threat categories, 3 evaluation dimensions (7-7-3)
- Scoring framework: Strength (S:0–4), Granularity (G:0–3), Portability tags
- Fingerprint format (CVSS-inspired vector string)
- Composition framework with stacking rules and patterns
- Decision checklist (8 questions)
- 26 product score cards in `products.yaml`
- SVG generation script (`scripts/generate.py`) for heatmap and threat coverage
- `ast-probe` — portable Go binary for automated sandbox verification
- `SKILL.md` — agent-consumable skill file for AI-assisted scoring
- `analysis-2026-03-08.md` — landscape analysis of 23 products

### Product Scores (initial)
All products scored from documentation (`evidence_level: docs`) unless noted:

| Product | Fingerprint | Evidence |
|---------|-------------|----------|
| E2B | 4/4/4/2/1/—/1 | docs |
| Daytona | 2/2/2/2/1/—/2 | docs |
| Modal | 3/3/3/2/1/—/2 | docs |
| Fly.io Sprites | 4/4/4/2/1/—/1 | docs |
| Blaxel | 4/4/4/1/1/—/2 | docs |
| Unikraft Cloud | 4/4/4/1/1/—/1 | docs |
| Docker Sandbox | 4/4/4/2/4/—/1 | docs |
| Google Agent Sandbox | 3/3/3/3/3/2/2 | docs |
| StrongDM Leash | 2/0/2/2/1/2/2 | docs |
| Stakpak Warden | 2/0/2/2/3/2/2 | docs |
| nono | 3/—/3/3/3/3/3 | docs |
| packnplay | 2/0/2/0/1/0/0 | docs |
| Claude Code (local) | 3/—/3/3/1/1/2 | docs |
| Claude Code (web) | 4/—/4/2/4/—/2 | docs |
| Codex CLI | 3/0/3/3/2/—/2 | docs |
| Cursor (sandboxed) | 3/—/2/1/0/—/1 | docs |
| Copilot coding agent | 4/4/4/2/2/2/2 | docs |
| Devin | 4/2/4/0/1/—/2 | docs |
| Replit | 2/3/3/2/2/—/2 | docs |
| Deno Sandbox | 4/4/3/3/3/—/2 | docs |
| Deno Deploy | 3/3/3/2/2/2/2 | docs |
| Cloudflare Workers | 2/2/3/2/2/2/2 | docs |
| Ona | 4/4/4/2/2/1/2 | docs |
| NVIDIA OpenShell | 2/2/3/2/3/2/2 | source-code |
| Pydantic Monty | 4/2/4/4/4/—/1 | source-code |
| just-bash | 0/0/2/2/2/—/1 | source-code |
