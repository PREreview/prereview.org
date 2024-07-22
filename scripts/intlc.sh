#!/usr/bin/env bash

modules=$(find "locales/en-US" -name "*.json" -exec basename "{}" .json \;)

compile_module() {
  module="$1"

  directory="src/locales"
  mkdir -p "$directory"

  intlc compile "locales/en-US/$module.json" -l "en-US" > "$directory/$module.ts"
}

for module in $modules; do compile_module "$module" & done

wait
