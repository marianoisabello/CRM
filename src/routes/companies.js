'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/companies');

router.get('/', async (req, res) => {
  try {
    const companies = await db.listCompanies(req.query);
    return res.json({ ok: true, companies });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const company = await db.getCompany(req.params.id);
    return res.json({ ok: true, company });
  } catch (err) {
    return res.status(404).json({ ok: false, error: err.message });
  }
});

router.get('/:id/contacts', async (req, res) => {
  try {
    const contacts = await db.listCompanyContacts(req.params.id);
    return res.json({ ok: true, contacts });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/:id/deals', async (req, res) => {
  try {
    const deals = await db.listCompanyDeals(req.params.id);
    return res.json({ ok: true, deals });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/:id/clients', async (req, res) => {
  try {
    const clients = await db.listCompanyClients(req.params.id);
    return res.json({ ok: true, clients });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const company = await db.createCompany({
      ...req.body,
      owner_id: req.body.owner_id || req.user?.id || null,
    });
    return res.status(201).json({ ok: true, company });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const company = await db.updateCompany(req.params.id, req.body || {});
    return res.json({ ok: true, company });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.deleteCompany(req.params.id);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

module.exports = router;
