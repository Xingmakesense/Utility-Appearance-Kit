import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createUsageStore } from "./host/usage-store.js";
import { compactStats, expandStats, sanitizeStats } from "./host/usage-cache.js";
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

const headers = { host: "127.0.0.1:49223", "x-dsh-uak-usage": "1", "sec-fetch-site": "same-origin" };
assert.equal(refuseRequest({ headers }, "http://127.0.0.1:49223"), null);
assert.equal(refuseRequest({ headers: { ...headers, "x-dsh-uak-usage": "0" } }, "http://127.0.0.1:49223"), "missing-marker");
assert.equal(refuseRequest({ headers: { ...headers, host: "evil.example" } }, "http://127.0.0.1:49223"), "foreign-host");
assert.equal(refuseRequest({ headers: { ...headers, "sec-fetch-site": "cross-site" } }, "http://127.0.0.1:49223"), "cross-site");
rmSync(root, { recursive: true, force: true });
console.log("usage: zstd frames, exact daily counters, compact cache, lifetime ledger and request fence passed");
