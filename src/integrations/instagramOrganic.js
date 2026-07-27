'use strict';

/**
 * Instagram organic — stub. Export: getOrganicInsights.
 */
const config = require('../config');
const logger = require('../lib/logger');

async function getOrganicInsights(since, until) {
  if (!config.instagramOrganic.graphToken || !config.instagramOrganic.businessAccountId) {
    throw new Error('INSTAGRAM_* no configuradas');
  }
  logger.warn({ msg: 'Instagram organic live stub — sin filas aún', since, until });
  return [];
}

module.exports = { getOrganicInsights };
