#!/usr/bin/env bash
set -euo pipefail

IMAGE="styliteag/nfon-call-monitor"
TAG="${1:-latest}"

# Resolve repo root (parent of docker/)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Ensure a multi-platform builder exists
if ! docker buildx inspect multiarch >/dev/null 2>&1; then
  echo "Creating multi-platform builder..."
  docker buildx create --name multiarch --use
else
  docker buildx use multiarch
fi

echo "Building ${IMAGE}:${TAG} for linux/amd64 + linux/arm64..."
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t "${IMAGE}:${TAG}" \
  -f "$REPO_ROOT/docker/Dockerfile" \
  --push \
  "$REPO_ROOT"

echo "Pushed ${IMAGE}:${TAG}"
