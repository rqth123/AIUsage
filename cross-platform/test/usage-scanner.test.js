import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { extractUsage, scanCodexUsage } from '../src/main/usage-scanner.js';

test('extracts current Codex token_count shape', () => {
  assert.deepEqual(extractUsage({ payload: { info: { total_token_usage: { input_tokens: 12, cached_input_tokens: 4, output_tokens: 7, reasoning_output_tokens: 3 } } } }), { input: 12, cached: 4, output: 7, reasoning: 3 });
});

test('uses maximum cumulative usage per session file', () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'aiusage-'));
  fs.writeFileSync(path.join(root,'session.jsonl'),[
    JSON.stringify({timestamp:'2026-07-12T01:00:00Z',payload:{info:{total_token_usage:{input_tokens:10,output_tokens:5}}}}),
    JSON.stringify({timestamp:'2026-07-12T01:01:00Z',payload:{info:{total_token_usage:{input_tokens:30,output_tokens:9}}}})
  ].join('\n'));
  const result=scanCodexUsage([root]);
  assert.equal(result.totals.input,30); assert.equal(result.totals.output,9); assert.equal(result.totals.sessions,1);
});
