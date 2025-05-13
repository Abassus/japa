#!/bin/bash

# Script to build and optionally push the Japa Gateway Docker image

# Default values
IMAGE_NAME="japa-gateway"
IMAGE_TAG="latest"
PUSH=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --tag|-t)
      IMAGE_TAG="$2"
      shift 2
      ;;
    --push|-p)
      PUSH=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --tag, -t TAG     Specify the image tag (default: latest)"
      echo "  --push, -p        Push the image to the registry after building"
      echo "  --help, -h        Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Full image name with tag
FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"

echo "Building Docker image: ${FULL_IMAGE_NAME}"
docker build -t "${FULL_IMAGE_NAME}" .

# Check if build was successful
if [ $? -ne 0 ]; then
  echo "Error: Docker build failed"
  exit 1
fi

echo "Docker image built successfully: ${FULL_IMAGE_NAME}"

# Push the image if requested
if [ "$PUSH" = true ]; then
  echo "Pushing Docker image to registry..."
  docker push "${FULL_IMAGE_NAME}"
  
  if [ $? -ne 0 ]; then
    echo "Error: Failed to push Docker image"
    exit 1
  fi
  
  echo "Docker image pushed successfully: ${FULL_IMAGE_NAME}"
fi

echo ""
echo "To run the image locally:"
echo "docker run -p 8000:8000 ${FULL_IMAGE_NAME}"
echo ""
echo "To run with environment variables:"
echo "docker run -p 8000:8000 \\"
echo "  -e GATEWAY_PORT=8000 \\"
echo "  -e AUTH_METHOD=jwt \\"
echo "  -e JWT_SECRET=your-secret-key \\"
echo "  ${FULL_IMAGE_NAME}"
echo ""
echo "To run with a custom configuration file:"
echo "docker run -p 8000:8000 \\"
echo "  -v \$(pwd)/config/config.yaml:/app/config/config.yaml \\"
echo "  ${FULL_IMAGE_NAME}"
