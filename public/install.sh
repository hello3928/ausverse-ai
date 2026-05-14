#!/bin/bash
set -e

echo ""
echo "  AusVerse Intelligence Agency — Installer"
echo ""

if [ "$(uname -m)" != "arm64" ]; then
  echo "  Error: Only Apple Silicon (arm64) is supported."
  exit 1
fi

echo "  Checking for latest version..."
VERSION=$(curl -fsSL https://ausverseintelligence.com/updates/latest-mac.yml | grep '^version:' | sed 's/version:[[:space:]]*//' | tr -d '[:space:]')

if [ -z "$VERSION" ]; then
  echo "  Error: Could not fetch latest version."
  exit 1
fi

echo "  Latest version: $VERSION"

PKG_URL="https://ausverseintelligence.com/updates/AIA-${VERSION}-arm64.pkg"
TMP_PKG="/tmp/AIA-${VERSION}-arm64.pkg"

echo "  Downloading..."
curl -L --progress-bar -o "$TMP_PKG" "$PKG_URL"

echo "  Installing (may require your password)..."
sudo installer -pkg "$TMP_PKG" -target /

rm -f "$TMP_PKG"

echo ""
echo "  AIA ${VERSION} installed. Open it from your Applications folder."
echo ""
