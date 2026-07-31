'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/pipelineStages');

router.get('/', async (req, res) => {
  try {
    const activeOnly = req.query.active === 'false' ? false : true;
    const stages = await db.listStages({ activeOnly });
    return res.json({ ok: true, stages });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
