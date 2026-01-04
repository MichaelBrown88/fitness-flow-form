#!/bin/bash
# Setup Node.js using nvm - Run this in your terminal

echo "Setting up Node.js with nvm..."

# Load nvm (check both possible locations)
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  \. "$NVM_DIR/nvm.sh"
elif [ -s "$HOME/.nvm/nvm.sh" ]; then
  \. "$HOME/.nvm/nvm.sh"
fi

# Install Node.js LTS (v20)
echo "Installing Node.js v20 (LTS)..."
nvm install 20

# Use Node.js v20
echo "Setting Node.js v20 as active..."
nvm use 20

# Set as default
echo "Setting Node.js v20 as default..."
nvm alias default 20

# Verify installation
echo ""
echo "✅ Node.js setup complete!"
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"
echo ""
echo "You can now run 'npm run dev' in this project!"

