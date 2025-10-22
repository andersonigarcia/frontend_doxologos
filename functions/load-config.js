// Simple loader to read config/local.env for local development
import fs from 'fs';
import path from 'path';

export function loadLocalEnv() {
  try {
    const root = path.resolve(process.cwd());
    const cfgPath = path.join(root, 'config', 'local.env');
    if (!fs.existsSync(cfgPath)) return;
    const contents = fs.readFileSync(cfgPath, 'utf8');
    contents.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx === -1) return;
      const key = trimmed.slice(0, idx);
      const val = trimmed.slice(idx + 1);
      if (!process.env[key]) process.env[key] = val;
    });
  } catch (e) {
    // ignore
  }
}
