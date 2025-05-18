const express = require('express');
const router = express.Router();
const User = require('../models/User');


router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ message: 'Użytkownik już istnieje' });
    }

    const newUser = new User({ username, password });
    await newUser.save();

    res.status(201).json({ message: 'Zarejestrowano', userId: newUser._id });
  } catch (err) {
    res.status(500).json({ message: 'Błąd rejestracji', error: err.message });
  }
});


router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username, password });

    if (!user) {
      return res.status(400).json({ message: 'Nieprawidłowy login lub hasło' });
    }

    res.status(200).json({ message: 'Zalogowano', userId: user._id });
  } catch (err) {
    res.status(500).json({ message: 'Błąd logowania', error: err.message });
  }
});

module.exports = router;