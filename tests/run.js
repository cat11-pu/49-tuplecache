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

check("lookup misses when watermark below need", () => {
  const entries = { a: { value: 1, watermark: 5 } };
  assert.strictEqual(lookup(entries, "a", 6).hit, false);
  assert.strictEqual(lookup(entries, "a", 5).hit, true);
});

check("lookup never hits stale entries", () => {
  const entries = { a: { value: 1, watermark: 9, stale: true } };
  assert.strictEqual(lookup(entries, "a", 0).hit, false);
});

check("invalidate honors writes, ranges and budget", () => {
  const entries = {
    "user:1": { value: "alice", watermark: 3 },
    "user:2": { value: "bob", watermark: 5 },
    "order:1": { value: 42, watermark: 6 },
  };
  const out = invalidate(entries, [{ key: "user:1", watermark: 7 }],
    [{ prefix: "user:", watermark: 6 }], 1);
  assert.deepStrictEqual(out.invalidated, ["user:1", "user:2"]);
  assert.deepStrictEqual(out.rebuilt, ["user:1"]);
  assert.deepStrictEqual(out.stale, ["user:2"]);
  assert.strictEqual(out.entries["user:2"].stale, true);
  assert.strictEqual(out.entries["user:1"].watermark, 7);
});

check("invalidate rejects empty prefix with E_BAD_RANGE", () => {
  assert.throws(() => invalidate({ a: 1 }, [], [{ prefix: "", watermark: 1 }], 2),
    (error) => error.code === "E_BAD_RANGE");
});

console.log("9 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
