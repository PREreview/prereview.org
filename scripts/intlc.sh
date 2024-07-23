#!/usr/bin/env bash

. "$(which mo)"

defaultLocale="en-US"
modules=$(find "locales/$defaultLocale" -name "*.json" -exec basename "{}" .json \;)
declare -a targets=("assets" "src")
mapfile -t locales < <(find "locales" -maxdepth 1 -mindepth 1 -type d -exec basename "{}" \;)

compile_module() {
  module="$1"

  for target in "${targets[@]}"; do
    for locale in "${locales[@]}"; do
      localeFile="locales/$locale/$module.json"
      directory="${target}/locales/$module"
      mkdir -p "$directory"

      if [ -f "$localeFile" ]; then
        intlc compile "$localeFile" -l "$locale" > "$directory/$locale.ts"
      else
        echo "export {}" > "$directory/$locale.ts"
      fi
    done

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
