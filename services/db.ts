
import { Project } from '../types';

const DB_NAME = 'SecondBrainDB';
const DB_VERSION = 2; // Bump version to ensure clean slate if needed
const STORE_PROJECTS = 'projects';

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
    };
  });
};

export const saveProjectsToDB = async (projects: Project[]) => {
  const db = await initDB();
  const tx = db.transaction(STORE_PROJECTS, 'readwrite');
  const store = tx.objectStore(STORE_PROJECTS);
  
  // Clear existing and add new (simple sync strategy)
  await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
  });

  projects.forEach(p => store.put(p));
  
  return new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
  });
};

export const loadProjectsFromDB = async (): Promise<Project[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const store = tx.objectStore(STORE_PROJECTS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

// --- BACKUP & SYNC UTILS ---

export const exportDatabase = async (): Promise<string> => {
    const projects = await loadProjectsFromDB();
    const backup = {
        version: 1,
        timestamp: Date.now(),
        data: projects
    };
    return JSON.stringify(backup, null, 2);
};

export const importDatabase = async (jsonString: string): Promise<Project[]> => {
    try {
        const backup = JSON.parse(jsonString);
        if (!backup.data || !Array.isArray(backup.data)) {
            throw new Error("Invalid backup format");
        }
        await saveProjectsToDB(backup.data);
        return backup.data;
    } catch (e) {
        throw new Error("Failed to parse or import backup file.");
    }
};
