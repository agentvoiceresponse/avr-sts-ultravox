# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.1] - 2026-05-09

### Fixed

- Add `ULTRAVOX_JOIN_HTTP_TIMEOUT_MS` (default 60s) on the call-creation `POST` so a stalled Ultravox REST call no longer hangs the request indefinitely.
- Wrap Ultravox text-frame `JSON.parse` in `try/catch` to prevent unhandled promise rejections on malformed control messages.
- Guard `clientWs.send(...)` for tool-invocation fan-out via `sendClientJson` so the connector does not throw when the AVR client has dropped mid-tool.

### Documentation

- `.env.example` documents `ULTRAVOX_JOIN_HTTP_TIMEOUT_MS`.

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
