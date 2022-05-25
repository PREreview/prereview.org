#!/usr/bin/env bash
set -e

if [ "$#" -ne 1 ]; then
  echo "Test that a container image sees a 'healthy' state"
  echo
  echo "Usage: $0 IMAGE"
  echo "Example: $0 sha256:fe8a5ea609e0f377bf4d6aa96f9dd9743caa7048a1c93c9632661f774e20f308"
  exit 1
fi

function finish() {
  echo "Stopping the container"
  docker stop "$container"
  echo "Logs from the container"
  docker logs "$container"
  echo "Removing the container"
  docker rm "$container"
}

trap finish EXIT

echo "Starting the container"
container=$(docker run --detach --env SECRET=something-secret --env ZENODO_API_KEY=not-a-real-token "$1")

timeout --foreground 20 bash << EOT
  while true; do
    current=\$(docker inspect "${container}" | jq --raw-output '.[0].State.Health.Status')
    echo "${container} is in state: \${current}"
    if [ "\$current" == "healthy" ]; then
      break
    fi
    sleep 1
  done
EOT
