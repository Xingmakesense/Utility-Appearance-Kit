// Client pricing checks: the exact DeepSeek peak/valley rule and countdown.
// The browser bundle exposes its pure helpers only when __DSH_UAK_TEST__ is set.
// Run with `node verify-client.mjs`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

globalThis.__DSH_UAK_TEST__ = true;
const makeElement = (tag = "div") => ({
    tagName: tag.toUpperCase(), nodeType: 1, children: [], style: { setProperty() {}, removeProperty() {} }, dataset: {},
    classList: { add() {}, remove() {}, toggle() {} },
    append(...nodes) { this.children.push(...nodes); }, prepend(...nodes) { this.children.unshift(...nodes); },
    appendChild(node) { this.children.push(node); return node; },
    querySelector(selector) {
        if (selector.startsWith("#")) return this.children.find((node) => node.id === selector.slice(1)) || null;
        return null;
    }, querySelectorAll() { return []; }, matches() { return false; },
    setAttribute() {}, remove() {}, addEventListener() {},
});
const documentElement = makeElement("html");
documentElement.lang = "zh-CN";
globalThis.document = {
    documentElement,
    body: makeElement("body"),
    head: makeElement("head"),
    querySelector() { return null; },
    getElementById() { return null; },
    createElement: makeElement,
};
Object.defineProperty(globalThis, "navigator", { value: { language: "zh-CN" }, configurable: true });
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.MutationObserver = class { observe() {} disconnect() {} };
globalThis.fetch = async () => { throw new Error("offline test"); };
let captured;
globalThis.window = {
    __ModuleLoader__: {
        load(spec) {
            captured = spec;
        }
    }
};

await import("./client.js");
assert.ok(captured !== undefined, "client.js must register a module factory");
const module = captured.factory((id) => ({}));
const {
    HOLIDAY_FALLBACK,
    LEVEL_PROFILES,
    LEVEL_WIDTH,
    railWidthFor,
    valueWidthFor,
    buildHolidaySet,
    calendarHasYear,
    isPeakTime,
    levelProfile,
    mergeCalendar,
    nextPeakChangeAt,
    remainingLabel,
    normalizeOptions,
    UAK_STATS_HEIGHT,
    uakSettingsStore,
    uakLoadSettings,
    uakSanitizeSettings
} = module.__test;

const offDays = buildHolidaySet(HOLIDAY_FALLBACK);
const at = (year, month, day, hour, minute = 0) => Date.UTC(year, month - 1, day, hour - 8, minute, 0);

// A. The published rule: weekdays 09–12 and 14–18 are peak; lunch, night,
//    weekends, and statutory holidays are valley.
{
    assert.equal(isPeakTime(at(2026, 10, 19, 10), offDays), true, "Monday 10:00 is peak");
    assert.equal(isPeakTime(at(2026, 10, 19, 12), offDays), false, "Monday 12:00 is valley");
    assert.equal(isPeakTime(at(2026, 10, 19, 15), offDays), true, "Monday 15:00 is peak");
    assert.equal(isPeakTime(at(2026, 10, 19, 18), offDays), false, "Monday 18:00 is valley");
    assert.equal(isPeakTime(at(2026, 10, 19, 8, 59), offDays), false, "Monday 08:59 is valley");
    assert.equal(isPeakTime(at(2026, 10, 24, 10), offDays), false, "Saturday is valley");
    assert.equal(isPeakTime(at(2026, 10, 25, 10), offDays), false, "Sunday is valley");
    assert.equal(isPeakTime(at(2026, 10, 1, 10), offDays), false, "National Day Thursday is valley");
    assert.equal(isPeakTime(at(2026, 2, 16, 10), offDays), false, "Spring Festival Monday is valley");
    assert.equal(isPeakTime(at(2026, 10, 8, 10), offDays), true, "the Thursday after the break is peak");
}

// B. Countdown goes to the next price-state edge, including the long break.
{
    assert.equal(nextPeakChangeAt(at(2026, 10, 19, 10), offDays), at(2026, 10, 19, 12));
    assert.equal(nextPeakChangeAt(at(2026, 10, 23, 18), offDays), at(2026, 10, 26, 9),
        "Friday evening waits for Monday 09:00");
    assert.equal(nextPeakChangeAt(at(2026, 9, 30, 18), offDays), at(2026, 10, 8, 9),
        "the National Day valley ends on 8 October at 09:00");
    assert.equal(nextPeakChangeAt(at(2026, 10, 19, 11, 59) + 59_700, offDays), at(2026, 10, 19, 12),
        "an edge less than 500ms away must not be skipped");
    assert.equal(remainingLabel(182 * 3600 * 1000 + 17 * 60 * 1000 + 18 * 1000), "182:17:18");
}

// C. The host payload replaces the offline baseline for its years.
{
    const merged = mergeCalendar(HOLIDAY_FALLBACK, {
        years: { "2027": { offDays: ["2027-01-01", "2027-01-02"] } }
    });
    assert.deepEqual(merged["2027"], ["2027-01-01", "2027-01-02"]);
    assert.equal(merged["2026"].length, 33, "an unrelated year keeps the baseline");
    assert.equal(buildHolidaySet(merged).has("2027-01-01"), true);
    assert.equal(calendarHasYear(HOLIDAY_FALLBACK, 2026), true, "2026 baseline is known");
    assert.equal(calendarHasYear(HOLIDAY_FALLBACK, 2027), false, "a missing year must be unknown, not valley");
    assert.equal(calendarHasYear(merged, 2027), true, "a host-provided year becomes known");
}

// D. Seven defensive level profiles: low starts the purple mix at 1/2, each
//    higher level starts it earlier, and the last row is reused defensively.
{
    assert.equal(LEVEL_PROFILES.length, 7);
    for (let index = 0; index < 7; index += 1) {
        assert.equal(levelProfile(index, 0), LEVEL_PROFILES[index], `level ${index} must map to profile ${index}`);
    }
    for (let index = 1; index < LEVEL_PROFILES.length; index += 1) {
        assert.ok(LEVEL_PROFILES[index].violet <= LEVEL_PROFILES[index - 1].violet,
            "purple must start no later than the previous level");
    }
    assert.equal(levelProfile(1, 1).violet, 0.5, "low must start purple at one half");
    assert.equal(levelProfile(2, 1).violet, 0.46, "the level after low starts purple slightly earlier");
    assert.equal(levelProfile(6, 0).violet, 0.27, "seven-level models reach the last profile");
    assert.equal(levelProfile(20, 1).violet, 0.27, "longer level sets clamp defensively");
}

// E. Fixed rail run per level. The baseline is DeepSeek V4.1 flash
//    (`deepseek-flash`: off/low/high/max, 4 levels) widened by 25%:
//    104 * 1.25 / 4 = 32.5px. Any other level count must scale from that.
{
    assert.equal(LEVEL_WIDTH, 32.5, "one level owns 104 * 1.25 / 4 px");
    assert.equal(railWidthFor(4), 130, "the DeepSeek flash baseline rail is 130px");
    assert.equal(railWidthFor(6), 195, "a six-level model draws a longer rail");
    assert.equal(railWidthFor(7), 227.5, "seven levels scale further");
    assert.equal(railWidthFor(2), 65, "a two-level model draws a shorter rail");
    assert.equal(railWidthFor(1), 32.5, "a single level still has a rail");
    for (const count of [1, 2, 3, 4, 5, 6, 7]) {
        assert.equal(railWidthFor(count) / count, LEVEL_WIDTH,
            `every level must keep the same run at ${count} levels`);
    }
    assert.ok(railWidthFor(6) > railWidthFor(4), "more levels must mean a longer slider");
}

// F. The readout must fit the model's longest real label without clipping.
//    "Medium" previously overflowed the fixed 3.6em box once the rail was
//    widened for six/seven-level models.
{
    const medium = valueWidthFor([{ id: "medium", name: "Medium" }]);
    assert.ok(medium > 3.6, "Medium must receive more than the old fixed width");
    assert.ok(medium >= 3.95, `Medium needs about six ASCII glyphs, got ${medium}`);
    const minimal = valueWidthFor([{ id: "minimal", name: "Minimal" }]);
    assert.ok(minimal > medium, "a longer label must reserve more room");
    assert.equal(valueWidthFor([{ id: "low", name: "Low" }], "Low"), 3.6,
        "short labels keep the compact baseline width");
    assert.ok(valueWidthFor([{ id: "custom", name: "超长自定义档位名称" }]) <= 9,
        "pathological names must be capped");
    const client = readFileSync(new URL("./client.js", import.meta.url), "utf8");
    assert.ok(!/\.dsh-uak-value\s*\{[^}]*text-overflow:\s*ellipsis/.test(client),
        "the value label must never ellipsize a real level name");
    assert.ok(!/\.dsh-uak-value\s*\{[^}]*overflow:\s*hidden/.test(client),
        "the value label must not clip its glyphs");
}


// G. One switch and invalid-config fallback. The removed declarations mode
//    must not turn an upgraded profile into an invalid config.
{
    assert.deepEqual(normalizeOptions(undefined).value, { slider: true });
    assert.deepEqual(normalizeOptions({ slider: false }).value, { slider: false });
    assert.deepEqual(normalizeOptions({ declarations: "off", slider: true }).value, { slider: true },
        "the obsolete declarations switch must be dropped");
    assert.deepEqual(normalizeOptions({ slider: true, future: 1 }).value, { slider: true, future: 1 });
    assert.ok(Array.isArray(normalizeOptions({ slider: "yes" }).issues));
    const capture = (options) => {
        const injected = [];
        const slotKeys = [];
        const slots = {
            inject(key, callback) { slotKeys.push(key); callback(); return () => {}; },
            register() { return () => {}; }
        };
        const ctx = {
            slots,
            effect: (fn) => fn(),
            get: () => undefined,
            inject(services, callback) {
                injected.push(services);
                callback({ get: (service) => service === "slots" ? slots : {} });
                return { dispose() {} };
            }
        };
        module.apply(ctx, options);
        return { injected: injected.slice(-1), slotKeys };
    };
    const nativeOnly = capture({ slider: false });
    const requiredSlots = ["settings.section", "settings.utility-appearance-kit.item", "conversation.input.dock"];
    // `locale` joined the inject list in 04dcad3 so the settings surface never
    // prints a raw key; the slot list is what must not drift.
    assert.deepEqual(nativeOnly.injected, [["slots", "locale"]]);
    assert.deepEqual(nativeOnly.slotKeys, [...requiredSlots, "sidebar.brand.name"]);
    const full = capture({});
    assert.deepEqual(full.injected, [["slots", "locale", "modelDirectories", "sessions"]]);
    assert.deepEqual(full.slotKeys, [...requiredSlots, "conversation.input.right", "sidebar.brand.name"]);
    const invalid = capture({ slider: "invalid" });
    assert.deepEqual(invalid.injected, [["slots", "locale"]]);
    assert.deepEqual(invalid.slotKeys, [...requiredSlots, "sidebar.brand.name"]);
}

// H. Settings are shared live state. A host snapshot that raced a newer local
//    edit must be dropped; a stale boot read used to roll back a just-saved
//    value. The statistics height is a constant, not a stored field.
{
    assert.equal(UAK_STATS_HEIGHT, 360);
    assert.equal("bodyHeight" in uakSanitizeSettings({}), false, "the removed height must not reappear");
    assert.equal("bodyHeight" in uakSanitizeSettings({ bodyHeight: 500 }), false,
        "a legacy persisted height must be ignored");
    const before = uakSettingsStore.getState();
    let changes = 0;
    const unsubscribe = uakSettingsStore.subscribe(() => { changes += 1; });
    const committed = uakSettingsStore.commit({ ...before, opacity: 42 });
    assert.equal(committed.opacity, 42, "a local commit applies immediately");
    assert.ok(changes > 0, "subscribers must be notified synchronously");
    const revision = 0; // Older than the local commit above.
    const stale = uakSettingsStore.applyRemote({ ...committed, opacity: 7 }, revision);
    assert.equal(stale.opacity, 42, "a stale host snapshot must not undo a newer local edit");
    const fresh = uakSettingsStore.applyRemote({ ...committed, brightness: 120 });
    assert.equal(fresh.brightness, 120, "an uncontested host snapshot applies");
    // A settings page remount calls uakLoadSettings() again. It must resolve
    // with the current store value; the old cached promise returned the boot
    // snapshot and repainted every slider with its startup value.
    const reloaded = await uakLoadSettings();
    assert.equal(reloaded.opacity, 42, "a remount must read the current state, not the boot snapshot");
    assert.equal(reloaded.brightness, 120, "the current brightness must survive a remount");
    unsubscribe();
}

console.log("client slider and pricing checks passed");
