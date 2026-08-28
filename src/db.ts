import type { DocumentRecord } from './types';

const DB_NAME = 'color-context';
const STORE_NAME = 'documents';
const VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local storage.'));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Local storage request failed.'));
  });
}

/**
 * A request becoming successful only means IndexedDB accepted it into the
 * transaction. Navigation can still abort that transaction before it commits.
 * Resolve writes at the transaction boundary so callers can safely render a
 * "saved on this device" state or reload immediately afterwards.
 */
function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('Local storage transaction was aborted.'));
    transaction.onerror = () => reject(transaction.error ?? new Error('Local storage transaction failed.'));
  });
}

export async function saveDocument(document: DocumentRecord): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const committed = transactionComplete(transaction);
  transaction.objectStore(STORE_NAME).put(document);
  try {
    await committed;
  } finally {
    db.close();
  }
}

export async function listDocuments(): Promise<DocumentRecord[]> {
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME);
  const completed = transactionComplete(transaction);
  const records = await requestResult(transaction.objectStore(STORE_NAME).getAll()) as DocumentRecord[];
  try {
    await completed;
    return records.sort((a, b) => b.updatedAt - a.updatedAt);
  } finally {
    db.close();
  }
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const committed = transactionComplete(transaction);
  transaction.objectStore(STORE_NAME).delete(id);
  try {
    await committed;
  } finally {
    db.close();
  }
}
