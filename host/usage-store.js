import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

import {
  dshHome,
  hasParseCache,
  ledgerBackupFile,
  ledgerFile,
  loadParseCache,
  parseCacheFile,
  saveParseCache,
} from "./usage-cache.js";
import { loadLedger, saveLedger } from "./usage-ledger.js";

const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);
const ZSTD_DECOMPRESS = typeof zlib.zstdDecompressSync === "function"
  ? zlib.zstdDecompressSync.bind(zlib)
  : null;

export const SESSIONS_ROOT = path.join(dshHome(), "sessions");
export const DEFAULT_CACHE_FILE = parseCacheFile();
export const DEFAULT_LEDGER_FILE = ledgerFile();
export const HOT_GRACE_MS = 3000;
export const HOT_TAIL_BYTES = 256 * 1024;
export const WALK_TTL_MS = 10000;
export const PREWARM_FRAMES_PER_YIELD = 128;

export function emptyUsageSummary() {
  return {
    generatedAt: Date.now(),
    firstDay: null,
    sessionsByDay: {},
    perDay: {},
  };
}

function tokenCount(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function localDayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function timeBucket(time) {
  if (typeof time !== "number" || !Number.isFinite(time)) return null;
  const date = new Date(time);
  if (!Number.isFinite(date.getTime())) return null;
  return { day: localDayKey(date), hour: date.getHours() };
}

function emptyDay() {
  return {
    tokens: 0,
    messages: 0,
    hours: new Array(24).fill(0),
    messageHours: new Array(24).fill(0),
    models: Object.create(null),
  };
}

function cloneDay(value) {
  return {
    ...value,
    hours: value.hours.slice(),
    messageHours: value.messageHours.slice(),
    models: Object.assign(Object.create(null), value.models),
  };
}

function emptyFileStats() {
  return { hasUserMessage: false, firstUserDay: null, perDay: Object.create(null) };
}

function prepareStats(state, time) {
  if (typeof time !== "number" || !Number.isFinite(time)) return null;
  if (state.dayTime === time) return state.stats;
  const bucket = timeBucket(time);
  if (bucket === null) return null;
  if (!state.copied) {
    state.stats = { ...state.stats, perDay: Object.assign(Object.create(null), state.stats.perDay) };
    state.copied = true;
  }
  state.dayTime = time;
  return { stats: state.stats, bucket };
}

function applyRecord(line, state) {
  let record;
  try {
    record = JSON.parse(line);
  } catch {
    return;
  }
  if (record === null || typeof record !== "object") return;
  const data = record.data;

  if (record.type === "request/header") {
    const model = data?.header?.config?.model;
    if (typeof model === "string" && model !== "") state.currentModel = model;
    return;
  }
  if (record.type === "model/selection") {
    if (typeof data?.model === "string" && data.model !== "") state.currentModel = data.model;
    return;
  }
  if (record.type !== "user/message" && record.type !== "assistant/message") return;

  const prepared = prepareStats(state, record.time);
  if (prepared === null) {
    // A user message still makes this a real session, even with a bad time.
    if (record.type === "user/message" && !state.copied) {
      state.stats = { ...state.stats, perDay: Object.assign(Object.create(null), state.stats.perDay) };
      state.copied = true;
    }
    if (record.type === "user/message") state.stats.hasUserMessage = true;
    return;
  }
  const { stats, bucket } = prepared;
  if (!Object.hasOwn(stats.perDay, bucket.day)) stats.perDay[bucket.day] = emptyDay();
  else if (!state.copiedDays.has(bucket.day)) {
    stats.perDay[bucket.day] = cloneDay(stats.perDay[bucket.day]);
    state.copiedDays.add(bucket.day);
  }
  const target = stats.perDay[bucket.day];
  if (record.type === "user/message") {
    stats.hasUserMessage = true;
    target.messages += 1;
    target.messageHours[bucket.hour] += 1;
    if (stats.firstUserDay === null || bucket.day < stats.firstUserDay) stats.firstUserDay = bucket.day;
    return;
  }

  const usage = data?.usage;
  const total = usage !== null && typeof usage === "object"
    ? (usage.totalTokens === undefined || usage.totalTokens === null
      ? tokenCount(usage.inputTokens) + tokenCount(usage.outputTokens)
      : tokenCount(usage.totalTokens))
    : 0;
  target.messages += 1;
  target.tokens += total;
  target.hours[bucket.hour] += total;
  target.messageHours[bucket.hour] += 1;
  if (state.currentModel !== null) {
    const models = target.models;
    if (!Object.hasOwn(models, state.currentModel)) {
      models[state.currentModel] = { tokens: 0, messages: 0 };
    } else {
      models[state.currentModel] = { ...models[state.currentModel] };
    }
    models[state.currentModel].tokens += total;
    models[state.currentModel].messages += 1;
  }
}

function applyText(text, state) {
  let start = 0;
  while (start < text.length) {
    let end = text.indexOf("\n", start);
    if (end === -1) end = text.length;
    const line = text.slice(start, end);
    if (line.trim() !== "") applyRecord(line, state);
    start = end + 1;
  }
}

function frameOffsets(buffer) {
  const offsets = [];
  let at = buffer.indexOf(ZSTD_MAGIC);
  while (at !== -1) {
    offsets.push(at);
    at = buffer.indexOf(ZSTD_MAGIC, at + ZSTD_MAGIC.length);
  }
  return offsets;
}

function decodeFrame(buffer, start, end, decompress) {
  try {
    return decompress(buffer.subarray(start, end)).toString("utf8");
  } catch {
    // A torn frame or false magic in its payload must not discard other frames.
    return null;
  }
}

async function parseSession(readFile, file, cached, decompress, background, framesPerYield, yieldFn) {
  let buffer;
  try {
    buffer = readFile(file);
  } catch {
    return cached === undefined ? null : { ...cached, mtimeMs: null };
  }
  const state = {
    stats: emptyFileStats(),
    currentModel: null,
    copiedDays: new Set(),
    dayTime: null,
  };
  const offsets = frameOffsets(buffer);
  const batch = Math.max(1, framesPerYield);
  // Rebuild a changed session as a whole. A writer may extend its last frame
  // in place, so a byte offset alone cannot safely identify new records.
  for (let index = 0; index < offsets.length; index += 1) {
    const at = offsets[index];
    const end = index + 1 < offsets.length ? offsets[index + 1] : buffer.length;
    const text = decodeFrame(buffer, at, end, decompress);
    if (text !== null) applyText(text, state);
    if (background && (index + 1) % batch === 0 && index + 1 < offsets.length) await yieldFn();
  }
  return { size: buffer.length, stats: state.stats };
}

function findSessionFiles(root) {
  const files = [];
  function walk(directory) {
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith(".zstd")) files.push(full);
    }
  }
  walk(root);
  return files;
}

export function sessionKeyOf(file) {
  const directory = path.basename(path.dirname(String(file)));
  return directory.startsWith("session-") ? directory.slice("session-".length) : directory;
}

function mergeStats(summary, stats) {
  if (stats.firstUserDay !== null) {
    summary.sessionsByDay[stats.firstUserDay] = (summary.sessionsByDay[stats.firstUserDay] ?? 0) + 1;
  }
  for (const [day, source] of Object.entries(stats.perDay)) {
    if (!Object.hasOwn(summary.perDay, day)) summary.perDay[day] = emptyDay();
    const target = summary.perDay[day];
    target.tokens += source.tokens;
    target.messages += source.messages;
    for (let hour = 0; hour < 24; hour += 1) {
      target.hours[hour] += source.hours[hour];
      target.messageHours[hour] += source.messageHours[hour];
    }
    for (const [model, value] of Object.entries(source.models)) {
      if (!Object.hasOwn(target.models, model)) target.models[model] = { tokens: 0, messages: 0 };
      target.models[model].tokens += value.tokens;
      target.models[model].messages += value.messages;
    }
    if (source.tokens > 0 && (summary.firstDay === null || day < summary.firstDay)) summary.firstDay = day;
  }
}

function buildSummary(lifetime) {
  const summary = emptyUsageSummary();
  for (const stats of lifetime.values()) mergeStats(summary, stats);
  return summary;
}

function yieldToEventLoop() {
  return new Promise((resolve) => setImmediate(resolve));
}

/** Independent store state, with fixed session and persistence locations by default. */
export function createUsageStore({
  root = SESSIONS_ROOT,
  cacheFile = DEFAULT_CACHE_FILE,
  lifetimeLedgerFile = DEFAULT_LEDGER_FILE,
  readFile = readFileSync,
  decompress = ZSTD_DECOMPRESS,
  now = Date.now,
  graceMs = HOT_GRACE_MS,
  tailBytes = HOT_TAIL_BYTES,
  walkTtlMs = WALK_TTL_MS,
  framesPerYield = PREWARM_FRAMES_PER_YIELD,
  yieldFn = yieldToEventLoop,
} = {}) {
  let cache = new Map();
  let cacheLoaded = false;
  let cacheSaved = false;
  let ledger = new Map();
  let ledgerLoaded = false;
  let ledgerSaved = false;
  let summary = null;
  let directoryWalk = null;
  let inflight = null;
  let forceTail = Promise.resolve();

  function loadPersisted() {
    if (!ledgerLoaded) {
      ledger = lifetimeLedgerFile === null ? new Map() : loadLedger(lifetimeLedgerFile);
      ledgerLoaded = true;
    }
    if (!cacheLoaded) {
      cache = cacheFile === null ? new Map() : loadParseCache(cacheFile, ledger);
      cacheLoaded = true;
    }
    if (summary === null) summary = buildSummary(ledger);
    return summary;
  }

  function start(request) {
    const job = run(request);
    const shared = job.then((result) => {
      if (inflight === shared) inflight = null;
      return result;
    }, (error) => {
      if (inflight === shared) inflight = null;
      throw error;
    });
    inflight = shared;
    return shared;
  }

  async function run({ force = false, background = false } = {}) {
    loadPersisted();
    if (decompress === null) {
      return { ...summary, error: "zlib.zstdDecompressSync is unavailable in this Node runtime; session logs cannot be read" };
    }
    if (force) {
      cache = new Map();
      directoryWalk = null;
    }

    let files;
    if (!force && directoryWalk !== null && now() - directoryWalk.at <= walkTtlMs) {
      files = directoryWalk.files;
    } else {
      files = findSessionFiles(root);
      directoryWalk = { files, at: now() };
    }

    let stale = false;
    let cacheDirty = false;
    let ledgerDirty = false;
    const next = new Map();
    for (const file of files) {
      let stat;
      try {
        stat = statSync(file);
      } catch {
        continue;
      }
      const cached = cache.get(file);
      let entry = cached;
      const unchanged = cached !== undefined && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size;
      const grown = cached === undefined ? -1 : stat.size - cached.size;
      const hotTail = cached !== undefined && grown >= 0 && grown <= tailBytes && now() - stat.mtimeMs <= graceMs;
      if (!force && hotTail) {
        stale = true;
      } else if (force || !unchanged) {
        const parsed = await parseSession(readFile, file, cached, decompress, background, framesPerYield, yieldFn);
        if (parsed !== null) {
          entry = {
            mtimeMs: stat.mtimeMs,
            size: parsed.size,
            stats: parsed.stats,
          };
          cacheDirty = true;
          const stats = parsed.stats;
          if (stats.hasUserMessage && (stats.firstUserDay !== null || Object.values(stats.perDay).some((day) => day.tokens > 0 || day.messages > 0))) {
            const key = sessionKeyOf(file);
            // Cache and lifetime history share one immutable row. A rebuild
            // replaces that row; deleting a log never deletes the row.
            if (ledger.get(key) !== stats) {
              ledger.set(key, stats);
              ledgerDirty = true;
            }
          }
        } else {
          cacheDirty = true;
        }
      }
      if (entry !== undefined) next.set(file, entry);
    }
    if (next.size !== cache.size || [...next.keys()].some((file) => !cache.has(file))) cacheDirty = true;
    cache = next;
    if (ledgerDirty || summary === null) summary = buildSummary(ledger);
    const result = stale ? { ...summary, stale: true } : summary;

    if (cacheFile !== null && (cacheDirty || !cacheSaved)) {
      cacheSaved = saveParseCache(cacheFile, cache) || cacheSaved;
    }
    if (lifetimeLedgerFile !== null && (ledgerDirty || !ledgerSaved)) {
      ledgerSaved = saveLedger(lifetimeLedgerFile, ledger) || ledgerSaved;
    }
    return result;
  }

  function aggregate(options = {}) {
    const request = options || {};
    if (request.force !== true) {
      if (!ledgerLoaded && request.background !== true && lifetimeLedgerFile !== null && inflight === null) {
        const persisted = loadPersisted();
        if (persisted.firstDay !== null || Object.keys(persisted.perDay).length > 0) {
          // The opening card uses the complete lifetime snapshot immediately.
          // A queued background pass still discovers and appends new records.
          setImmediate(() => { void aggregate({ background: true }).catch(() => {}); });
          return Promise.resolve({ ...persisted, stale: true });
        }
      }
      return inflight === null ? start(request) : inflight;
    }
    // Force requests are serialized too; every one waits for all prior I/O.
    const forced = forceTail.then(async () => {
      if (inflight !== null) await inflight.catch(() => {});
      return start({ ...request, force: true });
    });
    forceTail = forced.then(() => undefined, () => undefined);
    return forced;
  }

  return { aggregate };
}

const defaultStore = createUsageStore();

export function hasPersistedUsageCache() {
  return hasParseCache(DEFAULT_CACHE_FILE) || hasParseCache(DEFAULT_LEDGER_FILE) || hasParseCache(ledgerBackupFile());
}

export function aggregateUsage(options = {}) {
  return defaultStore.aggregate(options);
}
