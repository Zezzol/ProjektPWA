import {
  saveTransactionOffline,
  getPendingTransactions,
  clearTransactions,
  saveCategoryOffline,
  getPendingCategories,
  clearCategories
} from './db.js';

const userId = localStorage.getItem('userId');

const transactionsSection = document.getElementById('transactionsSection');
const categoriesSection = document.getElementById('categoriesSection');

const transactionForm = document.getElementById('transactionForm');
const categoryForm = document.getElementById('categoryForm');

const transactionList = document.getElementById('transactionList');
const categoryList = document.getElementById('categoryList');
const categorySelect = document.getElementById('category');

const budgetDisplay = document.getElementById('budget');

// Przełączanie sekcji
window.showSection = function(section) {
  if (section === 'transactions') {
    transactionsSection.style.display = 'block';
    categoriesSection.style.display = 'none';
  } else if (section === 'categories') {
    transactionsSection.style.display = 'none';
    categoriesSection.style.display = 'block';
  }
};

// Dodawanie transakcji
transactionForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const amount = +document.getElementById('amount').value;
  const category = categorySelect.value;
  const type = document.getElementById('type').value;

  const transaction = { amount, category, type, date: new Date().toISOString(), userId };

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

  transactionForm.reset();
  await loadTransactions();
});

// Dodawanie kategorii
categoryForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('newCategory').value.trim();
  if (!name) return;

  const category = { name, userId };

  if (navigator.onLine) {
    await fetch('http://localhost:3000/category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category),
    });
  } else {
    await saveCategoryOffline(category);
    alert('Kategoria zapisana offline!');
  }

  categoryForm.reset();
  await loadCategories();
});

// Synchronizacja offline danych po powrocie online
window.addEventListener('online', async () => {
  // Transakcje
  const pendingTransactions = await getPendingTransactions();
  for (const tx of pendingTransactions) {
    await fetch('http://localhost:3000/transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx),
    });
  }
  if (pendingTransactions.length > 0) {
    alert(`Zsynchronizowano ${pendingTransactions.length} transakcji.`);
    await clearTransactions();
    await loadTransactions();
  }

  // Kategorie
  const pendingCategories = await getPendingCategories();
  for (const cat of pendingCategories) {
    await fetch('http://localhost:3000/category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cat),
    });
  }
  if (pendingCategories.length > 0) {
    alert(`Zsynchronizowano ${pendingCategories.length} kategorii.`);
    await clearCategories();
    await loadCategories();
  }
});

// Ładowanie kategorii (do sidebar i selecta)
async function loadCategories() {
  let categories = [];
  if (navigator.onLine) {
    const res = await fetch(`http://localhost:3000/category/${userId}`);
    categories = await res.json();
  } else {
    categories = await getPendingCategories();
  }

  // Lista kategorii w sidebarze
  categoryList.innerHTML = '';
  categories.forEach(cat => {
    const li = document.createElement('li');
    li.className = 'list-group-item';
    li.textContent = cat.name;
    categoryList.appendChild(li);
  });

  // Select w formularzu transakcji
  categorySelect.innerHTML = '';
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.name;
    option.textContent = cat.name;
    categorySelect.appendChild(option);
  });
}

// Ładowanie transakcji i aktualizacja budżetu
async function loadTransactions() {
  if (!userId) return;
  let transactions = [];
  if (navigator.onLine) {
    const res = await fetch(`http://localhost:3000/transaction/${userId}`);
    transactions = await res.json();
  } else {
    transactions = await getPendingTransactions();
  }
  renderTransactions(transactions);
  updateBudget(transactions);
}

// Renderowanie listy transakcji
function renderTransactions(transactions) {
  transactionList.innerHTML = '';
  transactions.forEach(tx => {
    const li = document.createElement('li');
    li.className = `list-group-item d-flex justify-content-between ${
      tx.type === 'income' ? 'list-group-item-success' : 'list-group-item-danger'
    }`;
    li.innerHTML = `
      <span>${tx.category} (${new Date(tx.date).toLocaleDateString()})</span>
      <strong>${tx.type === 'income' ? '+' : '-'}${tx.amount} zł</strong>
    `;
    transactionList.appendChild(li);
  });
}

// Aktualizacja budżetu
function updateBudget(transactions) {
  const balance = transactions.reduce((sum, tx) => {
    return tx.type === 'income' ? sum + tx.amount : sum - tx.amount;
  }, 0);
  budgetDisplay.textContent = `${balance.toFixed(2)} zł`;
}

// Inicjalizacja po załadowaniu strony
window.addEventListener('DOMContentLoaded', () => {
  if (!userId) {
    alert('Brak zalogowanego użytkownika!');
    window.location.href = 'login.html';
    return;
  }
  loadCategories();
  loadTransactions();
  showSection('transactions'); // domyślnie pokaż transakcje
});
