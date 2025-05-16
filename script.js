import {
  saveTransactionOffline,
  getPendingTransactions,
  clearTransactions
} from './db.js';

const userId = localStorage.getItem('userId');

document.getElementById('transactionForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const amount = +document.getElementById('amount').value;
  const category = document.getElementById('category').value;
  const type = document.getElementById('type').value;

  const transaction = {
    amount,
    category,
    type,
    date: new Date().toISOString(),
    userId
  };

  if (navigator.onLine) {
    // Online – wyślij do backendu
    await fetch('http://localhost:3000/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction),
    });
  } else {
    // Offline – zapisz lokalnie
    await saveTransactionOffline(transaction);
    alert('Transakcja zapisana offline!');
  }

  // Wyczyść formularz
  e.target.reset();
});

window.addEventListener('online', async () => {
  const transactions = await getPendingTransactions();

  for (const tx of transactions) {
    await fetch('http://localhost:3000/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx),
    });
  }

  if (transactions.length > 0) {
    alert(`Zsynchronizowano ${transactions.length} transakcji z serwerem.`);
    await clearTransactions();
  }
});
