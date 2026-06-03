'use strict';

const express = require('express');
const router = express.Router();
const { createMeeting, updateMeetingStatus, getMeetingsByLead, getAllMeetings } = require('../db/meetings');
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
  const { lead_id, scheduled_at, type, notes, calendar_link } = req.body;
  if (!lead_id || !scheduled_at) {
    return res.status(400).json({ ok: false, error: 'lead_id y scheduled_at son requeridos' });
  }

  try {
    const meeting = await createMeeting({ leadId: lead_id, scheduledAt: scheduled_at, type, notes, calendarLink: calendar_link });
    logger.info({ msg: 'Meeting creado', meetingId: meeting.id, leadId: lead_id });
    return res.status(201).json({ ok: true, meeting });
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
