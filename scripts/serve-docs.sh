#!/bin/bash

# Script to serve the Japa Gateway documentation locally

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is required but not installed. Please install Python 3 and try again."
    exit 1
fi

# Create a virtual environment if it doesn't exist
if [ ! -d "docs_venv" ]; then
    echo "Creating virtual environment for documentation..."
    python3 -m venv docs_venv
fi

# Activate the virtual environment
source docs_venv/bin/activate

# Install or upgrade dependencies
echo "Installing documentation dependencies..."
pip install --upgrade pip
pip install mkdocs mkdocs-material pillow cairosvg

# Serve the documentation
echo "Starting documentation server..."
mkdocs serve

# Deactivate the virtual environment when done
deactivate
