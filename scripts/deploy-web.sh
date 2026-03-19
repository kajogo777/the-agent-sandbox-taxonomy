#!/usr/bin/env bash
set -euo pipefail

# Deploy the AST web explorer to Cloudflare Pages
# Usage: ./scripts/deploy-web.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
WEB_DIR="$REPO_ROOT/web"

echo "→ Building web explorer..."
cd "$WEB_DIR"
pnpm install --frozen-lockfile
pnpm build

echo "→ Deploying to Cloudflare Pages..."
pnpm wrangler pages deploy dist --project-name=ast-explorer --branch=main

echo "✓ Deployed to ast-explorer.pages.dev"
echo "  Custom domain: https://ast.georgebuilds.dev"
