const DB_NAME = "vocabmaster-db";
const DB_VERSION = 1;
const BANK_STORE = "banks";
const PROGRESS_STORE = "progress";
const META_STORE = "meta";

function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function waitForTransaction(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

const dbClient = {
  db: null,

  async open() {
    if (this.db) return this.db;

    this.db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = event => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(BANK_STORE)) {
          const bankStore = db.createObjectStore(BANK_STORE, { keyPath: "id" });
          bankStore.createIndex("bankKey", "bankKey", { unique: false });
        }

        if (!db.objectStoreNames.contains(PROGRESS_STORE)) {
          const progressStore = db.createObjectStore(PROGRESS_STORE, { keyPath: "word" });
          progressStore.createIndex("score", "score", { unique: false });
          progressStore.createIndex("lastSeenAt", "lastSeenAt", { unique: false });
        }

        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: "key" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.db;
  },

  async getMeta(key) {
    const db = await this.open();
    const transaction = db.transaction(META_STORE, "readonly");
    const store = transaction.objectStore(META_STORE);
    const result = await promisifyRequest(store.get(key));
    return result || null;
  },

  async setMeta(key, value) {
    const db = await this.open();
    const transaction = db.transaction(META_STORE, "readwrite");
    transaction.objectStore(META_STORE).put({ key, value });
    await waitForTransaction(transaction);
  },

  async getBankEntries(bankKey) {
    const db = await this.open();
    const transaction = db.transaction(BANK_STORE, "readonly");
    const index = transaction.objectStore(BANK_STORE).index("bankKey");
    const result = await promisifyRequest(index.getAll(bankKey));
    return result || [];
  },

  async replaceBankEntries(bankKey, entries, version) {
    const existingEntries = await this.getBankEntries(bankKey);
    const db = await this.open();
    const transaction = db.transaction([BANK_STORE, META_STORE], "readwrite");
    const bankStore = transaction.objectStore(BANK_STORE);

    existingEntries.forEach(entry => {
      bankStore.delete(entry.id);
    });

    entries.forEach(entry => {
      bankStore.put({ ...entry, bankKey });
    });

    transaction.objectStore(META_STORE).put({
      key: `bankVersion:${bankKey}`,
      value: version
    });

    await waitForTransaction(transaction);
  },

  async getAllProgress() {
    const db = await this.open();
    const transaction = db.transaction(PROGRESS_STORE, "readonly");
    const store = transaction.objectStore(PROGRESS_STORE);
    const result = await promisifyRequest(store.getAll());
    return result || [];
  },

  async setProgressEntry(entry) {
    const db = await this.open();
    const transaction = db.transaction(PROGRESS_STORE, "readwrite");
    transaction.objectStore(PROGRESS_STORE).put(entry);
    await waitForTransaction(transaction);
  },

  async clearProgress() {
    const db = await this.open();
    const transaction = db.transaction(PROGRESS_STORE, "readwrite");
    transaction.objectStore(PROGRESS_STORE).clear();
    await waitForTransaction(transaction);
  }
};
