#!/bin/bash

# Run Example Service and Japa Gateway
# This script starts both the example service and the gateway

# Start the example service in the background
echo "Starting example service..."
PORT=3000 bun run examples/basic-service/index.ts &
EXAMPLE_PID=$!

# Wait for the service to start
sleep 2

# Start the gateway with the example configuration
echo "Starting Japa Gateway..."
CONFIG_PATH=examples/basic-service/config.yaml bun run src/index.ts

# Cleanup when the gateway exits
kill $EXAMPLE_PID
