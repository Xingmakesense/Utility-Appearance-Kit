import { readFileSync } from "node:fs";

import { atomicSave, compactStats, expandStats, sanitizeStats } from "./usage-cache.js";

export const LEDGER_VERSION = 2;

/**
 * Read one lifetime row per session. Rows survive deletion of their source log.
 */
export function loadLedger(file) {
  const sessions = new Map();
  if (typeof file !== "string" || file === "") return sessions;
  // A damaged primary file must not hide the last complete lifetime snapshot.
  // Each row is validated independently so one bad row cannot erase the rest.
  for (const candidate of [file, `${file}.bak`]) {
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(candidate, "utf8"));
    } catch {
      continue;
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) continue;
    if (parsed.version !== LEDGER_VERSION || parsed.sessions === null
      || typeof parsed.sessions !== "object" || Array.isArray(parsed.sessions)) continue;
    for (const [key, raw] of Object.entries(parsed.sessions)) {
      if (key === "") continue;
      const stats = sanitizeStats(expandStats(raw));
      if (stats !== null) sessions.set(key, stats);
    }
    return sessions;
  }
  return sessions;
}

/** Whole-row replacement is performed by the store; this only persists the map. */
export function saveLedger(file, ledger) {
  const payload = { version: LEDGER_VERSION, savedAt: Date.now(), sessions: Object.create(null) };
  for (const [key, stats] of ledger) {
    if (key !== "" && sanitizeStats(stats) !== null) payload.sessions[key] = compactStats(stats);
  }
  return atomicSave(file, payload, { backup: true });
}
