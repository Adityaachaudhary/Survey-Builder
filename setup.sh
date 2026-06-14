#!/usr/bin/env bash
# setup.sh — Run this once after cloning to create Cloudflare resources
# Usage: bash setup.sh

set -e

echo "🚀 Survey Builder — First-time setup"
echo ""

# Check wrangler
if ! command -v wrangler &>/dev/null; then
  echo "Installing wrangler..."
  npm install -g wrangler
fi

# Login
echo "📋 Step 1: Authenticate with Cloudflare"
wrangler login

# D1
echo ""
echo "📋 Step 2: Create D1 database"
DB_OUTPUT=$(wrangler d1 create survey-builder-db 2>&1)
echo "$DB_OUTPUT"
DB_ID=$(echo "$DB_OUTPUT" | grep -oP 'database_id = "\K[^"]+' || true)
if [ -n "$DB_ID" ]; then
  echo "✅ D1 database ID: $DB_ID"
  sed -i "s/YOUR_D1_DATABASE_ID/$DB_ID/g" api/wrangler.jsonc
  echo "   Updated api/wrangler.jsonc"
fi

# KV
echo ""
echo "📋 Step 3: Create KV namespace"
KV_OUTPUT=$(wrangler kv namespace create SESSIONS 2>&1)
echo "$KV_OUTPUT"
KV_ID=$(echo "$KV_OUTPUT" | grep -oP 'id = "\K[^"]+' || true)
if [ -n "$KV_ID" ]; then
  echo "✅ KV namespace ID: $KV_ID"
  sed -i "s/YOUR_KV_NAMESPACE_ID/$KV_ID/g" api/wrangler.jsonc
  echo "   Updated api/wrangler.jsonc"
fi

# R2
echo ""
echo "📋 Step 4: Create R2 bucket"
wrangler r2 bucket create survey-builder-logos
echo "✅ R2 bucket created"

# Migrations
echo ""
echo "📋 Step 5: Run D1 migrations (local)"
cd api
wrangler d1 migrations apply survey-builder-db --local
cd ..
echo "✅ Migrations applied"

# Resend secret
echo ""
echo "📋 Step 6: Set Resend API key"
echo "   Get your key at https://resend.com/api-keys"
cd api
wrangler secret put RESEND_API_KEY
cd ..

echo ""
echo "✅ Setup complete! Run: pnpm dev"
echo ""
echo "⚠️  Remember to:"
echo "   1. Update 'from' email in api/src/routes/auth.ts"
echo "   2. Verify your domain in Resend (or use onboarding@resend.dev for testing)"
