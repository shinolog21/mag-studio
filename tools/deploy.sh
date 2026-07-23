#!/bin/bash
# GitHub Pagesへのデプロイ: ビルドしてdistをgh-pagesブランチとしてforce pushする。
# 使い方: GH_TOKEN=<token> bash tools/deploy.sh
# (このMacには永続認証がないため、トークンはデバイスフローで都度取得する。README参照)
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -z "${GH_TOKEN:-}" ]; then
  echo "GH_TOKEN が未設定です。デバイスフローでトークンを取得してから実行してください。" >&2
  exit 1
fi

npm run build

cd dist
rm -rf .git
git init -q -b gh-pages
git -c user.name=shino -c user.email=shino.log21@gmail.com add -A
git -c user.name=shino -c user.email=shino.log21@gmail.com commit -q -m "deploy $(date '+%Y-%m-%d %H:%M')"
git push -f "https://x-access-token:${GH_TOKEN}@github.com/shinolog21/mag-studio.git" gh-pages
rm -rf .git
echo "deployed: https://shinolog21.github.io/mag-studio/"
