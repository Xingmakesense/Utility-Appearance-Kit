// Holiday calendar checks: baseline merge, monthly refresh, failure fallback.
// Run with `node verify-holidays.mjs` from the plugin directory.
import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "tmp", "holiday-profile");
rmSync(root, { recursive: true, force: true });
process.env.DSH_PROFILE_DIR = root;

const {
    beijingMonthKey,
    loadHolidayStore,
    normalizeYears,
    parseYearPayload,
    refreshHolidays,
    storePath
} = await import("./holiday-calendar.js");

function payload(year, offDays, workDays = []) {
    return {
        year,
        days: [
            ...offDays.map((date) => ({ name: "holiday", date, isOffDay: true })),
            ...workDays.map((date) => ({ name: "workday", date, isOffDay: false }))
        ]
    };
}

const fixture2026 = payload("2026", [
    "2026-01-01", "2026-01-02", "2026-01-03",
    "2026-02-15", "2026-02-16", "2026-02-17", "2026-02-18", "2026-02-19",
    "2026-02-20", "2026-02-21", "2026-02-22", "2026-02-23",
    "2026-04-04", "2026-04-05", "2026-04-06",
    "2026-05-01", "2026-05-02", "2026-05-03", "2026-05-04", "2026-05-05",
    "2026-06-19", "2026-06-20", "2026-06-21",
    "2026-09-25", "2026-09-26", "2026-09-27",
    "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07"
], ["2026-01-04", "2026-02-14", "2026-02-28", "2026-05-09", "2026-09-20", "2026-10-10"]);

const fixture2027 = payload("2027", ["2027-01-01", "2027-01-02", "2027-01-03"]);

// A. Normalization accepts arrays, year entries, and the holiday-cn document.
{
    assert.equal(beijingMonthKey(Date.UTC(2026, 9, 18, 2, 0, 0)), "2026-10");
    assert.deepEqual(normalizeYears({ years: { 2026: { offDays: ["2026-01-02", "2026-01-01"] } } })["2026"].offDays,
        ["2026-01-01", "2026-01-02"]);
    assert.deepEqual(parseYearPayload(fixture2026, 2026).slice(0, 3), ["2026-01-01", "2026-01-02", "2026-01-03"]);
    assert.equal(parseYearPayload(fixture2026, 2026).includes("2026-01-04"), false,
        "make-up workdays must never be treated as off days");
    assert.deepEqual(normalizeYears({ years: { 2026: { offDays: ["2026-02-30", "2026-01-01", "2027-01-01"] } } })["2026"].offDays,
        ["2026-01-01"], "invalid dates and dates from another year must be discarded");
}

// B. A fresh profile still has the packaged 2026 baseline.
{
    const store = loadHolidayStore();
    assert.equal(store.years["2026"].offDays.length, 33, "packaged baseline must contain every 2026 statutory off day");
    assert.equal(store.lastScanMonth, undefined);
}

// C. The first boot of a month fetches the current and next year once.
{
    const calls = [];
    const fetchImpl = async (url) => {
        calls.push(url);
        if (url.includes("2026.json")) return { ok: true, json: async () => fixture2026 };
        if (url.includes("2027.json")) return { ok: true, json: async () => fixture2027 };
        return { ok: false, status: 404 };
    };
    const now = Date.UTC(2026, 9, 25, 2, 0, 0); // 2026-10-25 10:00 Beijing
    const result = await refreshHolidays({ now, fetchImpl });
    assert.equal(result.changed, true);
    assert.equal(result.skipped, false);
    assert.equal(calls.length, 2, "October must fetch this year and next year");
    assert.equal(result.store.years["2026"].offDays.length, 33);
    assert.equal(result.store.years["2027"].offDays.length, 3);
    assert.equal(result.store.lastScanMonth, "2026-10");
    assert.equal(existsSync(storePath()), true, "the monthly cache must be written");

    const saved = JSON.parse(readFileSync(storePath(), "utf8"));
    assert.equal(saved.lastScanMonth, "2026-10");
    assert.equal(saved.years["2026"].offDays.length, 33);

    // A second boot in the same month performs no network call at all.
    const result2 = await refreshHolidays({
        now: Date.UTC(2026, 9, 26, 2, 0, 0),
        fetchImpl: async () => {
            throw new Error("same-month refresh must not fetch");
        }
    });
    assert.equal(result2.skipped, true);
    assert.equal(result2.changed, false);
}

// D. A failed month keeps the previous cache, records the attempt, and does
//    not retry on the next boot within 20 hours.
{
    rmSync(root, { recursive: true, force: true });
    let calls = 0;
    const result = await refreshHolidays({
        now: Date.UTC(2026, 10, 1, 2, 0, 0),
        fetchImpl: async () => {
            calls += 1;
            throw new Error("offline");
        }
    });
    assert.equal(result.changed, false);
    assert.equal(result.store.years["2026"].offDays.length, 33, "baseline survives an offline month");
    assert.equal(result.store.lastScanMonth, undefined, "a failed month must not be marked scanned");
    assert.equal(Number.isFinite(result.store.lastAttemptAt), true);
    assert.equal(calls, 6, "three sources times two target years");

    const retry = await refreshHolidays({
        now: Date.UTC(2026, 10, 1, 3, 0, 0),
        fetchImpl: async () => {
            throw new Error("must be skipped by the retry window");
        }
    });
    assert.equal(retry.skipped, true, "a failed attempt must cool down for 20 hours");
}

// E. A partially successful October must not mark the whole month complete:
//    the next year remains retryable after the cooldown.
{
    rmSync(root, { recursive: true, force: true });
    const result = await refreshHolidays({
        now: Date.UTC(2026, 9, 25, 2, 0, 0),
        fetchImpl: async (url) => {
            if (url.includes("2026.json")) return { ok: true, json: async () => fixture2026 };
            throw new Error("2027 not published yet");
        }
    });
    assert.equal(result.changed, true, "the current year was still stored");
    assert.deepEqual(result.failedYears, [2027]);
    assert.equal(result.store.lastScanMonth, undefined,
        "a partial success must not mark the month as fully scanned");
    assert.equal(result.store.years["2027"], undefined);
    const retry = await refreshHolidays({
        now: Date.UTC(2026, 9, 25, 3, 0, 0),
        fetchImpl: async () => {
            throw new Error("must be inside the 20h cooldown");
        }
    });
    assert.equal(retry.skipped, true, "a partial failure must respect the retry cooldown");
}

// F. An existing cache wins over the baseline for the same year.
{
    rmSync(root, { recursive: true, force: true });
    const result = await refreshHolidays({
        now: Date.UTC(2026, 11, 1, 2, 0, 0),
        fetchImpl: async (url) => url.includes("2026.json")
            ? { ok: true, json: async () => payload("2026", ["2026-12-31"]) }
            : { ok: true, json: async () => fixture2027 }
    });
    assert.deepEqual(result.store.years["2026"].offDays, ["2026-12-31"],
        "the live year replaces the packaged baseline instead of unioning stale dates");
}

console.log("holiday calendar checks passed");
