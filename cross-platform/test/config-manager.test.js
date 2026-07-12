import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ConfigManager } from '../src/main/config-manager.js';

test('Codex activation backs up and deactivation restores exact content', () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'aiusage-config-')); const file=path.join(root,'config.toml');
  fs.writeFileSync(file,'model = "original"\n');
  const manager=new ConfigManager({codexConfig:file,claudeSettings:path.join(root,'claude.json'),openCodeConfig:path.join(root,'opencode.json')},()=>14580);
  manager.activate('codex'); assert.match(fs.readFileSync(file,'utf8'),/model_provider = "aiusage"/);
  manager.deactivate('codex'); assert.equal(fs.readFileSync(file,'utf8'),'model = "original"\n');
});
