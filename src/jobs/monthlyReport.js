'use strict';

/**
 * Job: Generación automática de reportes mensuales (Agente 05)
 * Se corre el día 1 de cada mes a las 7:00 AM.
 * Genera reportes para todos los clientes activos.
 */

const { listClients } = require('../db/clients');
const { generateMonthlyReport } = require('../agents/reporting');
const logger = require('../lib/logger');

async function runMonthlyReports() {
  const now = new Date();
  // El reporte es del mes anterior
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const month = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;

  logger.info({ msg: 'Job reportes mensuales iniciado', month });

  let clients;
  try {
    clients = await listClients({ status: 'active' });
  } catch (err) {
    logger.error({ msg: 'Error obteniendo clientes activos', error: err.message });
    return;
  }

  logger.info({ msg: 'Clientes a reportar', count: clients.length });

  for (const client of clients) {
    try {
      await generateMonthlyReport(client.id, month);
      logger.info({ msg: 'Reporte generado', clientId: client.id, month });
    } catch (err) {
      logger.error({ msg: 'Error generando reporte', clientId: client.id, error: err.message });
    }
  }

  logger.info({ msg: 'Job reportes mensuales completado', total: clients.length });
}

module.exports = { runMonthlyReports };
