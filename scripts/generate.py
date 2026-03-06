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

# ── Color scheme ──────────────────────────────────────────────────────

STRENGTH_COLORS = {
    None: "#2d2d2d",  # — not addressed (dark)
    0:    "#4a1a1a",  # ○ present but unenforced (dark red)
    1:    "#b45309",  # cooperative (amber)
    2:    "#2563eb",  # software-enforced (blue)
    3:    "#7c3aed",  # kernel-enforced (purple)
    4:    "#059669",  # structural (green)
}

STRENGTH_LABELS = {
    None: "—",
    0: "0",
    1: "1",
    2: "2",
    3: "3",
    4: "4",
}

THREAT_COLORS = {
    "full":    "#059669",  # green
    "partial": "#b45309",  # amber
    "none":    "#4a1a1a",  # dark red
}

THREAT_SYMBOLS = {
    "full":    "●",
    "partial": "◐",
    "none":    "○",
}

BG_COLOR = "#0d1117"
TEXT_COLOR = "#e6edf3"
MUTED_COLOR = "#7d8590"
GRID_COLOR = "#21262d"
CATEGORY_COLOR = "#58a6ff"


def load_products():
    with open(PRODUCTS_FILE) as f:
        data = yaml.safe_load(f)
    return data["products"]


def get_strength(product, layer):
    layer_data = product["layers"].get(layer, {})
    return layer_data.get("s")


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
    cell_h = 32
    name_col_w = 200
    header_h = 60
    category_h = 36
    row_gap = 2
    legend_h = 60

    # group by category preserving order
    categories = {}
    for p in products:
        cat = p["category"]
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(p)

    total_rows = sum(len(prods) for prods in categories.values())
    total_categories = len(categories)
    total_h = header_h + total_rows * (cell_h + row_gap) + total_categories * category_h + legend_h + 40
    total_w = name_col_w + len(LAYERS) * (cell_w + row_gap) + 20

    lines = []
    lines.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total_w} {total_h}" font-family="Consolas, Monaco, monospace">')
    lines.append(f'<rect width="{total_w}" height="{total_h}" fill="{BG_COLOR}"/>')

    # title
    lines.append(f'<text x="{total_w/2}" y="20" fill="{TEXT_COLOR}" font-size="15" font-weight="bold" text-anchor="middle">AST Fingerprint Heatmap — Strength by Layer</text>')

    # column headers
    for i, layer in enumerate(LAYERS):
        x = name_col_w + i * (cell_w + row_gap) + cell_w / 2
        lines.append(f'<text x="{x}" y="{header_h - 22}" fill="{MUTED_COLOR}" font-size="10" text-anchor="middle">{LAYER_NAMES[layer]}</text>')
        lines.append(f'<text x="{x}" y="{header_h - 8}" fill="{TEXT_COLOR}" font-size="12" font-weight="bold" text-anchor="middle">{layer}</text>')

    y = header_h
    for cat, prods in categories.items():
        # category header
        lines.append(f'<text x="10" y="{y + 22}" fill="{CATEGORY_COLOR}" font-size="12" font-weight="bold">{escape_xml(cat.upper())}</text>')
        y += category_h

        for p in prods:
            name = escape_xml(p["name"])
            lines.append(f'<text x="14" y="{y + cell_h/2 + 4}" fill="{TEXT_COLOR}" font-size="11">{name}</text>')

            for i, layer in enumerate(LAYERS):
                s = get_strength(p, layer)
                color = STRENGTH_COLORS[s]
                label = STRENGTH_LABELS[s]
                x = name_col_w + i * (cell_w + row_gap)

                lines.append(f'<rect x="{x}" y="{y}" width="{cell_w}" height="{cell_h}" rx="4" fill="{color}"/>')

                # bar fill proportional to strength
                if s is not None and s > 0:
                    bar_w = (s / 4) * (cell_w - 8)
                    lines.append(f'<rect x="{x + 4}" y="{y + cell_h - 8}" width="{bar_w}" height="4" rx="2" fill="{TEXT_COLOR}" opacity="0.3"/>')

                label_color = TEXT_COLOR if s is not None and s > 0 else MUTED_COLOR
                lines.append(f'<text x="{x + cell_w/2}" y="{y + cell_h/2 + 4}" fill="{label_color}" font-size="13" font-weight="bold" text-anchor="middle">{label}</text>')

            y += cell_h + row_gap

    # legend
    legend_y = y + 16
    lines.append(f'<text x="10" y="{legend_y}" fill="{MUTED_COLOR}" font-size="10">STRENGTH</text>')
    legend_items = [
        (None, "— Not addressed"),
        (0, "0 Unenforced"),
        (1, "1 Cooperative"),
        (2, "2 Software"),
        (3, "3 Kernel"),
        (4, "4 Structural"),
    ]
    lx = 80
    for val, text in legend_items:
        color = STRENGTH_COLORS[val]
        lines.append(f'<rect x="{lx}" y="{legend_y - 10}" width="14" height="14" rx="3" fill="{color}"/>')
        lines.append(f'<text x="{lx + 18}" y="{legend_y}" fill="{MUTED_COLOR}" font-size="10">{escape_xml(text)}</text>')
        lx += len(text) * 6.5 + 30

    lines.append("</svg>")
    return "\n".join(lines)


# ── Threat coverage SVG ───────────────────────────────────────────────

def generate_threat_coverage(products):
    cell_w = 44
    cell_h = 32
    name_col_w = 200
    header_h = 60
    category_h = 36
    row_gap = 2
    legend_h = 50

    categories = {}
    for p in products:
        cat = p["category"]
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(p)

    total_rows = sum(len(prods) for prods in categories.values())
    total_categories = len(categories)
    total_h = header_h + total_rows * (cell_h + row_gap) + total_categories * category_h + legend_h + 40
    total_w = name_col_w + len(THREATS) * (cell_w + row_gap) + 20

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
    lines.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total_w} {total_h}" font-family="Consolas, Monaco, monospace">')
    lines.append(f'<rect width="{total_w}" height="{total_h}" fill="{BG_COLOR}"/>')

    lines.append(f'<text x="{total_w/2}" y="20" fill="{TEXT_COLOR}" font-size="15" font-weight="bold" text-anchor="middle">AST Threat Coverage Matrix</text>')

    for i, threat in enumerate(THREATS):
        x = name_col_w + i * (cell_w + row_gap) + cell_w / 2
        lines.append(f'<text x="{x}" y="{header_h - 22}" fill="{MUTED_COLOR}" font-size="9" text-anchor="middle">{threat_names[threat]}</text>')
        lines.append(f'<text x="{x}" y="{header_h - 8}" fill="{TEXT_COLOR}" font-size="12" font-weight="bold" text-anchor="middle">{threat}</text>')

    y = header_h
    for cat, prods in categories.items():
        lines.append(f'<text x="10" y="{y + 22}" fill="{CATEGORY_COLOR}" font-size="12" font-weight="bold">{escape_xml(cat.upper())}</text>')
        y += category_h

        for p in prods:
            name = escape_xml(p["name"])
            lines.append(f'<text x="14" y="{y + cell_h/2 + 4}" fill="{TEXT_COLOR}" font-size="11">{name}</text>')

            for i, threat in enumerate(THREATS):
                level = get_threat_level(p, threat)
                color = THREAT_COLORS[level]
                symbol = THREAT_SYMBOLS[level]
                x = name_col_w + i * (cell_w + row_gap)

                lines.append(f'<rect x="{x}" y="{y}" width="{cell_w}" height="{cell_h}" rx="4" fill="{color}"/>')
                lines.append(f'<text x="{x + cell_w/2}" y="{y + cell_h/2 + 5}" fill="{TEXT_COLOR}" font-size="16" text-anchor="middle">{symbol}</text>')

            y += cell_h + row_gap

    # legend
    legend_y = y + 16
    lines.append(f'<text x="10" y="{legend_y}" fill="{MUTED_COLOR}" font-size="10">COVERAGE</text>')
    legend_data = [("full", "● Primary defense"), ("partial", "◐ Partial"), ("none", "○ Not addressed")]
    lx = 80
    for level, text in legend_data:
        color = THREAT_COLORS[level]
        lines.append(f'<rect x="{lx}" y="{legend_y - 10}" width="14" height="14" rx="3" fill="{color}"/>')
        lines.append(f'<text x="{lx + 18}" y="{legend_y}" fill="{MUTED_COLOR}" font-size="10">{escape_xml(text)}</text>')
        lx += 120

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
