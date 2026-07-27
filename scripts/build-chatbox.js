'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const chatbotDir = path.join(root, 'lead-scoring-chatbot');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === '') {
      process.env[key] = val;
    }
  }
}

// Prefer pulled CRM env, then chatbot local env
loadEnvFile(path.join(root, '.env.pulled'));
loadEnvFile(path.join(root, '.env.local'));
loadEnvFile(path.join(chatbotDir, '.env.local'));
loadEnvFile(path.join(chatbotDir, '.env'));

if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY for chatbox build');
  process.exit(1);
}

process.env.CHATBOX_BASE = process.env.CHATBOX_BASE || '/chatbox/';
process.env.CHATBOX_OUT = process.env.CHATBOX_OUT || '../public/chatbox';

console.log(`Building chatbox → public/chatbox (base=${process.env.CHATBOX_BASE})`);
execSync('npm install', { cwd: chatbotDir, stdio: 'inherit' });
execSync('npm run build', {
  cwd: chatbotDir,
  stdio: 'inherit',
  env: process.env,
});
console.log('Chatbox build complete');
