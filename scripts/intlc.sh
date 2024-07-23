#!/usr/bin/env bash

. "$(which mo)"

defaultLocale="en-US"
modules=$(find "locales/$defaultLocale" -name "*.json" -exec basename "{}" .json \;)
declare -a targets=("assets" "src")

compile_module() {
  module="$1"

  for target in "${targets[@]}"; do
    directory="${target}/locales/$module"
    mkdir -p "$directory"

    intlc compile "locales/$defaultLocale/$module.json" -l "$defaultLocale" > "$directory/$defaultLocale.ts"

    moduleName=$(echo "$module" | sed -r 's/(^|[-_ ]+)([0-9a-z])/\U\2/g')
    mo .dev/locale-module.ts.mustache > "$target/locales/$module.ts"
  done
}

for module in $modules; do compile_module "$module" & done

compile_target() {
  target="$1"

  mkdir -p "$target/locales"

  mo .dev/locale-index.ts.mustache > "$target/locales/index.ts"
}

for target in "${targets[@]}"; do compile_target "$target" & done

wait
