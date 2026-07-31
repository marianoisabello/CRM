'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/contacts');

router.get('/', async (req, res) => {
  try {
    const contacts = await db.listContacts(req.query);
    return res.json({ ok: true, contacts });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const contact = await db.getContact(req.params.id);
    return res.json({ ok: true, contact });
  } catch (err) {
    return res.status(404).json({ ok: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const contact = await db.createContact({
      ...req.body,
      owner_id: req.body.owner_id || req.user?.id || null,
    });
    return res.status(201).json({ ok: true, contact });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

router.post('/from-lead/:leadId', async (req, res) => {
  try {
    const result = await db.createContactFromLead(req.params.leadId, {
      createDeal: Boolean(req.body?.create_deal),
      owner_id: req.body?.owner_id || req.user?.id || null,
    });
    return res.status(result.created ? 201 : 200).json({ ok: true, ...result });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const contact = await db.updateContact(req.params.id, req.body || {});
    return res.json({ ok: true, contact });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.deleteContact(req.params.id);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

module.exports = router;
