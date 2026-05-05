#!/usr/bin/env bash
# scripts/bump-version.sh <version>
# Rewrites the sigil version strings that appear in the landing + how pages.
#
# Example:
#   ./scripts/bump-version.sh 0.20.0
#   ./scripts/bump-version.sh v0.20.0
set -euo pipefail

VERSION="${1:?usage: bump-version.sh <version>}"
VERSION="${VERSION#v}"
MAJOR_MINOR="$(echo "$VERSION" | sed -E 's/^([0-9]+\.[0-9]+).*/\1/')"

# Nav brand-sub — "v0.4 · released" / "v0.4 · merge trust"
sed -i -E "s#v[0-9]+\.[0-9]+( · (released|merge trust))#v${MAJOR_MINOR}\1#g" \
  src/pages/index.astro \
  src/pages/how.astro

# sigil@X.Y.Z — footer seal span + prov-cell value.
# Strip any trailing " · build ..." because we don't have a build id to pin here.
sed -i -E "s#sigil@[0-9]+\.[0-9]+\.[0-9]+[^<]*#sigil@${VERSION}#g" \
  src/pages/index.astro \
  src/pages/how.astro

# Sigil mark build row on the landing page.
sed -i -E "s#(<dt>build</dt><dd>)[^<]+(</dd>)#\1${VERSION}\2#g" \
  src/pages/index.astro

echo "Bumped to v${VERSION} (nav reads v${MAJOR_MINOR})"
