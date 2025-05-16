const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  amount: Number,
  category: String,
  type: { type: String, enum: ['income', 'expense'] },
  date: String,
  userId: String,
});

module.exports = mongoose.model('Transaction', transactionSchema);