import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), '.cache');
const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheItem<T> {
  timestamp: number;
  data: T;
}

// Ensure cache directory exists
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    ensureCacheDir();
    const filePath = path.join(CACHE_DIR, `${encodeURIComponent(key)}.json`);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const cachedItem: CacheItem<T> = JSON.parse(fileContent);
    
    const now = Date.now();
    if (now - cachedItem.timestamp > CACHE_EXPIRATION_MS) {
      // Cache expired
      return null;
    }
    
    return cachedItem.data;
  } catch (error) {
    console.error(`Error reading cache for key ${key}:`, error);
    return null;
  }
}

export async function setCache<T>(key: string, data: T): Promise<void> {
  try {
    ensureCacheDir();
    const filePath = path.join(CACHE_DIR, `${encodeURIComponent(key)}.json`);
    
    const cacheItem: CacheItem<T> = {
      timestamp: Date.now(),
      data,
    };
    
    fs.writeFileSync(filePath, JSON.stringify(cacheItem, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing cache for key ${key}:`, error);
  }
}

export async function clearCache(key: string): Promise<void> {
  try {
    ensureCacheDir();
    const filePath = path.join(CACHE_DIR, `${encodeURIComponent(key)}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`Error clearing cache for key ${key}:`, error);
  }
}
