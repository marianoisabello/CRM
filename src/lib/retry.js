const logger = require('./logger');

/**
 * Envuelve una función async con reintentos y backoff exponencial.
 * @param {Function} fn - Función async a ejecutar
 * @param {Object} options
 * @param {number} options.retries - Cantidad de reintentos (default: 3)
 * @param {string} options.context - Nombre del contexto para logging
 */
async function withRetry(fn, { retries = 3, context = 'unknown' } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const retriesLeft = retries - attempt + 1;
      if (retriesLeft <= 0) break;
      const delay = Math.min(500 * Math.pow(2, attempt - 1), 5000);
      logger.warn({ msg: 'Reintento fallido', context, attempt, retriesLeft, error: err.message });
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw lastError;
}

module.exports = { withRetry };
