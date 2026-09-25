// app.js：渲染结果
import { lookup } from "./cache.js";
import { invalidate } from "./invalidate.js";

export function render(spec) {
  const hits = [];
  let hitCount = 0;
  let consistent = true;
  for (const read of spec.reads || []) {
    const need = typeof read.need === "number" ? read.need : 0;
    const result = lookup(spec.entries || {}, read.key, need);
    hits.push([read.key, result.hit]);
    if (result.hit) {
      hitCount += 1;
      if (result.watermark < need) consistent = false;
    }
  }
  const after = invalidate(spec.entries || {}, spec.writes || [], spec.ranges || [], spec.budget);
  const staleKeys = new Set(after.stale);
  for (const pair of hits) {
    if (pair[1] && staleKeys.has(pair[0])) consistent = false;
  }
  return { hits: hits, hit_count: hitCount, invalidated: after.invalidated,
           rebuilt: after.rebuilt, stale: after.stale, consistent: consistent };
}
