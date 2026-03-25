#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ICON_SRC="/Users/christopherrobinson/Downloads/Gemini_Generated_Image_pj8ph7pj8ph7pj8p-removebg-preview.png"
APP_NAME="Resume Editor"
BINARY_NAME="ResumeEditor"
BUNDLE="$SCRIPT_DIR/dist/$APP_NAME.app"

echo "→ Cleaning previous build..."
rm -rf "$SCRIPT_DIR/dist"
mkdir -p "$BUNDLE/Contents/MacOS"
mkdir -p "$BUNDLE/Contents/Resources"

# ── Icon ──────────────────────────────────────────────────────────────────────
echo "→ Generating icon..."
ICONSET="$SCRIPT_DIR/AppIcon.iconset"
rm -rf "$ICONSET"
mkdir -p "$ICONSET"

sips -z 16   16   "$ICON_SRC" --out "$ICONSET/icon_16x16.png"        > /dev/null
sips -z 32   32   "$ICON_SRC" --out "$ICONSET/icon_16x16@2x.png"     > /dev/null
sips -z 32   32   "$ICON_SRC" --out "$ICONSET/icon_32x32.png"        > /dev/null
sips -z 64   64   "$ICON_SRC" --out "$ICONSET/icon_32x32@2x.png"     > /dev/null
sips -z 128  128  "$ICON_SRC" --out "$ICONSET/icon_128x128.png"      > /dev/null
sips -z 256  256  "$ICON_SRC" --out "$ICONSET/icon_128x128@2x.png"   > /dev/null
sips -z 256  256  "$ICON_SRC" --out "$ICONSET/icon_256x256.png"      > /dev/null
sips -z 512  512  "$ICON_SRC" --out "$ICONSET/icon_256x256@2x.png"   > /dev/null
sips -z 512  512  "$ICON_SRC" --out "$ICONSET/icon_512x512.png"      > /dev/null
sips -z 1024 1024 "$ICON_SRC" --out "$ICONSET/icon_512x512@2x.png"   > /dev/null

iconutil -c icns "$ICONSET" -o "$BUNDLE/Contents/Resources/AppIcon.icns"
rm -rf "$ICONSET"

# ── Compile ───────────────────────────────────────────────────────────────────
echo "→ Compiling Swift..."
swiftc \
    -framework Cocoa \
    -framework WebKit \
    -O \
    "$SCRIPT_DIR/ResumeEditor.swift" \
    -o "$BUNDLE/Contents/MacOS/$BINARY_NAME"

# ── Bundle ────────────────────────────────────────────────────────────────────
echo "→ Assembling bundle..."
cp "$SCRIPT_DIR/Info.plist" "$BUNDLE/Contents/"

# ── DMG ───────────────────────────────────────────────────────────────────────
echo "→ Creating DMG..."
STAGING="$SCRIPT_DIR/dmg-staging"
rm -rf "$STAGING"
mkdir -p "$STAGING"
cp -r "$BUNDLE" "$STAGING/"
ln -s /Applications "$STAGING/Applications"

hdiutil create \
    -volname "$APP_NAME" \
    -srcfolder "$STAGING" \
    -ov -format UDZO \
    "$SCRIPT_DIR/dist/$APP_NAME.dmg" \
    > /dev/null

rm -rf "$STAGING"

echo ""
echo "✓ Done: $SCRIPT_DIR/dist/$APP_NAME.dmg"
echo "  Open the DMG and drag '$APP_NAME' to /Applications"
