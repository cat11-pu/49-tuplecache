// cache.js：缓存读。条目形如 { value, watermark }（裸值按水位 0 处理），
// 只有条目水位不低于读要求水位 need 才算命中；标 stale 的条目不得当命中返回。
export function lookup(entries, key, need) {
  const required = typeof need === "number" ? need : 0;
  const source = entries || {};
  if (!Object.prototype.hasOwnProperty.call(source, key)) {
    return { value: null, hit: false, watermark: 0 };
  }
  const raw = source[key];
  const boxed = raw !== null && typeof raw === "object";
  const watermark = boxed && typeof raw.watermark === "number" ? raw.watermark : 0;
  if (boxed && raw.stale === true) {
    return { value: null, hit: false, watermark: watermark };
  }
  const value = boxed && "value" in raw ? raw.value : raw;
  const hit = watermark >= required;
  return { value: hit ? value : null, hit: hit, watermark: watermark };
}
