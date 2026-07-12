import fs from 'node:fs';
import path from 'node:path';

function walk(dir, output = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return output; }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, output);
    else if (entry.name.endsWith('.jsonl')) output.push(full);
  }
  return output;
}

function number(value) { return Number.isFinite(Number(value)) ? Number(value) : 0; }

export function extractUsage(record) {
  const payload = record?.payload || record;
  const usage = payload?.info?.total_token_usage || payload?.total_token_usage || payload?.usage;
  if (!usage) return null;
  return {
    input: number(usage.input_tokens ?? usage.input),
    cached: number(usage.cached_input_tokens ?? usage.cache_read_input_tokens ?? usage.cached),
    output: number(usage.output_tokens ?? usage.output),
    reasoning: number(usage.reasoning_output_tokens ?? usage.reasoning)
  };
}

function dateOf(record, file) {
  const raw = record.timestamp || record.created_at || record.time;
  const date = raw ? new Date(raw) : new Date(fs.statSync(file).mtimeMs);
  return Number.isNaN(date.valueOf()) ? 'unknown' : date.toISOString().slice(0, 10);
}

export function scanCodexUsage(roots) {
  const daily = new Map();
  let files = 0;
  for (const file of roots.flatMap(root => walk(root))) {
    files += 1;
    let best = null; let bestDate = null;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const record = JSON.parse(line); const usage = extractUsage(record);
        if (usage && (!best || usage.input + usage.output >= best.input + best.output)) {
          best = usage; bestDate = dateOf(record, file);
        }
      } catch { /* tolerate incomplete session lines */ }
    }
    if (best) {
      const current = daily.get(bestDate) || { date: bestDate, input: 0, cached: 0, output: 0, reasoning: 0, sessions: 0 };
      for (const key of ['input', 'cached', 'output', 'reasoning']) current[key] += best[key];
      current.sessions += 1; daily.set(bestDate, current);
    }
  }
  const days = [...daily.values()].sort((a, b) => a.date.localeCompare(b.date));
  const totals = days.reduce((a, d) => ({
    input: a.input + d.input, cached: a.cached + d.cached, output: a.output + d.output,
    reasoning: a.reasoning + d.reasoning, sessions: a.sessions + d.sessions
  }), { input: 0, cached: 0, output: 0, reasoning: 0, sessions: 0 });
  return { files, days, totals };
}
