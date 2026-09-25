// invalidate.js：失效与重建。
// 写入使同键条目失效；前缀范围使以该前缀开头且条目水位不超过范围水位的条目失效。
// 重建受预算限制，超预算的失效条目标 stale（lookup 不得当命中返回）。
// 非法范围（空前缀、非字符串前缀、水位非有限数）抛 code 为 E_BAD_RANGE 的错误，
// 不得静默全部失效。前缀匹配只做一次线性扫描，重建不重扫。
function badRange() {
  const error = new Error("invalid range: prefix must be a non-empty string and watermark a finite number");
  error.code = "E_BAD_RANGE";
  return error;
}

function entryWatermark(raw) {
  return raw !== null && typeof raw === "object" && typeof raw.watermark === "number" ? raw.watermark : 0;
}

export function invalidate(entries, writes, ranges, budget) {
  const source = entries || {};
  const writeList = writes || [];
  const rangeList = ranges || [];
  for (const range of rangeList) {
    if (!range || typeof range.prefix !== "string" || range.prefix.length === 0 ||
        typeof range.watermark !== "number" || !Number.isFinite(range.watermark)) {
      throw badRange();
    }
  }
  const limit = typeof budget === "number" && Number.isFinite(budget) ? Math.max(0, Math.floor(budget)) : 0;

  const invalidated = [];
  const bump = new Map();
  const mark = function (key, watermark) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) return;
    if (!bump.has(key)) {
      bump.set(key, watermark);
      invalidated.push(key);
    } else if (watermark > bump.get(key)) {
      bump.set(key, watermark);
    }
  };

  const writeWatermark = new Map();
  for (const write of writeList) {
    if (!write || typeof write.key !== "string") continue;
    const watermark = typeof write.watermark === "number" ? write.watermark : 0;
    if (!writeWatermark.has(write.key) || watermark > writeWatermark.get(write.key)) {
      writeWatermark.set(write.key, watermark);
    }
  }
  for (const pair of writeWatermark) mark(pair[0], pair[1]);

  if (rangeList.length > 0) {
    for (const key of Object.keys(source)) {
      const watermark = entryWatermark(source[key]);
      for (const range of rangeList) {
        if (key.startsWith(range.prefix) && watermark <= range.watermark) {
          mark(key, range.watermark);
        }
      }
    }
  }

  const rebuilt = invalidated.slice(0, limit);
  const stale = invalidated.slice(limit);
  const next = Object.assign({}, source);
  for (const key of rebuilt) {
    const raw = source[key];
    const boxed = raw !== null && typeof raw === "object";
    const base = boxed ? Object.assign({}, raw) : { value: raw };
    delete base.stale;
    base.watermark = Math.max(entryWatermark(raw), bump.get(key));
    next[key] = base;
  }
  for (const key of stale) {
    const raw = source[key];
    const boxed = raw !== null && typeof raw === "object";
    const base = boxed ? Object.assign({}, raw) : { value: raw, watermark: 0 };
    base.stale = true;
    next[key] = base;
  }
  return { entries: next, invalidated: invalidated, rebuilt: rebuilt, stale: stale };
}
