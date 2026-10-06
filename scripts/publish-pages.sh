#!/usr/bin/env bash
# Operator-run: make derio-net/the-typist public, enable GitHub Pages (build_type=workflow) and trigger a deploy.
# Idempotent: skips what is already done. Asks for a typed "yes" before changing visibility.
set -euo pipefail

REPO="derio-net/the-typist"

if ! gh auth status >/dev/null 2>&1; then
  echo "gh is not authenticated; run 'gh auth login' first." >&2
  exit 1
fi

visibility="$(gh repo view "$REPO" --json visibility --jq .visibility | tr '[:upper:]' '[:lower:]')"
echo "Current visibility of $REPO: $visibility"

if [ "$visibility" != "public" ]; then
  if [ ! -t 0 ]; then
    echo "Refusing to change visibility without an interactive terminal (stdin is not a TTY)." >&2
    exit 1
  fi
  read -r -p "Make $REPO public? This exposes the whole history. Type 'yes' to continue: " answer
  if [ "$answer" != "yes" ]; then
    echo "Aborted; nothing changed." >&2
    exit 1
  fi
  gh repo edit "$REPO" --visibility public --accept-visibility-change-consequences
else
  echo "Already public; skipping the visibility change."
fi

# 404 means Pages is not enabled yet; any other error is a real failure.
if out="$(gh api "repos/$REPO/pages" 2>&1)"; then
  echo "Pages exists; setting build_type=workflow."
  gh api -X PUT "repos/$REPO/pages" -f build_type=workflow
elif printf '%s' "$out" | grep -q "404"; then
  echo "Enabling Pages."
  gh api -X POST "repos/$REPO/pages" -f build_type=workflow
else
  echo "Could not read the Pages configuration:" >&2
  echo "$out" >&2
  exit 1
fi

# The workflow only exists on main once the branch is merged; trigger a deploy if it is there.
if gh api "repos/$REPO/contents/.github/workflows/pages.yml?ref=main" >/dev/null 2>&1; then
  echo "Triggering the pages workflow."
  gh workflow run pages.yml --repo "$REPO" --ref main
else
  echo "pages.yml is not on main yet; the site deploys on the next push to main."
fi

echo "Verification:"
gh api "repos/$REPO" --jq '"visibility: " + .visibility'
gh api "repos/$REPO/pages" --jq '"build_type: " + .build_type + "\nstatus: " + (.status // "none") + "\nhtml_url: " + .html_url'
