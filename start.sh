#!/bin/bash

# Check if Node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not detected!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node -v)"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Dependencies not found. Installing..."
    npm install
else
    echo "✅ Dependencies already installed."
fi

# Start the dev server
echo "🚀 Starting development server..."
npm run dev
