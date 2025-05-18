const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

// Dodaj kategorię
router.post('/', async (req, res) => {
  try {
    const { name, userId } = req.body;
    const newCategory = new Category({ name, userId });
    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (err) {
    res.status(500).json({ message: 'Błąd zapisu kategorii', error: err.message });
  }
});

// Pobierz kategorie użytkownika
router.get('/:userId', async (req, res) => {
  try {
    const categories = await Category.find({ userId: req.params.userId });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Błąd pobierania kategorii', error: err.message });
  }
});

module.exports = router;