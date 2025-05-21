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

  const breakdownDiv2 = document.getElementById('categoryBreakdown2');

  // Grupowanie wydatków po kategoriach
  const incomeGrouped = {};
  transactions.forEach(tx => {
    if (tx.type === 'income') {
      if (!incomeGrouped[tx.category]) {
        incomeGrouped[tx.category] = [];
      }
      incomeGrouped[tx.category].push(tx.amount);
    }
  });

  // Generowanie HTML tabeli
  let tableHTML2 = `
    <h5>Analiza przychodów według kategorii</h5>
    <table class="table table-bordered table-striped">
      <thead class="table-light">
        <tr>
          <th>Kategoria</th>
          <th>Średni przychód (zł)</th>
          <th>Suma przychodów (zł)</th>
        </tr>
      </thead>
      <tbody>
  `;

  Object.entries(incomeGrouped).forEach(([category, amounts]) => {
    const sum = amounts.reduce((a, b) => a + b, 0);
    const avg = sum / amounts.length;
    tableHTML2 += `
      <tr>
        <td>${category}</td>
        <td>${avg.toFixed(2)}</td>
        <td>${sum.toFixed(2)}</td>
      </tr>
    `;
  });

  tableHTML2 += '</tbody></table>';
  breakdownDiv2.innerHTML = tableHTML2;

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
  if (window.expensePieChart instanceof Chart) {
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
  if (window.avgExpenseChart instanceof Chart) {
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

// Generowanie wykresu dla income
async function generateIncomeChart() {
  if (!userId) return;

  let transactions = [];
  if (navigator.onLine) {
    const res = await fetch(`http://localhost:3000/transaction/${userId}`);
    transactions = await res.json();
  } else {
    transactions = await getPendingTransactions();
  }

  // Wykres kołowy – tylko wydatki
  const ctx = document.getElementById('incomePieChart').getContext('2d');

  // Grupowanie tylko wydatków (type === 'expense')
  const incomeCategories = {};
  transactions.forEach(tx => {
    if (tx.type === 'income') {
      if (!incomeCategories[tx.category]) {
        incomeCategories[tx.category] = 0;
      }
      incomeCategories[tx.category] += tx.amount;
    }
  });

  // Dane do wykresu
  const labels = Object.keys(incomeCategories);
  const data = Object.values(incomeCategories);

  // Generowanie kolorów
  const backgroundColors = labels.map((_, i) =>
    `hsl(${(i * 360) / labels.length}, 70%, 60%)`
  );

  // Usuwanie poprzedniego wykresu, jeśli istnieje
  if (window.incomePieChart instanceof Chart) {
    window.incomePieChart.destroy();
  }

  // Tworzenie wykresu kołowego
  window.incomePieChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        label: 'Przychody wg kategorii',
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
  const avgIncomeLabels = [];
  const avgIncomeData = [];

  // Grupowanie wydatków po kategoriach
  const incomeGrouped = {};
  transactions.forEach(tx => {
    if (tx.type === 'income') {
      if (!incomeGrouped[tx.category]) {
        incomeGrouped[tx.category] = [];
      }
      incomeGrouped[tx.category].push(tx.amount);
    }
  });

  Object.entries(incomeGrouped).forEach(([category, amounts]) => {
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    avgIncomeLabels.push(category);
    avgIncomeData.push(avg.toFixed(2));
  });

  // Jeśli wykres już istnieje, zniszcz go (aby uniknąć duplikacji)
  if (window.avgIncomeChart instanceof Chart) {
    window.avgIncomeChart.destroy();
  }

  // Tworzenie wykresu słupkowego
  const ctxBar = document.getElementById('incomeBarChart').getContext('2d');
  window.avgIncomeChart = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels: avgIncomeLabels,
      datasets: [{
        label: 'Średni przychód (zł)',
        data: avgIncomeData,
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
