# Contributing to Japa Gateway

Thank you for your interest in contributing to Japa Gateway! This document provides guidelines and instructions for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Issue Reporting](#issue-reporting)
- [Feature Requests](#feature-requests)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read and understand it before contributing.

In short: be respectful, inclusive, and considerate to others. Harassment or any form of disrespectful behavior will not be tolerated.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (version 1.0.0 or higher)
- Git

### Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/japa-gateway.git
   cd japa-gateway
   ```
3. Add the original repository as a remote:
   ```bash
   git remote add upstream https://github.com/original-owner/japa-gateway.git
   ```
4. Install dependencies:
   ```bash
   bun install
   ```

## Development Workflow

1. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-you-are-fixing
   ```

2. Make your changes and commit them with a descriptive message:
   ```bash
   git commit -m "Add feature: description of your changes"
   ```

3. Keep your branch updated with the main branch:
   ```bash
   git pull upstream main
   ```

4. Run tests to ensure your changes don't break existing functionality:
   ```bash
   bun test
   ```

5. Push your changes to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

6. Create a Pull Request from your fork to the main repository.

## Pull Request Process

1. Ensure your code follows the project's coding standards.
2. Update documentation if necessary.
3. Add tests for new functionality.
4. Ensure all tests pass.
5. Fill out the pull request template completely.
6. Request a review from maintainers.
7. Address any feedback from reviewers.

## Coding Standards

This project follows these coding standards:

- Use TypeScript for all code
- Follow the [ESLint](https://eslint.org/) configuration
- Format code using [Prettier](https://prettier.io/)
- Use meaningful variable and function names
- Write descriptive comments for complex logic
- Include JSDoc comments for public APIs

You can check your code against our standards by running:
```bash
bun run lint
bun run format
```

## Testing

All new features and bug fixes should include tests. This project uses Bun's built-in test runner.

- Write unit tests for individual components
- Write integration tests for component interactions
- Write end-to-end tests for complete workflows

Run tests with:
```bash
bun test
```

## Documentation

Documentation is crucial for this project. Please follow these guidelines:

- Update README.md if you change user-facing functionality
- Update API documentation with JSDoc comments
- Add examples for new features
- Document configuration options

Generate API documentation with:
```bash
bun run docs
```

## Issue Reporting

When reporting issues, please use the issue template and include:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Environment information (OS, Bun version, etc.)
- Screenshots or logs if applicable

## Feature Requests

Feature requests are welcome! Please use the feature request template and include:

- A clear, descriptive title
- A detailed description of the proposed feature
- Use cases for the feature
- Any alternatives you've considered
- Whether you're willing to help implement it

---

Thank you for contributing to Japa Gateway! Your efforts help make this project better for everyone.
