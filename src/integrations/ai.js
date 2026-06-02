'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');
const logger = require('../lib/logger');
const { withRetry } = require('../lib/retry');

let _client = null;

function getClient() {
  if (!_client) {
    if (!config.ai.anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY no configurada');
    }
    _client = new Anthropic({ apiKey: config.ai.anthropicApiKey });
  }
  return _client;
}

/**
 * Llama a la API de Claude con reintentos y logging de tokens.
 * @param {Object} params
 * @param {string} params.systemPrompt
 * @param {string} params.userMessage
 * @param {string} [params.model]
 * @param {number} [params.maxTokens]
 * @param {string} [params.context] - para logging
 * @returns {{ text: string, tokensUsed: number }}
 */
async function callClaude({ systemPrompt, userMessage, model, maxTokens = 1024, context = 'unknown' }) {
  const client = getClient();
  const resolvedModel = model || config.ai.defaultModel;

  return withRetry(
    async () => {
      logger.debug({ msg: 'Llamando a Claude', context, model: resolvedModel });

      const response = await client.messages.create({
        model: resolvedModel,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });

      const text = response.content[0]?.text || '';
      const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

      logger.info({ msg: 'Respuesta de Claude recibida', context, tokensUsed });
      return { text, tokensUsed };
    },
    { retries: 3, context: `ai.callClaude.${context}` }
  );
}

module.exports = { callClaude };
