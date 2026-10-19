#!/usr/bin/env bash
set -euo pipefail

CITY="${1:?usage: unpackFeed.sh <city>}"

rm -rf "./tmp/$CITY/feed"
mkdir -p "./tmp/$CITY/feed"
unzip -o "./sources/$CITY.gtfs.zip" -d "./tmp/$CITY/feed"

echo "Base feed for '$CITY' unpacked to ./tmp/$CITY/feed"
