# Cross-platform port status

The `cross-platform/` directory is an experimental Windows/Linux client. It is intentionally separate from the production SwiftUI target so macOS releases remain unaffected.

## Why this is a rewrite rather than a new Xcode target

The production app has roughly 89,000 lines of Swift and directly depends on SwiftUI, AppKit, Security/Keychain, Network.framework, WebKit, ServiceManagement, macOS browser storage, and Xcode signing. `QuotaBackend/Package.swift` also explicitly targets macOS 14. SwiftUI has no Windows or Linux desktop runtime, so installer settings alone cannot make the existing app portable.

## v0.1 boundary

The first cross-platform slice implements functionality whose inputs and outputs are portable:

| Area | Status |
| --- | --- |
| Codex JSONL token totals | Implemented |
| API node storage and hot switching | Implemented |
| OpenAI-compatible streaming passthrough | Implemented |
| Codex / Claude Code / OpenCode config activation | Implemented |
| Backup and rollback | Implemented |
| Tray and Windows/Linux packaging workflow | Implemented |
| Subscription quota APIs | Planned |
| Browser-cookie discovery | Planned per OS/browser |
| OpenCode SQLite usage ledger | Planned |
| Full Claude-to-OpenAI canonical conversion | Planned; reuse protocol fixtures |
| Claude Science | Out of scope until its desktop/runtime dependencies are portable |

## Recommended next increments

1. Port pure provider HTTP clients and their normalizers with captured fixtures.
2. Add SQLite reading for OpenCode usage without mutating its database.
3. Port the canonical Claude/OpenAI conversion suite, keeping golden fixture parity with `QuotaBackendTests`.
4. Add Windows Credential Manager and Linux Secret Service diagnostics around Electron safe storage.
5. Add signed releases after the MVP has been exercised against real Windows and Linux home directories.

## Build

Run `npm ci && npm test && npm run dist` from `cross-platform/`, or dispatch `.github/workflows/cross-platform.yml` on a fork/branch where Actions is enabled.
