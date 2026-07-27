/**
 * LLM helper — Groq first (like Agente 02 n8n), Claude fallback.
 */
'use strict';

const config = require('../config');
const logger = require('../lib/logger');
const { withRetry } = require('../lib/retry');

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

async function callGroq({ systemPrompt, userMessage, maxTokens = 1200, context = 'unknown' }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY no configurada');

  return withRetry(
    async () => {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.2,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' },
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Groq ${res.status}: ${t.slice(0, 300)}`);
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || '';
      const tokensUsed =
        (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0);
      logger.info({ msg: 'Respuesta Groq', context, tokensUsed });
      return { text, tokensUsed, provider: 'groq' };
    },
    { retries: 2, context: `llm.groq.${context}` }
  );
}

async function callLlm({ systemPrompt, userMessage, maxTokens = 1200, context = 'unknown' }) {
  if (process.env.GROQ_API_KEY) {
    try {
      return await callGroq({ systemPrompt, userMessage, maxTokens, context });
    } catch (err) {
      logger.warn({ msg: 'Groq falló, intentando Claude', context, error: err.message });
    }
  }

  const { callClaude } = require('./ai');
  const result = await callClaude({ systemPrompt, userMessage, maxTokens, context });
  return { ...result, provider: 'claude' };
}

function parseJsonLoose(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    const m = String(text).match(/\{[\s\S]*\}/);
    if (!m) return {};
    try {
      return JSON.parse(m[0]);
    } catch {
      return {};
    }
  }
}

module.exports = { callLlm, callGroq, parseJsonLoose, GROQ_MODEL };
