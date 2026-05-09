# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-05-09

### Added

- OpenAI STS–parity tool wiring: `loadTools` from `avr_tools/` and `tools/`, server-side `client_tool_invocation` / `data_connection_tool_invocation` handling, and Ultravox tool result envelopes.

### Changed

- AMI HTTP calls use configurable `AMI_REQUEST_TIMEOUT_MS`; tool execution is bounded by `AVR_TOOL_EXECUTION_TIMEOUT_MS` with consistent `implementation-error` paths to Ultravox.

### Fixed

- Path traversal resistance: only alphanumeric, underscore, and hyphen tool basenames are accepted for disk-backed handlers.
- `promiseWithTimeout` clears the race timer on completion or failure to avoid dangling timeouts under load.

### Packaging

- Dockerfile copies `tools/`; `loadTools` loads `*.js` from both tool directories.
