#!/usr/bin/env bash
set -euo pipefail

IMAGE="styliteag/nfon-call-monitor"

# Resolve repo root (parent of docker/)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Read version from VERSION file
VERSION=$(cat "$REPO_ROOT/VERSION" | tr -d '\n\r ')
TAG="${1:-$VERSION}"

# Ensure a multi-platform builder exists
if ! docker buildx inspect multiarch >/dev/null 2>&1; then
  echo "Creating multi-platform builder..."
  docker buildx create --name multiarch --use
else
  docker buildx use multiarch
fi

echo "Building ${IMAGE}:${TAG} (version ${VERSION}) for linux/amd64 + linux/arm64..."
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t "${IMAGE}:${TAG}" \
  -t "${IMAGE}:latest" \
  --build-arg VERSION="${VERSION}" \
  -f "$REPO_ROOT/docker/Dockerfile" \
  --push \
  "$REPO_ROOT"

echo "Pushed ${IMAGE}:${TAG} and ${IMAGE}:latest"
