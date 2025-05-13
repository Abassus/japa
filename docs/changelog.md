# Changelog

All notable changes to Japa Gateway will be documented in this file.

## [Unreleased]

### Added
- Environment variable support with default values using `${VAR_NAME:-default}` syntax
- Comprehensive documentation site using MkDocs and Material theme
- Docker deployment with optimized multi-stage build
- Kubernetes deployment manifests and guides

### Changed
- Improved configuration loading process to prioritize environment variables

### Fixed
- TypeScript lint errors in auth-plugin tests

## [0.1.0] - 2025-05-01

### Added
- Initial release of Japa Gateway
- Core gateway engine with request routing and proxying
- Plugin system for extensibility
- Authentication plugin with JWT and API key support
- Rate limiting plugin
- Circuit breaking for resilience
- CORS support
- Observability with logging, metrics, and tracing
- Configuration via YAML files
- Comprehensive test suite
