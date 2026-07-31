'use strict';

/**
 * Side-effects CRM al cambiar status de un lead.
 * - qualified → contact + deal (prospeccion) + activity
 * - won → contact + deal ganado + client + activity
 */

const { createContactFromLead } = require('../db/contacts');
const { createClientFromLead } = require('../db/clients');
const { updateDealStage } = require('../db/deals');
const { createActivity } = require('../db/activities');
const logger = require('../lib/logger');

async function onLeadStatusChange(lead, status, { ownerId = null } = {}) {
  if (!lead?.id) return { conversion: null };

  if (status !== 'qualified' && status !== 'won') {
    return { conversion: null };
  }

  try {
    const conversion = await createContactFromLead(lead.id, {
      createDeal: true,
      owner_id: ownerId,
    });

    const companyId =
      conversion.contact?.company_id ||
      conversion.company?.id ||
      lead.company_id ||
      null;
    const dealId = conversion.deal?.id || lead.converted_deal_id || null;
    const contactId = conversion.contact?.id || lead.converted_contact_id || null;

    let client = null;
    if (status === 'won') {
      if (dealId) {
        try {
          await updateDealStage(dealId, 'ganado');
        } catch (err) {
          logger.warn({ msg: 'No se pudo marcar deal ganado', dealId, error: err.message });
        }
      }
      client = await createClientFromLead(lead.id, {
        company: conversion.company?.name || lead.company_name || null,
        company_id: companyId,
      });
    }

    try {
      await createActivity({
        type: 'agent',
        title:
          status === 'won'
            ? 'Lead ganado → contact + deal + client'
            : 'Lead qualified → contact + deal',
        body: JSON.stringify({
          lead_id: lead.id,
          contact_id: contactId,
          deal_id: dealId,
          company_id: companyId,
          client_id: client?.id || null,
        }),
        lead_id: lead.id,
        deal_id: dealId,
        contact_id: contactId,
        company_id: companyId,
        agent_id: 'crm',
      });
    } catch (err) {
      logger.warn({ msg: 'Activity CRM falló', leadId: lead.id, error: err.message });
    }

    return { conversion, client };
  } catch (err) {
    logger.warn({ msg: 'Conversión CRM falló', leadId: lead.id, status, error: err.message });
    return { conversion: null, error: err.message };
  }
}

module.exports = { onLeadStatusChange };
