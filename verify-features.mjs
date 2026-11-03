import assert from "node:assert/strict";

const element = (tag = "div") => ({
    tagName: tag.toUpperCase(), nodeType: 1, children: [], dataset: {},
    style: { setProperty() {} },
    classList: { add() {}, remove() {}, toggle() {} },
    append(...nodes) { this.children.push(...nodes); },
    prepend(...nodes) { this.children.unshift(...nodes); },
    appendChild(node) { this.children.push(node); return node; },
    querySelector(selector) {
        if (selector.startsWith("#")) return this.children.find((node) => node.id === selector.slice(1)) || null;
        return null;
    },
    querySelectorAll() { return []; }, matches() { return false; },
    setAttribute() {}, remove() {}, addEventListener() {},
});
globalThis.document = {
    documentElement: Object.assign(element("html"), { lang: "zh-CN" }),
    body: element("body"), head: element("head"),
    getElementById: () => null, querySelector: () => null, createElement: element,
};
Object.defineProperty(globalThis, "navigator", { value: { language: "zh-CN" }, configurable: true });
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.MutationObserver = class { observe() {} disconnect() {} };
globalThis.fetch = async () => { throw new Error("offline test"); };
globalThis.__DSH_UAK_TEST__ = true;
let captured;
globalThis.window = { __ModuleLoader__: { load(spec) { captured = spec; } } };
await import("./client.js");
const client = captured.factory((id) => id === "react" ? {
    createElement: (type, props, ...children) => ({
        type,
        key: props?.key,
        props: props ?? {},
        children: children.flat()
    })
} : {}).__test;
const {
    uakBooks, uakBookTier, uakHeatThresholds, uakMonthHeatmap, uakSummarizeMonth,
    uakSanitizeSettings, uakFormatNumber, uakStatsT, uakStatsHeatmap,
    uakHoistAboveWorkspaceRow,
} = client;
const day = (tokens, messages = 2, model = "deepseek-flash") => ({
    tokens, messages, hours: Array.from({ length: 24 }, (_, hour) => hour === 14 ? tokens : 0),
    messageHours: Array.from({ length: 24 }, (_, hour) => hour === 14 ? messages : 0),
    models: { [model]: { tokens, messages: 1 } },
});
const summary = {
    firstDay: "2026-01-10",
    sessionsByDay: { "2026-02-01": 1, "2026-02-03": 1 },
    perDay: {
        "2026-01-10": day(50000),
        "2026-02-01": day(25000),
        "2026-02-03": day(50000),
        "2026-02-04": day(50000),
        "2026-03-01": day(200000),
        "2026-04-01": day(300000),
        "2026-05-01": day(500000),
        "2026-06-01": day(800000),
    },
};
assert.equal(uakBooks.length, 20, "all requested books with the duplicate To Live merged");
for (const title of ["红楼梦", "三国演义", "围城", "活着", "骆驼祥子", "我的大学", "平凡的世界", "白鹿原", "一句顶一万句", "穷人", "悲惨世界", "鼠疫", "理想国", "许三观卖血记", "局外人", "老人与海", "变形记", "谈谈方法", "西西弗神话", "乌合之众"]) {
    assert.equal(uakBooks.some((book) => book.title === title), true, `${title} must be available`);
}
assert.equal(uakBookTier({ tier: "短章" }), "短章");
document.documentElement.lang = "en-US";
assert.equal(uakBookTier({ tier: "鸿篇" }), "Epic");
assert.equal(uakStatsT("stats.tab.overview"), "Overview");
assert.equal(uakStatsT("stats.narrative.month", { year: 2026, month: { zh: 2, en: "02" } }), "2026-02");
assert.equal(uakFormatNumber(12000, "auto"), "12k");
document.documentElement.lang = "zh-CN";
assert.equal(uakFormatNumber(12000, "auto"), "1.2万");
assert.equal(uakFormatNumber(0.678, "short"), "0.68");

const monthly = uakSummarizeMonth(summary, 2026, 2);
assert.equal(monthly.sessions, 2);
assert.equal(monthly.messages, 6);
assert.equal(monthly.tokens, 125000);
assert.equal(monthly.metrics[4].value, "14:00");
assert.equal(monthly.metrics[5].value, "deepseek-flash");
const leap = uakMonthHeatmap(summary, 2026, 2, "short");
assert.equal(leap.levels.length, 34, "February 2026 includes six leading blanks and all 28 days");
assert.equal(leap.levels.filter((level) => level === null).length, 6);
const leapYear = uakMonthHeatmap({ firstDay: "2028-02-29", perDay: { "2028-02-29": day(60000) } }, 2028, 2, "short");
assert.equal(leapYear.levels.filter((level) => level !== null).length, 29, "leap February keeps all 29 dates");
assert.deepEqual(uakHeatThresholds(summary, 2026, 1), [20000, 100000, 500000, 1000000]);
assert.deepEqual(uakHeatThresholds(summary, 2026, 3), [50000, 100000, 150000, 200000]);
const march = uakMonthHeatmap(summary, 2026, 3, "short");
assert.equal(march.levels[6], 4, "March 1 uses the fourth adaptive token level");
assert.equal(march.levels.at(-1), 0, "an idle day stays neutral");
assert.equal(march.legends.length, 6, "neutral days plus five token levels");
assert.equal(uakSummarizeMonth(summary, 2027, 2).tokens, 0, "empty months stay empty");
const rollingHeat = uakStatsHeatmap({
    year: 2026, month: 3, summary, today: new Date(2026, 2, 4, 12)
});
assert.equal(rollingHeat.props.className, "uak-statsHeatGrid");
assert.equal(rollingHeat.children.length, 22, "rolling calendar has 22 complete columns");
for (const week of rollingHeat.children) {
    assert.equal(week.props.className, "uak-statsHeatWeek");
    assert.equal(week.children.length, 7, "every heat column has seven cells");
}
const heatCells = rollingHeat.children.flatMap((week) => week.children);
assert.equal(heatCells.length, 154);
assert.equal(heatCells.at(-1).key, "2026-03-04", "today stays in the bottom-right cell");
assert.equal(heatCells.at(-1).props["data-today"], "true");
assert.equal(heatCells.at(-1).props["data-level"], 0, "a quiet day still draws its cell");
assert.equal(heatCells.at(-4).key, "2026-03-01");
assert.equal(heatCells.at(-4).props["data-level"], 4, "the latest activity uses UAK's existing level");
assert.equal(heatCells.some((cell) => cell.key === "2026-01-10" && cell.props["data-level"] > 0), true,
    "the rolling grid includes activity from earlier months");
assert.equal(heatCells.some((cell) => cell.props["data-empty"] === "true"), false,
    "padding dates remain visible instead of collapsing the matrix");
const fullWidthHeat = uakStatsHeatmap({
    year: 2026, month: 3, summary, today: "2026-03-04", columns: 38
});
assert.equal(fullWidthHeat.children.length, 38, "wide panels add columns instead of stretching cells");
assert.equal(fullWidthHeat.children.every((week) => week.children.length === 7), true);
assert.equal(fullWidthHeat.children.at(-1).children.at(-1).key, "2026-03-04",
    "adding columns keeps the latest date at the bottom-right");
assert.equal(uakStatsHeatmap({ year: 2026, month: 3, summary: {}, today: "2026-03-04" }), null);

// The card belongs above the hero's workspace/mode row, so the dock outlet is
// re-seated in front of it and restored on cleanup.
{
    const makeNode = () => {
        const node = { parentNode: null, children: [], querySelector: () => null };
        node.appendChild = (child) => { child.parentNode = node; node.children.push(child); return child; };
        node.insertBefore = (child, ref) => {
            const from = child.parentNode;
            if (from) from.children.splice(from.children.indexOf(child), 1);
            const at = node.children.indexOf(ref);
            node.children.splice(at < 0 ? node.children.length : at, 0, child);
            child.parentNode = node;
            return child;
        };
        return node;
    };
    const stack = makeNode();
    const headline = makeNode();
    const outlet = makeNode();
    const workspaceRow = makeNode();
    workspaceRow.querySelector = (selector) => selector === '[data-slot="conversation.hero.workspace"]' ? {} : null;
    const rootEl = makeNode();
    outlet.appendChild(rootEl);
    stack.appendChild(headline);
    stack.appendChild(outlet);
    stack.appendChild(workspaceRow);
    const restore = uakHoistAboveWorkspaceRow(rootEl);
    assert.deepEqual(stack.children, [headline, outlet, workspaceRow],
        "the card outlet moves in front of the workspace row");
    restore();
    assert.deepEqual(stack.children, [headline, workspaceRow, outlet],
        "cleanup returns the outlet to its dock position");
    assert.equal(uakHoistAboveWorkspaceRow(makeNode()), undefined,
        "a seat without a workspace row is left untouched");
}
const defaults = uakSanitizeSettings({});
assert.equal(defaults.bookMode, "random");
assert.equal(defaults.bodyHeight, 360);
assert.equal(defaults.glassBlur, 18);
assert.equal(uakSanitizeSettings({ imageUrl: "javascript:alert(1)" }).imageUrl, "");
assert.equal(uakSanitizeSettings({ blur: 500, glassBlur: -1, popupOpacity: 200 }).blur, 40);
assert.equal(uakSanitizeSettings({ bookMode: "selected", bookTitle: "活着" }).bookTitle, "活着");

for (const fn of ["uakStatsMonthTrack", "uakStatsHeatmap", "uakStatsMetricCards", "uakStatsBookComparison", "uakStatsModelTable", "uakStatsStatus"]) {
    assert.equal(typeof client[fn], "function", `${fn} must be a separate presentation block`);
}
console.log("feature: books, i18n, monthly aggregation, heat levels, settings and view blocks passed");
