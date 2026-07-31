'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/deals');

router.get('/', async (req, res) => {
  try {
    const deals = await db.listDeals(req.query);
    return res.json({ ok: true, deals });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/metrics', async (_req, res) => {
  try {
    const metrics = await db.getDealMetrics();
    return res.json({ ok: true, metrics });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const deal = await db.getDeal(req.params.id);
    return res.json({ ok: true, deal });
  } catch (err) {
    return res.status(404).json({ ok: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const deal = await db.createDeal({
      ...req.body,
      owner_id: req.body.owner_id || req.user?.id || null,
    });
    return res.status(201).json({ ok: true, deal });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const deal = await db.updateDeal(req.params.id, req.body || {});
    return res.json({ ok: true, deal });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

router.patch('/:id/stage', async (req, res) => {
  try {
    const { stage } = req.body || {};
    if (!stage) return res.status(400).json({ ok: false, error: 'stage es requerido' });
    const deal = await db.updateDealStage(req.params.id, stage);
    return res.json({ ok: true, deal });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.deleteDeal(req.params.id);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

module.exports = router;
