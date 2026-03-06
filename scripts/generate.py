#!/usr/bin/env python3
"""
Generate SVG visualizations from the AST product scores YAML.

Usage:
    uv run python scripts/generate.py

Reads:  products.yaml
Writes: assets/fingerprint-heatmap.svg
        assets/threat-coverage.svg

No external dependencies beyond PyYAML.
"""

import yaml
import os
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
REPO_ROOT = SCRIPT_DIR.parent
PRODUCTS_FILE = REPO_ROOT / "products.yaml"
OUTPUT_DIR = REPO_ROOT / "assets"

LAYERS = ["L1", "L2", "L3", "L4", "L5", "L6", "L7"]
LAYER_NAMES = {
    "L1": "Compute",
    "L2": "Resource",
    "L3": "Filesystem",
    "L4": "Network",
    "L5": "Credentials",
    "L6": "Governance",
    "L7": "Observability",
}
THREATS = ["T1", "T2", "T3", "T4", "T5", "T6", "T7"]

# ── Color scheme (light theme, matching ast-infographic.svg) ──────────

STRENGTH_COLORS = {
    None: "#f3f4f6",  # — not addressed (light gray)
    0:    "#fef2f2",  # unenforced (red tint)
    1:    "#fffbeb",  # cooperative (amber tint)
    2:    "#eff6ff",  # software-enforced (blue tint)
    3:    "#f5f3ff",  # kernel-enforced (purple tint)
    4:    "#ecfdf5",  # structural (green tint)
}

STRENGTH_BORDERS = {
    None: "#d1d5db",  # gray
    0:    "#fca5a5",  # red
    1:    "#fbbf24",  # amber
    2:    "#60a5fa",  # blue
    3:    "#a78bfa",  # purple
    4:    "#34d399",  # green
}

STRENGTH_TEXT = {
    None: "#9ca3af",  # gray
    0:    "#dc2626",  # red
    1:    "#d97706",  # amber
    2:    "#2563eb",  # blue
    3:    "#7c3aed",  # purple
    4:    "#059669",  # green
}

THREAT_COLORS = {
    "full":    "#059669",  # green
    "partial": "#d97706",  # amber
    "none":    "#d1d5db",  # light gray
}

BG_COLOR = "white"
TEXT_COLOR = "#111827"
MUTED_COLOR = "#6b7280"
GRID_COLOR = "#f3f4f6"
ACCENT_COLOR = "#6366f1"
FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif"


def load_products():
    with open(PRODUCTS_FILE) as f:
        data = yaml.safe_load(f)
    return data["products"]


def get_strength(product, layer):
    layer_data = product["layers"].get(layer, {})
    return layer_data.get("s")


def get_granularity(product, layer):
    layer_data = product["layers"].get(layer, {})
    return layer_data.get("g")


def get_threat_level(product, threat):
    raw = product.get("threats", {}).get(threat, "none")
    if raw == "full":
        return "full"
    elif raw == "none":
        return "none"
    else:
        return "partial"


def escape_xml(text):
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


# ── Heatmap SVG ───────────────────────────────────────────────────────

def generate_heatmap(products):
    cell_w = 72
    cell_h = 28
    name_col_w = 200
    header_h = 56
    row_gap = 3
    legend_h = 50

    total_rows = len(products)
    total_h = header_h + total_rows * (cell_h + row_gap) + legend_h + 20
    total_w = name_col_w + len(LAYERS) * (cell_w + row_gap) + 16

    lines = []
    lines.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total_w} {total_h}" font-family="{FONT}">')
    lines.append(f'<rect width="{total_w}" height="{total_h}" fill="{BG_COLOR}" rx="8"/>')

    # title
    lines.append(f'<text x="{total_w/2}" y="22" fill="{TEXT_COLOR}" font-size="14" font-weight="700" text-anchor="middle" letter-spacing="-0.3">Product Score Cards — Strength · Granularity</text>')

    # column headers
    for i, layer in enumerate(LAYERS):
        x = name_col_w + i * (cell_w + row_gap) + cell_w / 2
        lines.append(f'<text x="{x}" y="{header_h - 20}" fill="{MUTED_COLOR}" font-size="9" text-anchor="middle">{LAYER_NAMES[layer]}</text>')
        lines.append(f'<text x="{x}" y="{header_h - 6}" fill="{ACCENT_COLOR}" font-size="10" font-weight="700" text-anchor="middle">{layer}</text>')

    y = header_h
    for p in products:
        name = escape_xml(p["name"])
        lines.append(f'<text x="14" y="{y + cell_h/2 + 4}" fill="{TEXT_COLOR}" font-size="10" font-weight="500">{name}</text>')

        for i, layer in enumerate(LAYERS):
            s = get_strength(p, layer)
            g = get_granularity(p, layer)
            bg = STRENGTH_COLORS[s]
            border = STRENGTH_BORDERS[s]
            txt = STRENGTH_TEXT[s]
            x = name_col_w + i * (cell_w + row_gap)

            # cell with colored border
            lines.append(f'<rect x="{x}" y="{y}" width="{cell_w}" height="{cell_h}" rx="4" fill="{bg}" stroke="{border}" stroke-width="1"/>')

            # strength bar at bottom
            if s is not None and s > 0:
                bar_w = (s / 4) * (cell_w - 8)
                lines.append(f'<rect x="{x + 4}" y="{y + cell_h - 6}" width="{bar_w}" height="3" rx="1.5" fill="{border}" opacity="0.6"/>')

            # label
            if s is None:
                label = "—"
            elif s == 0:
                label = f"0.{g}" if g is not None else "0"
            else:
                label = f"{s}.{g}" if g is not None else str(s)

            lines.append(f'<text x="{x + cell_w/2}" y="{y + cell_h/2 + 1}" fill="{txt}" font-size="12" font-weight="700" text-anchor="middle" dominant-baseline="middle">{label}</text>')

        y += cell_h + row_gap

    # legend
    legend_y = y + 14
    lines.append(f'<text x="10" y="{legend_y}" fill="{MUTED_COLOR}" font-size="9" font-weight="600" letter-spacing="1">STRENGTH</text>')
    legend_items = [
        (None, "— N/A"),
        (0, "0 None"),
        (1, "1 Cooperative"),
        (2, "2 Software"),
        (3, "3 Kernel"),
        (4, "4 Structural"),
    ]
    lx = 80
    for val, text in legend_items:
        bg = STRENGTH_COLORS[val]
        border = STRENGTH_BORDERS[val]
        txt_color = STRENGTH_TEXT[val]
        lines.append(f'<rect x="{lx}" y="{legend_y - 10}" width="14" height="14" rx="3" fill="{bg}" stroke="{border}" stroke-width="1"/>')
        lines.append(f'<text x="{lx + 19}" y="{legend_y}" fill="{MUTED_COLOR}" font-size="9">{escape_xml(text)}</text>')
        lx += len(text) * 6 + 28

    lines.append("</svg>")
    return "\n".join(lines)


# ── Threat coverage SVG ───────────────────────────────────────────────

def _threat_shape(level, cx, cy, r):
    """SVG threat coverage indicator: filled/half/empty circle."""
    elems = []
    if level == "full":
        elems.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{THREAT_COLORS["full"]}"/>')
    elif level == "partial":
        # half circle: left filled, right empty
        elems.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{GRID_COLOR}" stroke="#e5e7eb" stroke-width="1"/>')
        elems.append(f'<path d="M {cx},{cy - r} A {r},{r} 0 0,0 {cx},{cy + r} Z" fill="{THREAT_COLORS["partial"]}"/>')
        elems.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{THREAT_COLORS["partial"]}" stroke-width="1.5"/>')
    else:  # none
        elems.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{GRID_COLOR}" stroke="#e5e7eb" stroke-width="1"/>')
    return elems


def generate_threat_coverage(products):
    cell_w = 68
    cell_h = 28
    name_col_w = 200
    header_h = 56
    row_gap = 3
    legend_h = 50
    indicator_r = 8

    total_rows = len(products)
    total_h = header_h + total_rows * (cell_h + row_gap) + legend_h + 20
    total_w = name_col_w + len(THREATS) * (cell_w + row_gap) + 16

    threat_names = {
        "T1": "Exfiltration",
        "T2": "Supply Chain",
        "T3": "Destructive",
        "T4": "Lateral",
        "T5": "Persistence",
        "T6": "Priv Esc",
        "T7": "DoS",
    }

    lines = []
    lines.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total_w} {total_h}" font-family="{FONT}">')
    lines.append(f'<rect width="{total_w}" height="{total_h}" fill="{BG_COLOR}" rx="8"/>')

    lines.append(f'<text x="{total_w/2}" y="22" fill="{TEXT_COLOR}" font-size="14" font-weight="700" text-anchor="middle" letter-spacing="-0.3">Threat Coverage Matrix</text>')

    for i, threat in enumerate(THREATS):
        x = name_col_w + i * (cell_w + row_gap) + cell_w / 2
        lines.append(f'<text x="{x}" y="{header_h - 20}" fill="{MUTED_COLOR}" font-size="9" text-anchor="middle">{threat_names[threat]}</text>')
        lines.append(f'<text x="{x}" y="{header_h - 6}" fill="{ACCENT_COLOR}" font-size="10" font-weight="700" text-anchor="middle">{threat}</text>')

    y = header_h
    for p in products:
        name = escape_xml(p["name"])
        lines.append(f'<text x="14" y="{y + cell_h/2 + 4}" fill="{TEXT_COLOR}" font-size="10" font-weight="500">{name}</text>')

        for i, threat in enumerate(THREATS):
            level = get_threat_level(p, threat)
            x = name_col_w + i * (cell_w + row_gap)
            cx = x + cell_w / 2
            cy = y + cell_h / 2

            lines.extend(_threat_shape(level, cx, cy, indicator_r))

        y += cell_h + row_gap

    # legend
    legend_y = y + 14
    lines.append(f'<text x="10" y="{legend_y}" fill="{MUTED_COLOR}" font-size="9" font-weight="600" letter-spacing="1">COVERAGE</text>')
    legend_data = [("full", "Primary defense"), ("partial", "Partial"), ("none", "Not addressed")]
    lx = 80
    for level, text in legend_data:
        lines.extend(_threat_shape(level, lx + 7, legend_y - 4, 6))
        lines.append(f'<text x="{lx + 19}" y="{legend_y}" fill="{MUTED_COLOR}" font-size="9">{escape_xml(text)}</text>')
        lx += len(text) * 6 + 36

    lines.append("</svg>")
    return "\n".join(lines)


# ── Main ──────────────────────────────────────────────────────────────

def main():
    products = load_products()

    heatmap_svg = generate_heatmap(products)
    heatmap_path = OUTPUT_DIR / "fingerprint-heatmap.svg"
    heatmap_path.write_text(heatmap_svg)
    print(f"✓ {heatmap_path}")

    threat_svg = generate_threat_coverage(products)
    threat_path = OUTPUT_DIR / "threat-coverage.svg"
    threat_path.write_text(threat_svg)
    print(f"✓ {threat_path}")


if __name__ == "__main__":
    main()
