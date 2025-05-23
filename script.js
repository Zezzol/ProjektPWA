import { addItem, getItemsByUser, TRANSACTIONS_STORE, CATEGORIES_STORE } from './db.js';
import { generateReport, generatePieChart, generateIncomeChart } from './chartscript.js';

export const userId = localStorage.getItem('userId');

const transactionsSection = document.getElementById('transactionsSection');
const categoriesSection = document.getElementById('categoriesSection');
const reportSection = document.getElementById('reportSection');
const chartsSection = document.getElementById('chartsSection');

const transactionForm = document.getElementById('transactionForm');
const categoryForm = document.getElementById('categoryForm');

const transactionList = document.getElementById('transactionList');
const categoryList = document.getElementById('categoryList');
const categorySelect = document.getElementById('category');

const budgetDisplay = document.getElementById('budget');

let previousBalance = 0;

// Przełączanie sekcji
window.showSection = function(section) {
  if (section === 'transactions') {
    transactionsSection.style.display = 'block';
    categoriesSection.style.display = 'none';
    reportSection.style.display = 'none';
    chartsSection.style.display = 'none';
  } else if (section === 'categories') {
    transactionsSection.style.display = 'none';
    categoriesSection.style.display = 'block';
    reportSection.style.display = 'none';
    chartsSection.style.display = 'none';
  } else if (section == 'report') {
    transactionsSection.style.display = 'none';
    categoriesSection.style.display = 'none';
    reportSection.style.display = 'block';
    chartsSection.style.display = 'none';
    generateReport();
  } else if (section == 'charts') {
    transactionsSection.style.display = 'none';
    categoriesSection.style.display = 'none';
    reportSection.style.display = 'none';
    chartsSection.style.display = 'block';
    generatePieChart();
    generateIncomeChart();
  }
};

let categories = [];
let transactions = [];

// Render categories in select and list
function renderCategories() {
  categorySelect.innerHTML = '';
  categoryList.innerHTML = '';
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.name;
    option.textContent = cat.name;
    categorySelect.appendChild(option);

    const li = document.createElement('li');
    li.textContent = cat.name;
    li.className = 'list-group-item';
    categoryList.appendChild(li);
  });
}

// Render transactions list
function renderTransactions() {
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
  updateBudget(transactions);
}

// Load data from IndexedDB
async function loadData() {
  categories = await getItemsByUser(CATEGORIES_STORE, userId);
  transactions = await getItemsByUser(TRANSACTIONS_STORE, userId);
  renderCategories();
  renderTransactions();
}

// Add category
categoryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const newCategoryName = document.getElementById('newCategory').value.trim();
  if (!newCategoryName) return;

  const categoryObj = { name: newCategoryName, userId };
  const id = await addItem(CATEGORIES_STORE, categoryObj);
  categoryObj.id = id;
  categories.push(categoryObj);
  renderCategories();
  categoryForm.reset();

  if (navigator.onLine) {
    await syncAllDataWithServer();
  }
});

// Add transaction
transactionForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('amount').value);
  const category = document.getElementById('category').value;
  const type = document.getElementById('type').value;

  if (!amount || !category) return;

  const transaction = { amount, category, type, date: new Date().toISOString(), userId };
  const id = await addItem(TRANSACTIONS_STORE, transaction);
  transaction.id = id;
  transactions.push(transaction);
  renderTransactions();
  transactionForm.reset();

  if (navigator.onLine) {
    await syncAllDataWithServer();
  }
});

async function syncAllDataWithServer() {
  if (!navigator.onLine || !userId) return;

  try {
    // 1. Pobierz dane z serwera
    const [serverCategories, serverTransactions] = await Promise.all([
      fetch(`http://localhost:3000/category/${userId}`).then(res => res.json()),
      fetch(`http://localhost:3000/transaction/${userId}`).then(res => res.json()),
    ]);

    // 2. Pobierz dane lokalne
    const localCategories = await getItemsByUser(CATEGORIES_STORE,userId);
    const localTransactions = await getItemsByUser(TRANSACTIONS_STORE,userId);

    // 3. Zsynchronizuj brakujące dane z IndexedDB na serwer
    for (const localCat of categories) {
      const exists = serverCategories.some(serverCat => serverCat.name === localCat.name);
      if (!exists) {
        await fetch('http://localhost:3000/category', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(localCat)
        });
      }
    }

    for (const localTx of transactions) {
      const exists = serverTransactions.some(serverTx =>
        serverTx.amount === localTx.amount &&
        serverTx.category === localTx.category &&
        serverTx.type === localTx.type &&
        new Date(serverTx.date).toISOString() === new Date(localTx.date).toISOString()
      );
      if (!exists) {
        await fetch('http://localhost:3000/transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(localTx)
        });
      }
    }

    // 4. Zsynchronizuj dane z serwera do IndexedDB
    for (const serverCat of serverCategories) {
      if (!localCategories.find(lc => lc.name === serverCat.name && lc.userId === serverCat.userId)) {
        await addItem(CATEGORIES_STORE, serverCat);
      }
    }

    for (const serverTx of serverTransactions) {
      if (!localTransactions.find(lt =>
        lt.amount === serverTx.amount &&
        lt.category === serverTx.category &&
        lt.type === serverTx.type &&
        lt.date === serverTx.date &&
        lt.userId === serverTx.userId
      )) {
        await addItem(TRANSACTIONS_STORE, serverTx);
      }
    }

    console.log('✅ Synchronizacja zakończona');

    // Zaktualizuj UI
    loadData();

  } catch (err) {
    console.error('❌ Błąd synchronizacji:', err);
  }
}


function updateBudget(transactions) {
  const balance = transactions.reduce((sum, tx) => {
    return tx.type === 'income' ? sum + tx.amount : sum - tx.amount;
  }, 0);
  
  budgetDisplay.textContent = `${balance.toFixed(2)} zł`;

  // Jeśli wcześniej było >= 0, a teraz jest < 0 → wyślij powiadomienie
  if (previousBalance >= 0 && balance < 0) {
    triggerPushNotification(
      "Uwaga: Budżet na minusie!",
      "Twój budżet spadł poniżej zera. Sprawdź wydatki."
    );
  }
  else if (previousBalance < 0 && balance >= 0){
    triggerPushNotification(
      "Dobra Robota!",
      "Twój budżet znów jest na plusie."
    )
  }

  previousBalance = balance;
}

function triggerPushNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, {
        body,
        icon: '/icons/icon-192.png', 
        badge: '/icons/favicon.ico'
      });
    });
  }
}

// Przy starcie
loadData();

window.addEventListener('online', () => {
  syncAllDataWithServer();
});

// Inicjalizacja po załadowaniu strony
window.addEventListener('DOMContentLoaded', () => {
  if (!userId) {
    alert('Brak zalogowanego użytkownika!');
    window.location.href = 'login.html';
    return;
  }
  renderCategories();
  renderTransactions();
  syncAllDataWithServer();
  showSection('tansactions'); // domyślnie pokaż transakcje

  if (Notification.permission !== 'granted') {
  Notification.requestPermission().then(permission => {
    if (permission !== 'granted') {
      console.warn("Powiadomienia są wyłączone.");
    }
  });
  }
});
