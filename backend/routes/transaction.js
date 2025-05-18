const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');

// Dodaj transakcję
router.post('/', async (req, res) => {
  try {
    const newTx = new Transaction(req.body);
    await newTx.save();
    res.status(201).json(newTx);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Pobierz wszystkie transakcje użytkownika
router.get('/:userId', async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.params.userId });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;