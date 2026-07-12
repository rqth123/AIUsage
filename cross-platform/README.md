# AIUsage Cross-platform (experimental)

This is an independent Electron port for Windows 10/11 and mainstream x64 Linux distributions. It leaves the original macOS SwiftUI application untouched.

## Implemented in v0.1

- Local Codex session token scan and daily activity dashboard
- API provider/node CRUD; API keys are encrypted with Electron `safeStorage` when the OS supports it
- Local OpenAI-compatible forwarding proxy with live upstream switching
- Transactional activation/deactivation for Codex, Claude Code and OpenCode configuration files
- Backup-before-write, managed markers, rollback on failure, and system tray controls
- Windows and Linux installers built by GitHub Actions

This is an MVP, not feature parity with the macOS application. Browser-cookie quota discovery, Claude Science, Keychain migration, and the full provider catalog remain macOS-only for now.

## Develop

```bash
npm install
npm test
npm start
```

## Build installers

```bash
npm run dist
```

Windows installers should be built on Windows and Linux installers on Linux. The repository workflow does both.

## Safety

Activation always creates a `.aiusage.bak` backup when no backup exists. Deactivation restores that backup. The app binds its local proxy to `127.0.0.1` only. Do not expose the port to a public network.

## License

Apache-2.0, matching the upstream project.
