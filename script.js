import {
  saveTransactionOffline,
  getPendingTransactions,
  clearTransactions
} from './db.js';

const userId = localStorage.getItem('userId');
const transactionList = document.getElementById('transactionList');
const budgetDisplay = document.getElementById('budget');

// Obsługa dodawania transakcji (online/offline)
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
    await fetch('http://localhost:3000/transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction),
    });
  } else {
    await saveTransactionOffline(transaction);
    alert('Transakcja zapisana offline!');
  }

  e.target.reset();
  fetchTransactions(); // odśwież dane po dodaniu
});

// Synchronizacja po odzyskaniu połączenia
window.addEventListener('online', async () => {
  const transactions = await getPendingTransactions();

  for (const tx of transactions) {
    await fetch('http://localhost:3000/transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx),
    });
  }

  if (transactions.length > 0) {
    alert(`Zsynchronizowano ${transactions.length} transakcji z serwerem.`);
    await clearTransactions();
    fetchTransactions();
  }
});

// Funkcja pobierająca transakcje i aktualizująca UI
async function fetchTransactions() {
  if (!userId) return;
  const res = await fetch(`http://localhost:3000/transaction/${userId}`);
  const data = await res.json();
  renderTransactions(data);
  updateBudget(data);
}

// Rysowanie listy transakcji
function renderTransactions(transactions) {
  transactionList.innerHTML = '';
  transactions.forEach(tx => {
    const li = document.createElement('li');
    li.className = `list-group-item d-flex justify-content-between ${tx.type === 'income' ? 'list-group-item-success' : 'list-group-item-danger'}`;
    li.innerHTML = `
      <span>${tx.category} (${new Date(tx.date).toLocaleDateString()})</span>
      <strong>${tx.type === 'income' ? '+' : '-'}${tx.amount} zł</strong>
    `;
    transactionList.appendChild(li);
  });
}

// Liczenie budżetu
function updateBudget(transactions) {
  const balance = transactions.reduce((sum, tx) => {
    return tx.type === 'income' ? sum + tx.amount : sum - tx.amount;
  }, 0);
  budgetDisplay.textContent = `${balance.toFixed(2)} zł`;
}

// Załaduj dane po starcie
window.addEventListener('DOMContentLoaded', () => {
  if (!userId) {
    alert('Brak zalogowanego użytkownika');
    window.location.href = 'login.html'; // opcjonalnie
  } else {
    fetchTransactions();
  }
});
