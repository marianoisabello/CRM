'use strict';

const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const supabase = require('../db/client');
const calendar = require('../integrations/calendar');
const logger = require('../lib/logger');

// POST /api/export/sheets  { source?, classification?, status? }
router.post('/sheets', async (req, res) => {
  const auth = calendar.getAuthenticatedClient();
  if (!auth) {
    return res.status(400).json({
      ok: false,
      error: 'Google no configurado. Autorizá en /api/auth/google-calendar primero.',
    });
  }

  const { source, classification, status } = req.body;

  let query = supabase
    .from('leads')
    .select('name, email, contact, contact_type, source, status, score, classification, next_action, message, created_at')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (source) query = query.eq('source', source);
  if (classification) query = query.eq('classification', classification);
  if (status) query = query.eq('status', status);

  const { data: leads, error } = await query;
  if (error) return res.status(500).json({ ok: false, error: error.message });

  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const drive  = google.drive({ version: 'v3', auth });

    const title = `CRM Dana — Leads ${new Date().toLocaleDateString('es-AR')}`;
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
        sheets: [{ properties: { title: 'Leads' } }],
      },
    });

    const spreadsheetId = spreadsheet.data.spreadsheetId;

    const headers = ['Nombre', 'Email', 'Contacto', 'Tipo', 'Fuente', 'Estado', 'Score', 'Clasificación', 'Próxima acción', 'Mensaje', 'Fecha'];
    const rows = leads.map(l => [
      l.name || '',
      l.email || '',
      l.contact || '',
      l.contact_type || '',
      l.source || '',
      l.status || '',
      l.score ?? '',
      l.classification || '',
      l.next_action || '',
      l.message || '',
      l.created_at ? new Date(l.created_at).toLocaleString('es-AR') : '',
    ]);

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Leads!A1',
      valueInputOption: 'RAW',
      requestBody: { values: [headers, ...rows] },
    });

    // Hacer la hoja accesible con el link (solo lectura para cualquiera)
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    logger.info({ msg: 'Export a Sheets exitoso', leads: leads.length, url });
    return res.json({ ok: true, url, leads_exported: leads.length });
  } catch (err) {
    logger.error({ msg: 'Error exportando a Sheets', error: err.message });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
