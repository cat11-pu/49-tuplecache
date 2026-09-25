// cache.js：缓存读写（水位感知：条目水位不低于读要求水位才算命中）
function normalize(entry) {
  if (entry && typeof entry === "object" && "value" in entry) {
    return { value: entry.value, watermark: Number(entry.watermark) || 0, stale: entry.stale === true };
  }
  return { value: entry, watermark: 0, stale: false };
}

export function lookup(entries, key, need) {
  const required = typeof need === "number" ? need : 0;
  if (!entries || !Object.prototype.hasOwnProperty.call(entries, key)) {
    return { value: null, hit: false, watermark: 0 };
  }
  const entry = normalize(entries[key]);
  if (entry.stale || entry.watermark < required) {
    return { value: null, hit: false, watermark: entry.watermark };
  }
  return { value: entry.value, hit: true, watermark: entry.watermark };
}

export { normalize };
