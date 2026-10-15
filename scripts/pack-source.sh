#!/usr/bin/env bash
# npm run pack:source → dist-source/double-story-source.zip: the story's editable source, laid out to
# drop into an Astro project (src/lib/double-story/ + src/components/DoubleStory.astro).
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=dist-source
PKG=$OUT/double-story-source
rm -rf "$OUT"
mkdir -p "$PKG/src/lib" "$PKG/src/components" "$PKG/scripts"
LIB=$PKG/src/lib/double-story
cp -r src "$LIB"
# not part of the story: the pixel-character page, the demo page entry and its chrome
rm -rf "$LIB/characters" "$LIB/index.ts" "$LIB/env.d.ts" "$LIB/styles/characters.css" "$LIB/styles/demo-page.css"
# brand tokens live on the section only (the demo page also put them on :root)
sed -i 's/^#double-story, :root {/#double-story {/' "$LIB/styles/tokens.css"
grep -q '^#double-story {' "$LIB/styles/tokens.css"
# the ?debug panel is available in `astro dev` only
sed -i 's/__DOUBLE_DEBUG__ \&\& flags.debug/import.meta.env.DEV \&\& flags.debug/; s|// the website build compiles the panel out (__DOUBLE_DEBUG__ = false), so ?debug does nothing there|// ?debug panel: dev server only|' "$LIB/story/boot.ts"
! grep -rq __DOUBLE_DEBUG__ "$LIB"
cp scripts/pack/DoubleStory.astro "$PKG/src/components/"
cp scripts/pack/README.md "$PKG/"
sed 's#src/overlay/icons.ts#src/lib/double-story/overlay/icons.ts#g' scripts/build-icons.ts > "$PKG/scripts/build-icons.ts"
cp -r reference "$PKG/reference"
rm -f "$PKG"/reference/{her-ref.png,him-ref.webp,cast-render.png,duo-poster.webp,duo-stage.webp}
(cd "$OUT" && zip -qr double-story-source.zip double-story-source)
echo "$OUT/double-story-source.zip  $(du -h "$OUT/double-story-source.zip" | cut -f1)"
