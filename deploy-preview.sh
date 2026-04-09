#!/bin/bash
# Deploy to Firebase Hosting Preview Channel
# This creates a public URL you can use to test on your iPad/phone
#
# ⚠️  HOSTING-ONLY DEPLOY — does NOT update Firestore rules or Cloud Functions.
# If you have pending changes to firestore.rules or functions/, run a full deploy:
#   firebase deploy
# Phase 3 (data minimization) rules MUST be deployed alongside app code.
# Deploying rules without app code → coaches get denied reads.
# Deploying app code without rules → data minimization is not enforced.

echo "🚀 Deploying to Firebase Hosting Preview Channel..."

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20

# Build the app
echo "📦 Building app..."
npm run build

# Deploy to preview channel
echo "🌐 Deploying to preview channel..."
firebase hosting:channel:deploy preview-$(date +%Y%m%d-%H%M%S)

echo ""
echo "✅ Preview channel deployed!"
echo "📱 Use the URL shown above to test on your iPad/phone"
echo "🔗 The companion link will work from that URL"

