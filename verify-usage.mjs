import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createUsageStore } from "./host/usage-store.js";
import { compactStats, expandStats, sanitizeStats, loadParseCache } from "./host/usage-cache.js";
import { loadLedger, saveLedger } from "./host/usage-ledger.js";
import { refuseRequest } from "./host/usage-route.js";

const root = path.join(process.cwd(), "tmp", "usage-verification");
rmSync(root, { recursive: true, force: true });
const logs = path.join(root, "logs", "session-first");
mkdirSync(logs, { recursive: true });
const cacheFile = path.join(root, "cache", "parse-cache.json");
const ledgerFile = path.join(root, "cache", "ledger.json");
const at = (day, hour) => new Date(`${day}T${String(hour).padStart(2, "0")}:00:00+08:00`).getTime();
const records = [
    { type: "request/header", data: { header: { config: { model: "deepseek-flash" } } }, time: at("2026-01-01", 1) },
    { type: "user/message", time: at("2026-01-01", 1), data: {} },
    { type: "assistant/message", time: at("2026-02-01", 14), data: { usage: { inputTokens: 30000, outputTokens: 20000 } } },
    { type: "model/selection", data: { model: "k3.1-pro" }, time: at("2026-02-02", 14) },
    { type: "assistant/message", time: at("2026-02-02", 14), data: { usage: { totalTokens: 75000 } } },
    { type: "broken", time: 1 },
];
const frames = records.map((record) => zlib.zstdCompressSync(Buffer.from(JSON.stringify(record) + "\n")));
writeFileSync(path.join(logs, "session.v4.jsonl.zstd"), Buffer.concat(frames));
const store = createUsageStore({ root: path.join(root, "logs"), cacheFile, lifetimeLedgerFile: ledgerFile });
const summary = await store.aggregate();
assert.equal(summary.firstDay, "2026-02-01");
assert.equal(summary.sessionsByDay["2026-01-01"], 1);
assert.equal(summary.perDay["2026-02-01"].tokens, 50000);
assert.equal(summary.perDay["2026-02-01"].messageHours[14], 1);
assert.equal(summary.perDay["2026-02-02"].models["k3.1-pro"].tokens, 75000);
const cached = await store.aggregate({ force: true });
assert.deepEqual(cached.perDay, summary.perDay, "force rereads without duplicating or clearing the ledger");
const parsedCache = JSON.parse(readFileSync(cacheFile, "utf8"));
const parsedLedger = JSON.parse(readFileSync(ledgerFile, "utf8"));
assert.equal(parsedCache.version, 2);
assert.equal(parsedLedger.version, 2);
const row = Object.values(parsedLedger.sessions)[0];
assert.equal(row.perDay["2026-02-01"].hours.length, 1, "only nonzero token hours are persisted");
assert.equal(row.perDay["2026-02-01"].messageHours.length, 1);
assert.equal(Array.isArray(row.perDay["2026-02-01"].models), true, "model counters use compact tuples");
assert.equal(JSON.stringify(row).includes('"prompt"'), false, "no prompt text is persisted");
const expanded = sanitizeStats(expandStats(row));
assert.equal(expanded.perDay["2026-02-01"].hours[14], 50000);
assert.equal(expanded.perDay["2026-02-01"].messageHours[14], 1);
assert.equal(expanded.perDay["2026-02-02"].models["k3.1-pro"].tokens, 75000);
const ledger = loadLedger(ledgerFile);
assert.equal(ledger.size, 1);
assert.equal(saveLedger(ledgerFile, ledger), true);
rmSync(logs, { recursive: true, force: true });
const afterDelete = await store.aggregate();
assert.equal(afterDelete.perDay["2026-02-02"].tokens, 75000, "deleted session logs remain in lifetime history");

// An appended frame must inherit the current model and update only the new
// counters. Reopening the store must restore the same lifetime summary without
// resurrecting a deleted DSH session or requiring a full parse-cache copy.
mkdirSync(logs, { recursive: true });
const logFile = path.join(logs, "session.v4.jsonl.zstd");
const appendRecord = (model, day, tokens) => Buffer.from(JSON.stringify({
    type: "assistant/message", time: at(day, 15),
    data: { usage: { totalTokens: tokens } }
}) + "\n");
const initial = Buffer.concat([
    zlib.zstdCompressSync(Buffer.from(JSON.stringify(records[0]) + "\n")),
    zlib.zstdCompressSync(Buffer.from(JSON.stringify(records[1]) + "\n")),
    zlib.zstdCompressSync(Buffer.from(JSON.stringify({ type: "model/selection", data: { model: "deepseek-flash" } }) + "\n")),
    zlib.zstdCompressSync(appendRecord("deepseek-flash", "2026-03-01", 1000)),
]);
writeFileSync(logFile, initial);
const incrementalRoot = path.join(root, "incremental");
const incrementalCache = path.join(incrementalRoot, "parse-cache.json");
const incrementalLedger = path.join(incrementalRoot, "ledger.json");
let incrementalNow = 0;
const incremental = createUsageStore({ root: path.join(root, "logs"), cacheFile: incrementalCache, lifetimeLedgerFile: incrementalLedger, now: () => incrementalNow, graceMs: 0 });
await incremental.aggregate();
const appended = Buffer.concat([initial, zlib.zstdCompressSync(appendRecord("deepseek-flash", "2026-03-02", 2000))]);
writeFileSync(logFile, appended);
incrementalNow = Date.now() + 10000;
const updated = await incremental.aggregate();
assert.equal(updated.perDay["2026-03-01"].tokens, 1000, "the prior frame remains counted once");
assert.equal(updated.perDay["2026-03-02"].tokens, 2000, "the appended frame contributes its new data");
assert.equal(updated.perDay["2026-03-02"].models["deepseek-flash"].tokens, 2000, "the appended frame inherits the current model");
await incremental.aggregate();
assert.equal(updated.perDay["2026-03-02"].tokens, 2000, "unchanged input cannot be counted twice");
const reopened = createUsageStore({ root: path.join(root, "logs"), cacheFile: incrementalCache, lifetimeLedgerFile: incrementalLedger, graceMs: 0 });
const restored = await reopened.aggregate();
assert.equal(restored.stale, true, "a persisted opening snapshot explicitly schedules a freshness pass");
assert.equal(restored.perDay["2026-03-01"].tokens, 1000);
assert.equal(restored.perDay["2026-03-02"].tokens, 2000);
const latest = await reopened.aggregate({ background: true });
assert.equal(latest.perDay["2026-03-02"].tokens, 2000, "the freshness pass returns the latest persisted data");
const persistedProgress = JSON.parse(readFileSync(incrementalCache, "utf8"));
assert.equal(Object.values(persistedProgress.files)[0].stats, undefined, "parse cache no longer duplicates session statistics");
writeFileSync(incrementalLedger, "{broken");
const recovered = loadLedger(incrementalLedger);
assert.equal(recovered.get("first").perDay["2026-03-02"].tokens, 2000, "a damaged primary ledger falls back to its valid backup");
rmSync(logs, { recursive: true, force: true });
const retainedAfterRestart = await reopened.aggregate({ background: true });
assert.equal(retainedAfterRestart.perDay["2026-03-02"].tokens, 2000, "deleting a log after restart still preserves its lifetime row");

// A legacy parse cache can contain the only copy of a session before its
// lifetime row was persisted. Loading it must not silently drop that history.
const legacyLifetime = new Map();
const legacyCache = path.join(root, "legacy-cache.json");
writeFileSync(legacyCache, JSON.stringify({ version: 2, files: {
    [logFile]: { mtimeMs: 1, size: 1, stats: compactStats(recovered.get("first")) }
} }));
loadParseCache(legacyCache, legacyLifetime);
assert.equal(legacyLifetime.get("first").perDay["2026-03-02"].tokens, 2000,
    "a valid legacy cache row is promoted into lifetime history");

// The 2.5.10 regression: a cache row without statistics used to be promoted as
// undefined, and the next summary then crashed on `undefined.perDay`.
const absentCache = path.join(root, "absent-cache.json");
writeFileSync(absentCache, JSON.stringify({ version: 2, files: {
    [logFile]: { mtimeMs: 1, size: 1 }
} }));
const absentLifetime = new Map();
loadParseCache(absentCache, absentLifetime);
assert.equal(absentLifetime.size, 0, "a cache row without statistics is never promoted as undefined");
assert.equal(compactStats(undefined), null, "a missing stats value cannot break ledger serialization");

// One malformed lifetime row must be isolated instead of failing the endpoint.
const guardedCache = path.join(root, "guarded", "parse-cache.json");
const guardedLedger = path.join(root, "guarded", "ledger.json");
mkdirSync(path.dirname(guardedCache), { recursive: true });
writeFileSync(guardedLedger, JSON.stringify({ version: 2, savedAt: 0, sessions: {
    broken: { hasUserMessage: true, firstUserDay: null },
    empty: null
} }));
const guarded = createUsageStore({
    root: path.join(root, "guarded-logs"),
    cacheFile: guardedCache,
    lifetimeLedgerFile: guardedLedger,
    graceMs: 0
});
const guardedSummary = await guarded.aggregate();
assert.equal(guardedSummary.firstDay, null, "a ledger row without perDay is dropped, not merged");
assert.deepEqual(guardedSummary.perDay, {});

const headers = { host: "127.0.0.1:49223", "x-dsh-uak-usage": "1", "sec-fetch-site": "same-origin" };
assert.equal(refuseRequest({ headers }, "http://127.0.0.1:49223"), null);
assert.equal(refuseRequest({ headers: { "x-dsh-uak-usage": "1" } }, "http://127.0.0.1:49223"), null,
    "the desktop forwarder strips host and origin; the private marker still fences it");
assert.equal(refuseRequest({ headers: { "x-dsh-uak-usage": "1", origin: "dsh-app://app" } }, "http://127.0.0.1:49223"), null,
    "the desktop app protocol is a trusted origin");
assert.equal(refuseRequest({ headers: { ...headers, "x-dsh-uak-usage": "0" } }, "http://127.0.0.1:49223"), "missing-marker");
assert.equal(refuseRequest({ headers: { ...headers, host: "evil.example" } }, "http://127.0.0.1:49223"), "foreign-host");
assert.equal(refuseRequest({ headers: { ...headers, "sec-fetch-site": "cross-site" } }, "http://127.0.0.1:49223"), "cross-site");
rmSync(root, { recursive: true, force: true });
console.log("usage: zstd frames, exact daily counters, compact cache, lifetime ledger and request fence passed");
