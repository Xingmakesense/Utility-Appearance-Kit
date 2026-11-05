import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

export const CACHE_VERSION = 2;
const compactHours = (hours) => hours.flatMap((value, hour) => value > 0 ? [[hour, value]] : []);
const expandHours = (hours) => {
    const result = new Array(24).fill(0);
    if (!Array.isArray(hours)) return result;
    for (const entry of hours) {
        if (Array.isArray(entry) && Number.isInteger(entry[0]) && entry[0] >= 0 && entry[0] < 24 && counter(entry[1])) result[entry[0]] = entry[1];
    }
    return result;
};
export function compactStats(stats) {
    if (stats === null) return null;
    return {
        hasUserMessage: stats.hasUserMessage,
        firstUserDay: stats.firstUserDay,
        perDay: Object.fromEntries(Object.entries(stats.perDay || {}).filter(([, day]) => day.tokens > 0 || day.messages > 0).map(([date, day]) => [date, {
            tokens: day.tokens, messages: day.messages,
            hours: compactHours(day.hours), messageHours: compactHours(day.messageHours),
            models: Object.entries(day.models || {}).filter(([, model]) => model.tokens > 0)
                .map(([id, model]) => [id, model.tokens, model.messages]),
        }])),
    };
}
export function expandStats(raw) {
    if (raw === null || raw === undefined || !plainRecord(raw.perDay)) return raw;
    const first = Object.values(raw.perDay)[0];
    if (first === undefined || (!Array.isArray(first.hours?.[0]) && !Array.isArray(first.models))) return raw;
    return {
        hasUserMessage: raw.hasUserMessage, firstUserDay: raw.firstUserDay,
        perDay: Object.fromEntries(Object.entries(raw.perDay).map(([date, day]) => [date, {
            tokens: day.tokens, messages: day.messages,
            hours: expandHours(day.hours), messageHours: expandHours(day.messageHours),
            models: Object.fromEntries((Array.isArray(day.models) ? day.models : []).filter((entry) => Array.isArray(entry) && typeof entry[0] === "string")
                .map(([id, tokens, messages]) => [id, { tokens, messages }])),
        }])),
    };
}

/** The only data directory used by this feature; never the profile or usage-stats. */
export function dshHome() {
  const configured = typeof process.env.DSH_HOME === "string" ? process.env.DSH_HOME.trim() : "";
  return configured === "" ? path.join(os.homedir(), ".dsh") : configured;
}

export function dataDirectory() {
  return path.join(dshHome(), "utility-appearance-kit", "cache");
}

export function parseCacheFile() {
  return path.join(dataDirectory(), "parse-cache.json");
}

export function ledgerFile() {
  return path.join(dataDirectory(), "ledger.json");
}

export function hasParseCache(file) {
  try {
    return typeof file === "string" && file !== "" && existsSync(file);
  } catch {
    return false;
  }
}

function plainRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function counter(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function validDay(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
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

/** Validate both persisted stores before their numbers can reach a Summary. */
export function sanitizeStats(raw) {
  if (!plainRecord(raw) || typeof raw.hasUserMessage !== "boolean") return null;
  if (raw.firstUserDay !== null && !validDay(raw.firstUserDay)) return null;
  if (!plainRecord(raw.perDay)) return null;

  const perDay = Object.create(null);
  for (const [day, value] of Object.entries(raw.perDay)) {
    if (!validDay(day) || !plainRecord(value)) return null;
    if (!counter(value.tokens) || !counter(value.messages)) return null;
    if (!Array.isArray(value.hours) || value.hours.length !== 24 || !value.hours.every(counter)) return null;
    if (!Array.isArray(value.messageHours) || value.messageHours.length !== 24
      || !value.messageHours.every(counter)) return null;
    if (!plainRecord(value.models)) return null;
    const models = Object.create(null);
    for (const [model, modelStats] of Object.entries(value.models)) {
      if (!plainRecord(modelStats) || !counter(modelStats.tokens) || !counter(modelStats.messages)) return null;
      models[model] = { tokens: modelStats.tokens, messages: modelStats.messages };
    }
    const result = emptyDay();
    result.tokens = value.tokens;
    result.messages = value.messages;
    result.hours = value.hours.slice();
    result.messageHours = value.messageHours.slice();
    result.models = models;
    perDay[day] = result;
  }

  return {
    hasUserMessage: raw.hasUserMessage,
    firstUserDay: raw.firstUserDay,
    perDay,
  };
}

export function loadParseCache(file) {
  const files = new Map();
  if (typeof file !== "string" || file === "") return files;
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return files;
  }
  if (!plainRecord(parsed) || parsed.version !== CACHE_VERSION || !plainRecord(parsed.files)) return files;
  for (const [sessionFile, entry] of Object.entries(parsed.files)) {
    if (!plainRecord(entry) || !counter(entry.mtimeMs) || !counter(entry.size)) continue;
    const stats = entry.stats === null ? null : sanitizeStats(expandStats(entry.stats));
    if (entry.stats !== null && stats === null) continue;
    files.set(sessionFile, { mtimeMs: entry.mtimeMs, size: entry.size, stats });
  }
  return files;
}

/** Atomic best-effort persistence. A failed save never escapes into the UI. */
export function atomicSave(file, payload) {
  if (typeof file !== "string" || file === "") return false;
  let text;
  try {
    text = JSON.stringify(payload);
  } catch {
    return false;
  }
  const temporary = `${file}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(temporary, text, "utf8");
    renameSync(temporary, file);
    return true;
  } catch {
    try {
      unlinkSync(temporary);
    } catch {
      // The temporary file may not have been created.
    }
    return false;
  }
}

export function saveParseCache(file, cache) {
  const payload = { version: CACHE_VERSION, savedAt: Date.now(), files: Object.create(null) };
  for (const [sessionFile, entry] of cache) {
    if (!plainRecord(entry) || !counter(entry.mtimeMs) || !counter(entry.size)) continue;
    payload.files[sessionFile] = {
      mtimeMs: entry.mtimeMs,
      size: entry.size,
      stats: compactStats(entry.stats),
    };
  }
  return atomicSave(file, payload);
}
