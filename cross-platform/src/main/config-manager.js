import fs from 'node:fs';
import path from 'node:path';

const START = '# >>> AIUsage managed block >>>';
const END = '# <<< AIUsage managed block <<<';

function ensureParent(file) { fs.mkdirSync(path.dirname(file), { recursive: true }); }
function backup(file) {
  const bak = `${file}.aiusage.bak`; ensureParent(file);
  if (fs.existsSync(file) && !fs.existsSync(bak)) fs.copyFileSync(file, bak);
  return bak;
}
function atomicWrite(file, content) {
  ensureParent(file); const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, content, { mode: 0o600 }); fs.renameSync(tmp, file);
}
function restore(file) {
  const bak = `${file}.aiusage.bak`;
  if (!fs.existsSync(bak)) return false;
  fs.copyFileSync(bak, file); fs.unlinkSync(bak); return true;
}
function stripManagedToml(text) {
  const start = text.indexOf(START); const end = text.indexOf(END);
  if (start < 0 || end < start) return text.trimEnd();
  return `${text.slice(0, start)}${text.slice(end + END.length)}`.trimEnd();
}

export class ConfigManager {
  constructor(paths, getPort) { this.paths = paths; this.getPort = getPort; }
  activate(target) {
    const port = this.getPort();
    if (target === 'codex') {
      backup(this.paths.codexConfig);
      const old = fs.existsSync(this.paths.codexConfig) ? fs.readFileSync(this.paths.codexConfig, 'utf8') : '';
      const block = `${START}\nmodel_provider = "aiusage"\n\n[model_providers.aiusage]\nname = "AIUsage local proxy"\nbase_url = "http://127.0.0.1:${port}/v1"\nwire_api = "responses"\nrequires_openai_auth = false\n${END}\n`;
      atomicWrite(this.paths.codexConfig, `${stripManagedToml(old)}\n\n${block}`.trimStart());
    } else if (target === 'claude') {
      backup(this.paths.claudeSettings);
      const data = fs.existsSync(this.paths.claudeSettings) ? JSON.parse(fs.readFileSync(this.paths.claudeSettings, 'utf8')) : {};
      data.env = { ...(data.env || {}), ANTHROPIC_BASE_URL: `http://127.0.0.1:${port}`, ANTHROPIC_API_KEY: 'aiusage-local' };
      data.__aiusage_cross_platform = true; atomicWrite(this.paths.claudeSettings, `${JSON.stringify(data, null, 2)}\n`);
    } else if (target === 'opencode') {
      backup(this.paths.openCodeConfig);
      const data = fs.existsSync(this.paths.openCodeConfig) ? JSON.parse(fs.readFileSync(this.paths.openCodeConfig, 'utf8')) : {};
      data.provider = { ...(data.provider || {}), aiusage: { npm: '@ai-sdk/openai-compatible', name: 'AIUsage', options: { baseURL: `http://127.0.0.1:${port}/v1`, apiKey: 'aiusage-local' } } };
      data.__aiusage_cross_platform = true; atomicWrite(this.paths.openCodeConfig, `${JSON.stringify(data, null, 2)}\n`);
    } else throw new Error('Unsupported target');
    return { target, active: true };
  }
  deactivate(target) {
    const file = target === 'codex' ? this.paths.codexConfig : target === 'claude' ? this.paths.claudeSettings : this.paths.openCodeConfig;
    const restored = restore(file);
    return { target, active: false, restored };
  }
  status() {
    return Object.fromEntries([
      ['codex', this.paths.codexConfig], ['claude', this.paths.claudeSettings], ['opencode', this.paths.openCodeConfig]
    ].map(([key, file]) => [key, fs.existsSync(`${file}.aiusage.bak`)]));
  }
}
