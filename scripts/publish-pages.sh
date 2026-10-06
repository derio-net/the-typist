#!/usr/bin/env bash
# Operator-run: make derio-net/the-typist public and enable GitHub Pages (build_type=workflow).
# Idempotent: skips what is already done. Asks for a typed "yes" before changing visibility.
set -euo pipefail

REPO="derio-net/the-typist"

visibility="$(gh repo view "$REPO" --json visibility --jq .visibility | tr '[:upper:]' '[:lower:]')"
echo "Current visibility of $REPO: $visibility"

if [ "$visibility" != "public" ]; then
  read -r -p "Make $REPO public? This exposes the whole history. Type 'yes' to continue: " answer
  if [ "$answer" != "yes" ]; then
    echo "Aborted; nothing changed." >&2
    exit 1
  fi
  gh repo edit "$REPO" --visibility public --accept-visibility-change-consequences
else
  echo "Already public; skipping the visibility change."
fi

if gh api "repos/$REPO/pages" >/dev/null 2>&1; then
  echo "Pages exists; setting build_type=workflow."
  gh api -X PUT "repos/$REPO/pages" -f build_type=workflow
else
  echo "Enabling Pages."
  gh api -X POST "repos/$REPO/pages" -f build_type=workflow
fi

echo "Verification:"
gh api "repos/$REPO/pages" --jq .html_url
