# Changelog

All notable changes to this fork ([Root-IO-Labs/soketi](https://github.com/Root-IO-Labs/soketi), branch `1.x`) relative to upstream [soketi/soketi](https://github.com/soketi/soketi) are documented here.

## 1.6.1 — 2026-08-19

Security remediation and Node 24 / uWebSockets.js v20.69.0 compatibility.

### Changed

- **Version stamped as `1.6.1`** (was `0.0.0-dev`). Vulnerability scanners
  matched the dev version against advisories fixed long before 1.6.1,
  producing false positives against the shipped image.
- **uWebSockets.js `v20.10.0` → `v20.69.0`**. Required for Node 24
  (ABI 137); v20.10.0 has no Node 24 prebuilds and its addon sources do not
  compile against Node 24's V8 headers.
- **mysql2 `^3.5.2` → `^3.9.8`** (CVE-2024-21507 and related advisories).
- `package-lock.json` regenerated with Node 24 / npm 11.

### Added

- **npm `overrides`** for vulnerable transitive dependencies (all resolve
  from the public npm registry):
  - `axios` → `$axios` (dedupes prometheus-query's 0.26.1 to the root 0.27.2)
  - `ip` → `2.0.0` (CVE-2023-42282)
  - `msgpackr@1.7.2` → `1.10.1`
  - `semver@6.3.0` → `6.3.1`
  - `systeminformation@5.12.13` → `5.31.7`
- `typings/uwebsockets-augment.d.ts` — module augmentation restoring
  per-socket ad-hoc properties (`ws.app`, `ws.id`, `ws.sendJson`, …) that
  v20.69.0's stricter `WebSocket<UserData>` typings no longer allow
  implicitly.

### Fixed

- TypeScript sources updated for v20.69.0's generic `WebSocket<UserData>`
  type: `<any>` added at the 81 bare `WebSocket` type references. No runtime
  behavior change.

### Validation

- Upstream Jest suite (local adapter): 66/69 pass on Node 24; the two
  timeouts are a LocalStack-dependent Lambda webhook test and a pre-existing
  flaky presence test (identical fail/pass pattern on the pre-bump Node 18
  build), and the skip is the env-gated SQS batching test.

## Unversioned fork changes — 2026-07

FIPS 140-3 compatibility and crypto attack-surface reduction
(PRs [#1](https://github.com/Root-IO-Labs/soketi/pull/1),
[#2](https://github.com/Root-IO-Labs/soketi/pull/2),
[#3](https://github.com/Root-IO-Labs/soketi/pull/3)).

### Fixed

- **Pure-JS MD5 fallback for Pusher `body_md5`** when native MD5 is
  unavailable. Under FIPS enforcement OpenSSL rejects MD5, which crashed
  the server on every signed HTTP API request; the protocol-mandated
  checksum (integrity-only, not security-relevant) now falls back to a
  JS implementation.

### Removed

- **NATS adapter**, eliminating `tweetnacl`/`nkeys.js` — a pure-JS crypto
  implementation that is not FIPS-validatable — from the dependency tree
  and the shipped image.
- Transient vendoring of pusher's `Token`/`getMD5`/`toOrderedArray`
  (introduced in PR #2, reverted in PR #3 in favor of requiring
  `pusher/lib/token` directly once tweetnacl was gone).
