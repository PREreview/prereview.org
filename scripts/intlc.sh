#!/usr/bin/env bash

modules=$(find "locales/en-US" -name "*.json" -exec basename "{}" .json \;)
declare -a targets=("assets" "src")

compile_module() {
  module="$1"

  for target in "${targets[@]}"; do
    directory="${target}/locales"
    mkdir -p "$directory"

    intlc compile "locales/en-US/$module.json" -l "en-US" > "$directory/$module.ts"
  done
}

for module in $modules; do compile_module "$module" & done

wait
