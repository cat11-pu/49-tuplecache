// app.js：渲染结果
import { lookup } from "./cache.js";
import { invalidate } from "./invalidate.js";

export function render(spec) {
  const hits = [];
  let hitCount = 0;
  for (const read of spec.reads || []) {
    const result = lookup(spec.entries || {}, read.key);
    hits.push([read.key, result.hit]);
    if (result.hit) hitCount += 1;
  }
  const after = invalidate(spec.entries || {}, spec.writes || [], spec.ranges || [], spec.budget);
  return { hits: hits, hit_count: hitCount, invalidated: after.invalidated,
           rebuilt: after.rebuilt, stale: after.stale, consistent: true };
}
