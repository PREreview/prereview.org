#!/usr/bin/env bash
# Runs the app alongside a local Redis replica of the HTTP cache. Redis is
# stopped only once the app has exited, so the app can use it while shutting
# down. If either process exits, the other is stopped too.

read -r primary_host primary_port <<<"$(node /app/dist/print-http-cache-redis-hostname-and-port.js)"

./redis-server --save "" --dir "/app/data" --replicaof "$primary_host" "$primary_port" &
redis=$!

node /app/dist/index.js &
app=$!

stopping=false
stop_app() {
  if [ "$stopping" = false ]; then
    stopping=true
    kill -TERM "$app" 2>/dev/null
  fi
}
trap stop_app INT TERM

# `wait` returns early when a signal is trapped, so keep waiting until a process exits
wait_for() {
  exited=
  while [ -z "${exited:-}" ]; do
    wait -n -p exited "$@"
    status=$?
  done
}

wait_for "$app" "$redis"

if [ "$exited" = "$redis" ]; then
  echo "Redis exited unexpectedly, stopping the app" >&2
  stop_app
  wait_for "$app"
  exit 1
fi

kill -TERM "$redis" 2>/dev/null
wait "$redis"

exit "$status"
