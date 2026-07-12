import os from 'node:os';
import path from 'node:path';

export function resolvePaths(env = process.env, home = os.homedir()) {
  const configRoot = env.AIUSAGE_HOME || (process.platform === 'win32'
    ? path.join(env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'AIUsage')
    : path.join(env.XDG_CONFIG_HOME || path.join(home, '.config'), 'aiusage'));
  const codexHome = env.CODEX_HOME || path.join(home, '.codex');
  const claudeHome = env.CLAUDE_CONFIG_DIR || path.join(home, '.claude');
  const openCodeRoot = env.OPENCODE_CONFIG_DIR || (process.platform === 'win32'
    ? path.join(env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'opencode')
    : path.join(env.XDG_CONFIG_HOME || path.join(home, '.config'), 'opencode'));
  return {
    configRoot,
    appStore: path.join(configRoot, 'cross-platform.json'),
    codexHome,
    codexConfig: path.join(codexHome, 'config.toml'),
    claudeSettings: path.join(claudeHome, 'settings.json'),
    openCodeConfig: path.join(openCodeRoot, 'opencode.json'),
    codexSessionRoots: [path.join(codexHome, 'sessions'), path.join(codexHome, 'archived_sessions')]
  };
}
