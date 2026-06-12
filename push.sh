#!/bin/bash
# Wipes the remote repo history and replaces it entirely with this project's content.
set -e

REPO_URL="https://github.com/HMaynul1/CredVault.git"

cd "$(dirname "$0")"

rm -rf .git
git init
git add .
git -c user.email="you@example.com" -c user.name="HMaynul1" commit -m "Clean CrdxCube vault - replaces previous repo content"
git branch -M main
git remote add origin "$REPO_URL"
git push -u origin main --force

echo "Done. $REPO_URL main branch now contains only this project's files."
