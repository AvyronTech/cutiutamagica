#!/usr/bin/env bash
set -euo pipefail

mode="${1:---local}"
if [[ "${mode}" != "--local" && "${mode}" != "--remote" ]]; then
  echo "Usage: $0 [--local|--remote]" >&2
  exit 2
fi

bucket="cutiuta-magica-media-local"
if [[ "${mode}" == "--remote" ]]; then
  bucket="cutiutamagica"
fi

upload() {
  local product_id="$1"
  local source="$2"
  local environment_args=()
  if [[ "${mode}" == "--remote" ]]; then
    environment_args=(--env production)
  fi
  npx wrangler r2 object put "${bucket}/products/${product_id}/images/01-hero.jpg" --file="${source}" --content-type="image/jpeg" --cache-control="public, max-age=3600" "${mode}" "${environment_args[@]}"
}

upload "product_lotr_rings" "src/assets/box-lotr-ring.jpg"
upload "product_hp_always" "src/assets/box-hp-always.jpg"
upload "product_hp_keeper" "src/assets/box-hp-keeper.jpg"
upload "product_halloween" "src/assets/box-halloween.jpg"
upload "product_fairy" "src/assets/box-fairy.jpg"
upload "product_pirates" "src/assets/box-pirates.jpg"
upload "product_starwars_dad" "src/assets/box-starwars-dad.jpg"
upload "product_kitten" "src/assets/box-kitten.jpg"
