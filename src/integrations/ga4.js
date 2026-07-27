'use strict';

/**
 * Google Analytics 4 — stub. Export: getOrganicMetrics.
 */
const config = require('../config');
const logger = require('../lib/logger');

async function getOrganicMetrics(since, until) {
  if (!config.ga4.propertyId || !(config.ga4.serviceAccountJson || config.ga4.accessToken)) {
    throw new Error('GA4_* no configuradas');
  }
  logger.warn({ msg: 'GA4 live stub — sin filas aún', since, until });
  return [];
}

module.exports = { getOrganicMetrics };
