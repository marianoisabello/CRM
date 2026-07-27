'use strict';

/**
 * TikTok Ads — stub lectura. Export alineado con performance.js.
 */
const config = require('../config');
const logger = require('../lib/logger');

async function getCampaignPerformance(since, until) {
  if (!config.tiktokAds.accessToken || !config.tiktokAds.advertiserId) {
    throw new Error('TIKTOK_ADS_* no configuradas');
  }
  logger.warn({ msg: 'TikTok Ads live stub — sin filas aún', since, until });
  return [];
}

module.exports = { getCampaignPerformance };
