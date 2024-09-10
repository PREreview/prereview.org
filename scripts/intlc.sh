#!/usr/bin/env bash
set -e

. "$(which mo)"

defaultLocale="en-US"
modules=$(find "locales/$defaultLocale" -name "*.json" -exec basename "{}" .json \;)
assetsModules=("collapsible-menu" "html-editor" "single-use-form")
mapfile -t srcModules < <(printf "%s\n" "${modules[@]}" "${assetsModules[@]}" "${assetsModules[@]}" | sort | uniq -u)
mapfile -t locales < <(find "locales" -maxdepth 1 -mindepth 1 -type d -exec basename "{}" \;)

compile_module() {
  target="$1"
  module="$2"

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
}

for module in "${assetsModules[@]}"; do compile_module "assets" "$module" & done
for module in "${srcModules[@]}"; do compile_module "src" "$module" & done

compile_target() {
  target="$1"
  modules="$2"

  mkdir -p "$target/locales"

  declare -A moduleNames

  for module in $modules; do
    moduleName=$(echo "$module" | sed -r 's/(^|[-_ ]+)([0-9a-z])/\U\2/g')
    moduleNames[$moduleName]=$module
  done

  mo .dev/locale-index.ts.mustache > "$target/locales/index.ts"
}

compile_target "assets" "${assetsModules[*]}" &
compile_target "src" "${srcModules[*]}" &

wait
