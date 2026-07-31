'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/activities');

router.get('/', async (req, res) => {
  try {
    const activities = await db.listActivities(req.query);
    return res.json({ ok: true, activities });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const activity = await db.getActivity(req.params.id);
    return res.json({ ok: true, activity });
  } catch (err) {
    return res.status(404).json({ ok: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const activity = await db.createActivity({
      ...req.body,
      author_user_id: req.body.author_user_id || req.user?.id || null,
    });
    return res.status(201).json({ ok: true, activity });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const activity = await db.updateActivity(req.params.id, req.body || {});
    return res.json({ ok: true, activity });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.deleteActivity(req.params.id);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
});

module.exports = router;
