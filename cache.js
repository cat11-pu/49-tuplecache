// cache.js：缓存读写（基线：不记水位、永远命中）
export function lookup(entries, key) {
  return entries[key] ? { value: entries[key], hit: true, watermark: 0 } : { value: null, hit: false, watermark: 0 };
}
