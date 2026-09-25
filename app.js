// app.js：渲染结果
import { lookup } from "./cache.js";
import { invalidate } from "./invalidate.js";

export function render(spec) {
  const entries = spec.entries || {};
  const hits = [];
  let hitCount = 0;
  let consistent = true;
  for (const read of spec.reads || []) {
    const need = typeof read.need === "number" ? read.need : 0;
    const result = lookup(entries, read.key, need);
    hits.push([read.key, result.hit]);
    if (result.hit) {
      hitCount += 1;
      if (result.watermark < need) consistent = false;
    }
  }
  const after = invalidate(entries, spec.writes || [], spec.ranges || [], spec.budget);
  return { hits: hits, hit_count: hitCount, invalidated: after.invalidated,
           rebuilt: after.rebuilt, stale: after.stale, consistent: consistent };
}
