const DB_NAME = "FinanseDB";
const STORE_TRANSACTION = "transaction";
const STORE_CATEGORY = "category";

// Otwarcie bazy danych
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2); // <- zwiększony numer wersji!

    request.onerror = () => reject("Błąd IndexedDB");
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_TRANSACTION)) {
        db.createObjectStore(STORE_TRANSACTION, { keyPath: "id", autoIncrement: true });
      }

      if (!db.objectStoreNames.contains(STORE_CATEGORY)) {
        db.createObjectStore(STORE_CATEGORY, { keyPath: "id", autoIncrement: true });
      }
    };
  });
}

// === TRANSAKCJE ===

export async function saveTransactionOffline(data) {
  const db = await openDB();
  const tx = db.transaction(STORE_TRANSACTION, "readwrite");
  tx.objectStore(STORE_TRANSACTION).add(data);

  return new Promise((resolve, reject) => {
    const req = tx.objectStore(STORE_TRANSACTION).add(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingTransactions() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRANSACTION, "readonly");
    const store = tx.objectStore(STORE_TRANSACTION);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = reject;
  });
}

export async function clearTransactions() {
  const db = await openDB();
  const tx = db.transaction(STORE_TRANSACTION, "readwrite");
  tx.objectStore(STORE_TRANSACTION).clear();
  return tx.complete;
}

// === KATEGORIE ===

export async function saveCategoryOffline(data) {
  const db = await openDB();
  const tx = db.transaction(STORE_CATEGORY, "readwrite");
  tx.objectStore(STORE_CATEGORY).add(data);
  //return tx.complete;
  return new Promise((resolve, reject) => {
    const req = tx.objectStore(STORE_CATEGORY).add(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingCategories() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CATEGORY, "readonly");
    const store = tx.objectStore(STORE_CATEGORY);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = reject;
  });
}

export async function clearCategories() {
  const db = await openDB();
  const tx = db.transaction(STORE_CATEGORY, "readwrite");
  tx.objectStore(STORE_CATEGORY).clear();
  return tx.complete;
}
