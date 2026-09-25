// invalidate.js：失效与重建（基线：全部失效、不按预算）
export function invalidate(entries, writes, ranges, budget) {
  return { entries: {}, invalidated: Object.keys(entries), rebuilt: [], stale: [] };
}
