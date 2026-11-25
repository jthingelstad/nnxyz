#!/bin/zsh -l
set -eu
cd -- "${0:A:h}/../.."
export PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:$PATH"
export PUBLIC_TINYLYTICS_ENABLED=false
exec npm run dev -- --open --port 4387
