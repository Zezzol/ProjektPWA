const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const port = 3000;
app.use(cors());

mongoose.connect('mongodb://127.0.0.1:27017/finanse', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ Połączono z MongoDB'))
  .catch((err) => console.error('❌ Błąd połączenia z MongoDB:', err));

app.use(express.json());

// Dodaj swoje trasy np. users, transactions
const userRoutes = require('./routes/user');
const transactionRoutes = require('./routes/transaction');
const categoryRoutes = require('./routes/category');

app.use('/category', categoryRoutes);
app.use('/user', userRoutes);
app.use('/transaction', transactionRoutes);

app.listen(port, () => {
  console.log(`🚀 Serwer działa na http://localhost:${port}`);
});
