import assert from "node:assert";
import { lookup } from "../cache.js";
import { invalidate } from "../invalidate.js";
import { render } from "../app.js";

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("lookup reports hit", () => {
  assert.strictEqual(typeof lookup({ a: 1 }, "a").hit, "boolean");
});

check("lookup reports watermark", () => {
  assert.strictEqual(typeof lookup({ a: 1 }, "a").watermark, "number");
});

check("invalidate returns rebuilt", () => {
  assert.ok(Array.isArray(invalidate({}, [], [], 2).rebuilt));
});

check("invalidate returns stale", () => {
  assert.ok(Array.isArray(invalidate({}, [], [], 2).stale));
});

check("render exposes hit_count", () => {
  assert.strictEqual(typeof render({ entries: {}, reads: [], budget: 2 }).hit_count, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
