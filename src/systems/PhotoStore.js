// Phone photos (JPEG data URLs, newest first) kept in IndexedDB so they survive closing the game.
// They are too big for localStorage next to the save (src/systems/SaveSystem.js). Storage blocked: photos last this visit only.
export const MAX_PHOTOS = 24;
const DB = 'yanlinGTA.photos',
  STORE = 'kv',
  KEY = 'list';

function open() {
  return new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') {
      rej(new Error('no indexedDB'));
      return;
    }
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export async function loadPhotos() {
  try {
    const db = await open();
    return await new Promise((res) => {
      const q = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
      q.onsuccess = () => res(Array.isArray(q.result) ? q.result.slice(0, MAX_PHOTOS) : []);
      q.onerror = () => res([]);
    });
  } catch (e) {
    return [];
  }
}

export async function savePhotos(list) {
  try {
    const db = await open();
    db.transaction(STORE, 'readwrite').objectStore(STORE).put(list.slice(0, MAX_PHOTOS), KEY);
  } catch (e) {
    /* storage blocked or full */
  }
}
