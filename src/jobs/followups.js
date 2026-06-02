'use strict';

/**
 * Job: Follow-ups automáticos
 * Busca leads "warm" sin contacto reciente y los encola para seguimiento.
 * Se corre diariamente a las 9:00 AM.
 */

const supabase = require('../db/client');
const logger = require('../lib/logger');

async function runFollowups() {
  logger.info({ msg: 'Job follow-ups iniciado' });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 3); // sin actividad en 3 días

  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, name, contact, contact_type, next_action, sdr_notes')
    .eq('classification', 'warm')
    .eq('status', 'new')
    .lt('updated_at', cutoff.toISOString());

  if (error) {
    logger.error({ msg: 'Error obteniendo leads para follow-up', error: error.message });
    return;
  }

  logger.info({ msg: 'Leads para follow-up', count: leads?.length });

  for (const lead of leads || []) {
    // Marcar como "contacted" para evitar re-procesar
    await supabase
      .from('leads')
      .update({ status: 'contacted', updated_at: new Date().toISOString() })
      .eq('id', lead.id);

    logger.info({
      msg: 'Follow-up pendiente',
      leadId: lead.id,
      name: lead.name,
      channel: lead.contact_type,
      action: lead.next_action,
    });

    // TODO: cuando ManyChat esté integrado, disparar mensaje de seguimiento vía API
  }

  logger.info({ msg: 'Job follow-ups completado', processed: leads?.length });
}

module.exports = { runFollowups };
