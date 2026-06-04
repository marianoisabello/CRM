'use strict';

const express = require('express');
const router = express.Router();
const { createMeeting, updateMeetingStatus, getMeetingsByLead, getAllMeetings } = require('../db/meetings');
const supabase = require('../db/client');
const calendar = require('../integrations/calendar');
const logger = require('../lib/logger');

// GET /api/meetings?lead_id=<id>  (lead_id opcional)
router.get('/', async (req, res) => {
  const { lead_id } = req.query;
  try {
    const meetings = lead_id ? await getMeetingsByLead(lead_id) : await getAllMeetings();
    return res.json({ ok: true, meetings });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/meetings/all — alias explícito
router.get('/all', async (req, res) => {
  try {
    const meetings = await getAllMeetings();
    return res.json({ ok: true, meetings });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/meetings
router.post('/', async (req, res) => {
  const { lead_id, scheduled_at, type, notes, duration_minutes = 30 } = req.body;
  if (!lead_id || !scheduled_at) {
    return res.status(400).json({ ok: false, error: 'lead_id y scheduled_at son requeridos' });
  }

  try {
    // Obtener datos del lead para el evento de Calendar
    let calendarLink = null;
    let meetUrl = null;

    if (calendar.isConfigured()) {
      const { data: lead } = await supabase
        .from('leads')
        .select('name, email')
        .eq('id', lead_id)
        .maybeSingle();

      const typeLabels = { discovery: 'Discovery', follow_up: 'Follow-up', closing: 'Cierre', onboarding: 'Onboarding' };
      const summary = `CRM Dana — ${typeLabels[type] || type || 'Reunión'}${lead?.name ? ` · ${lead.name}` : ''}`;

      const event = await calendar.createEvent({
        summary,
        description: notes || '',
        startTime: scheduled_at,
        durationMinutes: Number(duration_minutes),
        attendeeEmail: lead?.email || null,
      }).catch(err => {
        logger.warn({ msg: 'No se pudo crear evento en Google Calendar', error: err.message });
        return null;
      });

      if (event) {
        calendarLink = event.eventUrl;
        meetUrl = event.meetUrl;
        logger.info({ msg: 'Evento Google Calendar creado', eventId: event.eventId, meetUrl });
      }
    }

    const meeting = await createMeeting({
      leadId: lead_id,
      scheduledAt: scheduled_at,
      type,
      notes,
      calendarLink,
    });

    logger.info({ msg: 'Meeting creado', meetingId: meeting.id, leadId: lead_id });
    return res.status(201).json({ ok: true, meeting: { ...meeting, meet_url: meetUrl } });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// PATCH /api/meetings/:id/status
router.patch('/:id/status', async (req, res) => {
  const { status, notes } = req.body;
  if (!status) return res.status(400).json({ ok: false, error: 'status requerido' });

  try {
    const meeting = await updateMeetingStatus(req.params.id, status, notes);
    return res.json({ ok: true, meeting });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

module.exports = router;
