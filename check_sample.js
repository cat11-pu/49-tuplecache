import fs from "node:fs";
import { lookup } from "./cache.js";
import { invalidate } from "./invalidate.js";
import { render } from "./app.js";

// 验收断言：上面每条值收进 emit，最后与期望值逐项比对，不符就非零退出。
const __lines = [];
function emit(label, value) { __lines.push([String(label).replace(/ =$/, ""), value]); }


const spec = JSON.parse(fs.readFileSync(process.argv[2] || "sample/cache.json", "utf8"));
let hitCount = 0;
const detail = [];
for (const read of spec.reads || []) {
  const result = lookup(spec.entries || {}, read.key, read.need);
  detail.push([read.key, result.hit]);
  if (result.hit) hitCount += 1;
}
const after = invalidate(spec.entries || {}, spec.writes || [], spec.ranges || [], spec.budget);
const view = render(spec);

emit("每次读是否命中 =", detail);
emit("命中数 =", hitCount);
emit("失效的键 =", after.invalidated);
emit("重建的键 =", after.rebuilt);
emit("预算不足标陈旧的键 =", after.stale);
emit("水位是否满足 =", view.consistent);
emit("范围非法的错误码 =", spec.bad_range_code);


// ---- 期望值（参考模型算出，与题面给的验收数值一致）----
const EXPECTED = {
  "每次读是否命中": [
    [
      "user:1",
      true
    ],
    [
      "user:2",
      false
    ],
    [
      "order:1",
      true
    ]
  ],
  "命中数": 2,
  "失效的键": [
    "user:1",
    "user:2"
  ],
  "重建的键": [
    "user:1",
    "user:2"
  ],
  "预算不足标陈旧的键": [],
  "水位是否满足": true,
  "范围非法的错误码": "E_BAD_RANGE"
};
let __bad = 0;
for (const [label, want] of Object.entries(EXPECTED)) {
  const found = __lines.find((pair) => pair[0] === label);
  if (!found) { __bad += 1; console.log("缺失验收项 " + label); continue; }
  const got = found[1];
  if (JSON.stringify(got) === JSON.stringify(want)) { console.log("一致 " + label + " = " + JSON.stringify(got)); }
  else { __bad += 1; console.log("不一致 " + label + " 期望 " + JSON.stringify(want) + " 实际 " + JSON.stringify(got)); }
}
console.log("验收项 " + (Object.keys(EXPECTED).length - __bad) + "/" + Object.keys(EXPECTED).length + " 通过");
process.exit(__bad === 0 ? 0 : 1);
