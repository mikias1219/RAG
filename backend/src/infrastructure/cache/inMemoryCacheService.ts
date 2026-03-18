import type { CacheService } from "@/domain/ports/cacheService";

type Entry = { expiresAt?: number; value: unknown };

export class InMemoryCacheService implements CacheService {
  private readonly store = new Map<string, Entry>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, opts?: { ttlSeconds?: number }): Promise<void> {
    const ttlMs = opts?.ttlSeconds ? opts.ttlSeconds * 1000 : undefined;
    this.store.set(key, { value, expiresAt: ttlMs ? Date.now() + ttlMs : undefined });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

