#!/usr/bin/env bash
set -euo pipefail

. "$(which mo)"

defaultLocale="en-US"
crowdinInContextLocale="lol-US"
modules=$(find "locales/$defaultLocale" -name "*.json" -exec basename "{}" .json \;)
assetsModules=("html-editor" "single-use-form")
mapfile -t srcModules < <(printf "%s\n" "${modules[@]}" "${assetsModules[@]}" "${assetsModules[@]}" | sort | uniq -u)
mapfile -t locales < <(find "locales" -maxdepth 1 -mindepth 1 -type d -exec basename "{}" \;)
realLocales=()
for locale in "${locales[@]}"; do
  if [ "$locale" = "$crowdinInContextLocale" ]; then
    continue
  fi
  realLocales+=("$locale")
done

declare -A languages

languages['en']='en-US'
languages['es']='es-419'
languages['pt']='pt-BR'

compile_module() {
  target="$1"
  module="$2"

  echo "Compiling locale module $module in target $target"

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

#############################
# Compile modules in parallel
declare -a pids
max_jobs=$(nproc)

queue_compile_module() {
  local target="$1"
  local module="$2"

  while [ "$(jobs -pr | wc -l)" -ge "$max_jobs" ]; do
    sleep 0.1
  done

  compile_module "$target" "$module" &
  pids+=($!)
}

for module in "${assetsModules[@]}"; do
  queue_compile_module "assets" "$module"
done
for module in "${srcModules[@]}"; do
  queue_compile_module "src" "$module"
done

for pid in "${pids[@]}"; do
  wait $pid || {
    wait
    exit 1
  }
done

#############################
# Compile targets

compile_target() {
  target="$1"
  modules="$2"

  echo "Compiling locale target $target"

  mkdir -p "$target/locales"

  declare -A moduleNames

  for module in $modules; do
    moduleName=$(echo "$module" | sed -r 's/(^|[-_ ]+)([0-9a-z])/\U\2/g')
    moduleNames[$moduleName]=$module
  done

  mo .dev/locale-index.ts.mustache > "$target/locales/index.ts"
}

compile_target "assets" "${assetsModules[*]}"
compile_target "src" "${srcModules[*]}"

wait
