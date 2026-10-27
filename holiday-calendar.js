/**
 * DeepSeek peak/valley holiday calendar.
 *
 * DeepSeek's published rule is: peak = Monday–Friday (excluding Chinese
 * statutory holidays) 09:00–12:00 and 14:00–18:00 Beijing time; every other
 * hour, plus all weekends and statutory holidays, is valley (half price).
 * Only the statutory holiday dates are needed: a make-up workday that falls on
 * a Saturday stays a weekend and therefore stays valley.
 *
 * The packaged `holidays.json` is the offline baseline. Once per Beijing
 * calendar month the host asks a public holiday dataset for the current (and,
 * from October, the next) year, merges it into
 * `<profile>/.utility-appearance-kit/holidays.json`, and serves the merged result to
 * the client through a read-only JSON route. The whole path is HTTP + files:
 * no model call, no session, no token.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const FETCH_TIMEOUT_MS = 8_000;
const RETRY_AFTER_MS = 20 * 3600 * 1000;
const VERSION = 1;

function sourcesFor(year) {
    return [
        `https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/${year}.json`,
        `https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/${year}.json`,
        `https://fastly.jsdelivr.net/gh/NateScarlet/holiday-cn@master/${year}.json`
    ];
}

function profileRoot() {
    return process.env.DSH_PROFILE_DIR
        ?? join(homedir(), ".dsh", "profiles", process.env.DSH_PROFILE ?? "desktop");
}

/** Absolute path of the writable monthly calendar cache. */
export function storePath() {
    return join(profileRoot(), ".utility-appearance-kit", "holidays.json");
}

function baselinePath() {
    return new URL("./holidays.json", import.meta.url);
}

function readJson(path) {
    try {
        return JSON.parse(readFileSync(path, "utf8"));
    } catch {
        return undefined;
    }
}

function isCalendarDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function cleanDates(list) {
    if (!Array.isArray(list)) return [];
    const dates = new Set();
    for (const value of list) {
        if (isCalendarDate(value)) dates.add(value);
    }
    return [...dates].sort();
}

/**
 * Normalize the several accepted calendar shapes into `{ year: { offDays } }`.
 * A bare date array, `{ offDays }`, and `{ years }` are all accepted so a
 * hand-edited cache or an older baseline still loads.
 */
export function normalizeYears(input) {
    const source = input !== null && typeof input === "object" && input.years !== undefined
        ? input.years
        : input;
    if (source === null || typeof source !== "object") return {};
    const years = {};
    for (const [year, entry] of Object.entries(source)) {
        if (!/^\d{4}$/.test(year)) continue;
        const offDays = cleanDates(Array.isArray(entry) ? entry : entry?.offDays)
            .filter((date) => date.startsWith(`${year}-`));
        if (offDays.length === 0) continue;
        years[year] = {
            offDays,
            ...(typeof entry?.source === "string" ? { source: entry.source } : {}),
            ...(Number.isFinite(entry?.updatedAt) ? { updatedAt: entry.updatedAt } : {})
        };
    }
    return years;
}

function mergeYears(base, override) {
    return { ...base, ...override };
}

/** Beijing calendar month (`YYYY-MM`) for a Unix timestamp. */
export function beijingMonthKey(ms = Date.now()) {
    const d = new Date(ms + 8 * 3600 * 1000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Beijing calendar year (`YYYY`) for a Unix timestamp. */
export function beijingYear(ms = Date.now()) {
    return new Date(ms + 8 * 3600 * 1000).getUTCFullYear();
}

/**
 * Read the packaged baseline and merge the profile cache over it. A year
 * present in the cache wins completely (a fetch is a full-year snapshot), so a
 * removed holiday cannot linger from an old baseline.
 */
export function loadHolidayStore() {
    const baseline = normalizeYears(readJson(baselinePath()));
    const saved = readJson(storePath());
    const savedYears = normalizeYears(saved);
    return {
        version: VERSION,
        years: mergeYears(baseline, savedYears),
        lastScanMonth: typeof saved?.lastScanMonth === "string" ? saved.lastScanMonth : undefined,
        lastAttemptAt: Number.isFinite(saved?.lastAttemptAt) ? saved.lastAttemptAt : undefined,
        updatedAt: Number.isFinite(saved?.updatedAt) ? saved.updatedAt : undefined
    };
}

function writeStore(store) {
    const path = storePath();
    mkdirSync(dirname(path), { recursive: true });
    const body = JSON.stringify({
        version: VERSION,
        updatedAt: store.updatedAt ?? Date.now(),
        lastScanMonth: store.lastScanMonth,
        lastAttemptAt: store.lastAttemptAt,
        years: store.years
    }, null, 2);
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, body, "utf8");
    renameSync(tmp, path);
}

/** Parse one holiday-cn document (or our own year entry) into sorted dates. */
export function parseYearPayload(payload, year) {
    const prefix = `${year}-`;
    if (Array.isArray(payload?.offDays)) {
        return cleanDates(payload.offDays).filter((date) => date.startsWith(prefix));
    }
    if (!Array.isArray(payload?.days)) return [];
    const dates = [];
    for (const day of payload.days) {
        if (day?.isOffDay !== true) continue;
        if (typeof day.date !== "string" || !day.date.startsWith(prefix)) continue;
        dates.push(day.date);
    }
    return cleanDates(dates);
}

async function fetchYear(year, fetchImpl) {
    let lastError;
    for (const url of sourcesFor(year)) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        try {
            const response = await fetchImpl(url, {
                signal: controller.signal,
                cache: "no-store",
                headers: { "user-agent": "utility-appearance-kit/1.1 (+holiday-calendar)" }
            });
            if (!response?.ok) {
                lastError = new Error(`${url}: HTTP ${response?.status ?? "?"}`);
                continue;
            }
            const offDays = parseYearPayload(await response.json(), year);
            if (offDays.length === 0) {
                lastError = new Error(`${url}: no off days`);
                continue;
            }
            return { offDays, source: url };
        } catch (error) {
            lastError = error;
        } finally {
            clearTimeout(timer);
        }
    }
    if (lastError !== undefined) throw lastError;
    return undefined;
}

/**
 * Once-per-month calibration.
 *
 * - A month already scanned is a no-op.
 * - A failed attempt is retried at most once per 20 hours, so a boot storm or
 *   an offline laptop does not hammer the public endpoint.
 * - From October on, the next year is fetched too, so the State Council's
 *   November publication is picked up on the next monthly scan.
 *
 * @param {{ now?: number, fetchImpl?: typeof fetch, log?: (message: string) => void }} [options]
 * @returns {Promise<{ store: object, changed: boolean, skipped: boolean }>}
 */
export async function refreshHolidays(options = {}) {
    const now = options.now ?? Date.now();
    const fetchImpl = options.fetchImpl ?? globalThis.fetch;
    const log = typeof options.log === "function" ? options.log : () => {};
    const store = loadHolidayStore();
    const month = beijingMonthKey(now);
    const year = beijingYear(now);
    const targets = month.slice(5) >= "10" ? [year, year + 1] : [year];
    const targetsCovered = targets.every((target) => {
        const entry = store.years[String(target)];
        return Array.isArray(entry?.offDays) && entry.offDays.length > 0;
    });

    if (store.lastScanMonth === month && targetsCovered) {
        return { store, changed: false, skipped: true, failedYears: [] };
    }
    if (Number.isFinite(store.lastAttemptAt)
        && now >= store.lastAttemptAt
        && now - store.lastAttemptAt < RETRY_AFTER_MS) {
        return { store, changed: false, skipped: true, failedYears: [] };
    }
    if (typeof fetchImpl !== "function") {
        return { store, changed: false, skipped: true, failedYears: [] };
    }

    let changed = false;
    let attempted = 0;
    const failedYears = [];
    for (const target of targets) {
        attempted += 1;
        try {
            const result = await fetchYear(target, fetchImpl);
            if (result === undefined) {
                failedYears.push(target);
                continue;
            }
            store.years[String(target)] = {
                offDays: result.offDays,
                source: result.source,
                updatedAt: now
            };
            changed = true;
            log(`holiday calendar: ${target} loaded (${result.offDays.length} off days)`);
        } catch (error) {
            failedYears.push(target);
            log(`holiday calendar: ${target} unavailable (${error?.message ?? String(error)})`);
        }
    }

    store.lastAttemptAt = now;
    if (attempted > 0 && failedYears.length === 0) {
        store.lastScanMonth = month;
        store.updatedAt = now;
    } else if (changed) {
        // Persist the years that did arrive, but leave lastScanMonth unset so a
        // failed current/next year is retried after the 20h cooldown instead
        // of being skipped until the next calendar month.
        store.updatedAt = now;
    }
    try {
        writeStore(store);
    } catch (error) {
        log(`holiday calendar: cache write failed (${error?.message ?? String(error)})`);
    }
    return { store, changed, skipped: false, failedYears };
}

/** JSON body served to the client. */
export function holidayPayload(store = loadHolidayStore()) {
    return {
        version: VERSION,
        updatedAt: store.updatedAt ?? 0,
        lastScanMonth: store.lastScanMonth,
        years: store.years
    };
}
