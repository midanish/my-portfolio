// Gives Node scripts access to Workers AI using the Wrangler login on this PC
// (`npx wrangler login`), so no long-lived API token has to be stored in a file.
// CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN in the environment take priority.
import { execSync } from 'node:child_process';

function wrangler(args) {
  return execSync(`npx wrangler ${args}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

export function cloudflareEnv(env = process.env) {
  const out = { ...env };
  if (!out.CLOUDFLARE_API_TOKEN) {
    const lines = wrangler('auth token').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const token = lines.reverse().find(l => /^[A-Za-z0-9._~+/=-]{20,}$/.test(l));
    if (!token) throw new Error('Could not read a Cloudflare token. Run `npx wrangler login` first.');
    out.CLOUDFLARE_API_TOKEN = token;
  }
  if (!out.CLOUDFLARE_ACCOUNT_ID) {
    const ids = [...new Set(wrangler('whoami').match(/\b[0-9a-f]{32}\b/g) || [])];
    if (ids.length !== 1) {
      throw new Error(`Found ${ids.length} Cloudflare accounts; set CLOUDFLARE_ACCOUNT_ID in .env to the one that hosts the portfolio.`);
    }
    out.CLOUDFLARE_ACCOUNT_ID = ids[0];
  }
  return out;
}
