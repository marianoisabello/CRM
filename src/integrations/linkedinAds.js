'use strict';

/**
 * LinkedIn Ads — stub lectura. Export alineado con performance.js.
 */
const config = require('../config');
const logger = require('../lib/logger');

async function getCampaignPerformance(since, until) {
  if (!config.linkedinAds.accessToken || !config.linkedinAds.accountId) {
    throw new Error('LINKEDIN_ADS_* no configuradas');
  }
  logger.warn({ msg: 'LinkedIn Ads live stub — sin filas aún', since, until });
  return [];
}

module.exports = { getCampaignPerformance };
