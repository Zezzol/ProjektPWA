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
const reportSection = document.getElementById('reportSection');
const chartsSection = document.getElementById('chartsSection');

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
    generatePieChart()
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

// Generowanie raportu
async function generateReport() {
  if (!userId) return;

  let transactions = [];
  if (navigator.onLine) {
    const res = await fetch(`http://localhost:3000/transaction/${userId}`);
    transactions = await res.json();
  } else {
    transactions = await getPendingTransactions();
  }

  // Grupowanie transakcji według kategorii
  const categoryTotals = {};
  transactions.forEach(tx => {
    if (!categoryTotals[tx.category]) {
      categoryTotals[tx.category] = 0;
    }
    categoryTotals[tx.category] += tx.type === 'income' ? tx.amount : -tx.amount;
  });

  // Renderowanie tabeli
  const tbody = document.querySelector('#reportTable tbody');
  tbody.innerHTML = '';
  let total = 0;

  for (const [category, amount] of Object.entries(categoryTotals)) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${category}</td>
      <td>${amount.toFixed(2)} zł</td>
    `;
    tbody.appendChild(row);
    total += amount;
  }

  // Podsumowanie
  const reportSummary = document.getElementById('reportSummary');
  reportSummary.textContent = `Suma: ${total.toFixed(2)} zł`;
  reportSummary.style.color = total >= 0 ? 'green' : 'red';

  const analysisDiv = document.getElementById('financialAnalysis');

  // Obliczenia
  const totalIncome = transactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpense = transactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const balance = totalIncome - totalExpense;

  // Procent oszczędności lub przekroczenia budżetu
  let savingsText = '';
  if (totalIncome > 0) {
    const percent = ((Math.abs(balance) / totalIncome) * 100).toFixed(2);
    if (balance >= 0) {
      savingsText = `Zaoszczędzono <strong>${percent}%</strong> budżetu.`;
    } else {
      savingsText = `Budżet przekroczony o <strong>${percent}%</strong>.`;
    }
  } else {
    savingsText = 'Brak danych o przychodach do analizy oszczędności.';
  }

  // Kategorie i średnia wydatków
  const expenseByCategory = {};
  transactions.forEach(tx => {
    if (tx.type === 'expense') {
      if (!expenseByCategory[tx.category]) {
        expenseByCategory[tx.category] = 0;
      }
      expenseByCategory[tx.category] += tx.amount;
    }
  });

  const categoryWithMaxExpense = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])[0];

  const averageExpense = Object.values(expenseByCategory).length
    ? (Object.values(expenseByCategory).reduce((a, b) => a + b, 0) / Object.values(expenseByCategory).length).toFixed(2)
    : 0;

  // Wypełnienie HTML
  analysisDiv.innerHTML = `
    <h5>Analiza finansowa</h5>
    <ul>
      <li>${savingsText}</li>
      <li>Najwięcej wydajesz w kategorii: <strong>${categoryWithMaxExpense?.[0] || 'brak danych'}</strong> (${categoryWithMaxExpense ? categoryWithMaxExpense[1].toFixed(2) + ' zł' : ''})</li>
      <li>Średni wydatek na kategorię: <strong>${averageExpense} zł</strong></li>
    </ul>
  `;

  const breakdownDiv = document.getElementById('categoryBreakdown');

  // Grupowanie wydatków po kategoriach
  const expenseGrouped = {};
  transactions.forEach(tx => {
    if (tx.type === 'expense') {
      if (!expenseGrouped[tx.category]) {
        expenseGrouped[tx.category] = [];
      }
      expenseGrouped[tx.category].push(tx.amount);
    }
  });

  // Generowanie HTML tabeli
  let tableHTML = `
    <h5>Analiza wydatków według kategorii</h5>
    <table class="table table-bordered table-striped">
      <thead class="table-light">
        <tr>
          <th>Kategoria</th>
          <th>Średni wydatek (zł)</th>
          <th>Suma wydatków (zł)</th>
        </tr>
      </thead>
      <tbody>
  `;

  Object.entries(expenseGrouped).forEach(([category, amounts]) => {
    const sum = amounts.reduce((a, b) => a + b, 0);
    const avg = sum / amounts.length;
    tableHTML += `
      <tr>
        <td>${category}</td>
        <td>${avg.toFixed(2)}</td>
        <td>${sum.toFixed(2)}</td>
      </tr>
    `;
  });

  tableHTML += '</tbody></table>';
  breakdownDiv.innerHTML = tableHTML;

}

// Generowanie wykresu kołowego
async function generatePieChart() {
  if (!userId) return;

  let transactions = [];
  if (navigator.onLine) {
    const res = await fetch(`http://localhost:3000/transaction/${userId}`);
    transactions = await res.json();
  } else {
    transactions = await getPendingTransactions();
  }

  // Wykres kołowy – tylko wydatki
  const ctx = document.getElementById('categoryChart').getContext('2d');

  // Grupowanie tylko wydatków (type === 'expense')
  const expenseCategories = {};
  transactions.forEach(tx => {
    if (tx.type === 'expense') {
      if (!expenseCategories[tx.category]) {
        expenseCategories[tx.category] = 0;
      }
      expenseCategories[tx.category] += tx.amount;
    }
  });

  // Dane do wykresu
  const labels = Object.keys(expenseCategories);
  const data = Object.values(expenseCategories);

  // Generowanie kolorów
  const backgroundColors = labels.map((_, i) =>
    `hsl(${(i * 360) / labels.length}, 70%, 60%)`
  );

  // Usuwanie poprzedniego wykresu, jeśli istnieje
  if (window.expensePieChart) {
    window.expensePieChart.destroy();
  }

  // Tworzenie wykresu kołowego
  window.expensePieChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        label: 'Wydatki wg kategorii',
        data: data,
        backgroundColor: backgroundColors,
        borderColor: '#fff',
        borderWidth: 1
      }]
    },
    options: {
      responsive: false,
      plugins: {
        legend: {
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.parsed;
              return `${context.label}: ${value.toFixed(2)} zł`;
            }
          }
        }
      }
    }
  });

  // Przygotowanie danych do wykresu słupkowego
  const avgExpenseLabels = [];
  const avgExpenseData = [];

  // Grupowanie wydatków po kategoriach
  const expenseGrouped = {};
  transactions.forEach(tx => {
    if (tx.type === 'expense') {
      if (!expenseGrouped[tx.category]) {
        expenseGrouped[tx.category] = [];
      }
      expenseGrouped[tx.category].push(tx.amount);
    }
  });

  Object.entries(expenseGrouped).forEach(([category, amounts]) => {
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    avgExpenseLabels.push(category);
    avgExpenseData.push(avg.toFixed(2));
  });

  // Jeśli wykres już istnieje, zniszcz go (aby uniknąć duplikacji)
  if (window.avgExpenseChart) {
    window.avgExpenseChart.destroy();
  }

  // Tworzenie wykresu słupkowego
  const ctxBar = document.getElementById('avgExpenseBarChart').getContext('2d');
  window.avgExpenseChart = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels: avgExpenseLabels,
      datasets: [{
        label: 'Średni wydatek (zł)',
        data: avgExpenseData,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Kwota (zł)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Kategorie'
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: context => `${context.dataset.label}: ${context.parsed.y} zł`
          }
        }
      }
    }
  });

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
