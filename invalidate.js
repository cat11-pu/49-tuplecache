// invalidate.js：失效与重建（写入失效同键、前缀范围失效低水位条目、重建受预算限制）
import { normalize } from "./cache.js";

function badRange(message) {
  const error = new Error(message);
  error.code = "E_BAD_RANGE";
  return error;
}

export function invalidate(entries, writes, ranges, budget) {
  const source = entries || {};

  const writeMarks = new Map();
  for (const write of writes || []) {
    if (!write || typeof write.key !== "string") continue;
    const mark = Number(write.watermark) || 0;
    writeMarks.set(write.key, writeMarks.has(write.key) ? Math.max(writeMarks.get(write.key), mark) : mark);
  }

  const cleanRanges = [];
  for (const range of ranges || []) {
    const prefix = range && range.prefix;
    const mark = range && range.watermark;
    if (typeof prefix !== "string" || prefix.length === 0) {
      throw badRange("E_BAD_RANGE: range prefix must be a non-empty string");
    }
    if (typeof mark !== "number" || !Number.isFinite(mark)) {
      throw badRange("E_BAD_RANGE: range watermark must be a finite number");
    }
    cleanRanges.push({ prefix: prefix, watermark: mark });
  }

  const limit = typeof budget === "number" && Number.isFinite(budget)
    ? Math.max(0, Math.floor(budget))
    : Infinity;

  // 单次线性扫描：每条目只查一次写入表与范围表，重建阶段不再重扫。
  const invalidated = [];
  const marks = new Map();
  for (const key of Object.keys(source)) {
    const entry = normalize(source[key]);
    let mark = null;
    if (writeMarks.has(key)) mark = writeMarks.get(key);
    for (const range of cleanRanges) {
      if (entry.watermark <= range.watermark && key.startsWith(range.prefix)) {
        mark = mark === null ? range.watermark : Math.max(mark, range.watermark);
      }
    }
    if (mark !== null) {
      invalidated.push(key);
      marks.set(key, mark);
    }
  }

  const result = {};
  for (const key of Object.keys(source)) {
    if (!marks.has(key)) result[key] = source[key];
  }
  const rebuilt = [];
  const stale = [];
  for (const key of invalidated) {
    const entry = normalize(source[key]);
    if (rebuilt.length < limit) {
      result[key] = { value: entry.value, watermark: marks.get(key) };
      rebuilt.push(key);
    } else {
      // 预算不足：标陈旧，lookup 不得把它当命中返回。
      result[key] = { value: entry.value, watermark: entry.watermark, stale: true };
      stale.push(key);
    }
  }
  return { entries: result, invalidated: invalidated, rebuilt: rebuilt, stale: stale };
}
