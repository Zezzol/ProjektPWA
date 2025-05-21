export const DB_NAME = "FinanceDB";
export const DB_VERSION = 1;
export const TRANSACTIONS_STORE = "transactions";
export const CATEGORIES_STORE = "categories";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(TRANSACTIONS_STORE)) {
        db.createObjectStore(TRANSACTIONS_STORE, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(CATEGORIES_STORE)) {
        db.createObjectStore(CATEGORIES_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addItem(storeName, item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.add(item);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getItemsByUser(storeName, userId) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);

    const request = store.getAll();

    request.onsuccess = () => {
      const allItems = request.result;
      const filtered = allItems.filter(item => item.userId === userId);
      resolve(filtered);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function clearStore(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}