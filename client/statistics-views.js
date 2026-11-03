        // Stateless presentation for the usage panel: the stylesheet plus
        // element builders. Nothing here fetches, stores, or schedules work.
        // Every interactive value arrives as a prop or callback, so
        // statistics-ui.js keeps state/interaction and this file keeps markup.
        // No import/export: this file shares the client factory scope.
        const UAK_STATS_CSS = `
.uak-stats {
    box-sizing: border-box;
    width: calc(100% - 2 * var(--dsh-composer-side-clearance, 0px));
    max-width: var(--dsh-composer-card-max-width, 100%);
    margin: 0 auto 12px;
    color: var(--dsw-alias-label-primary);
    font: inherit;
    font-size: 13px;
    line-height: 1.5;
}
.uak-stats *, .uak-stats *::before, .uak-stats *::after { box-sizing: border-box; }
.uak-stats button { font: inherit; }
.uak-statsFrame {
    padding: 16px 20px 15px;
    border: 1px solid var(--dsw-alias-border-l2);
    border-radius: 18px;
    background: var(--dsw-alias-bg-layer-1, var(--dsw-alias-bg-base));
    box-shadow: 0 1px 2px rgb(0 0 0 / 4%), 0 8px 28px rgb(0 0 0 / 4%);
}
.uak-statsTopline { display: flex; align-items: center; gap: 14px; min-width: 0; flex-wrap: nowrap; }
.uak-statsTabs { display: flex; align-items: center; gap: 20px; flex: none; min-width: 0; }
.uak-statsTab {
    padding: 3px 0; border: 0; border-bottom: 2px solid transparent;
    background: transparent; color: var(--dsw-alias-label-tertiary);
    cursor: pointer; font-size: 13px; font-weight: 600;
}
.uak-statsTab[aria-selected="true"] {
    color: var(--dsw-alias-label-primary);
    border-bottom-color: var(--dsw-alias-label-primary);
}
.uak-statsRanges { display: inline-flex; align-items: center; gap: 4px; flex: none; margin-left: auto; }
.uak-statsRange {
    min-width: 34px; padding: 3px 6px; border: 0; border-radius: 6px;
    background: transparent; color: var(--dsw-alias-label-tertiary);
    cursor: pointer; font-size: 12px; white-space: nowrap;
}
.uak-statsRange[aria-pressed="true"] { background: var(--dsw-alias-fill-secondary); color: var(--dsw-alias-label-primary); font-weight: 600; }
.uak-statsRange:hover { color: var(--dsw-alias-label-primary); }
.uak-statsPeriod { display: flex; align-items: center; gap: 8px; flex: 1 1 auto; min-width: 0; overflow: hidden; }
.uak-statsYear { display: inline-flex; align-items: center; gap: 2px; flex: none; }
.uak-statsYearLabel { min-width: 50px; color: var(--dsw-alias-label-secondary); font-size: 12px; text-align: center; font-variant-numeric: tabular-nums; }
.uak-statsIconButton {
    display: inline-flex; align-items: center; justify-content: center;
    width: 20px; height: 22px; padding: 0; border: 0; border-radius: 5px;
    background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer;
}
.uak-statsIconButton:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.uak-statsIconButton:disabled { opacity: .3; cursor: default; }
.uak-statsIconButton:focus-visible, .uak-statsMonth:focus-visible, .uak-statsRange:focus-visible, .uak-statsTab:focus-visible {
    outline: 2px solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 2px;
}
.uak-statsMonthLabel { color: var(--dsw-alias-label-tertiary); font-size: 12px; white-space: nowrap; }
.uak-statsMonths {
    position: relative; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr));
    align-items: start; gap: 0; flex: 1 1 auto; min-width: 0; max-width: none; padding-top: 2px;
    touch-action: none; user-select: none; -webkit-user-select: none;
}
.uak-statsMonths::before {
    content: ""; position: absolute; left: 4%; right: 4%; top: 8px; height: 1px;
    background: var(--dsw-alias-border-l2); pointer-events: none;
}
.uak-statsMonth {
    position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
    min-width: 0; padding: 2px 0; border: 0; background: transparent;
    color: var(--dsw-alias-label-tertiary); font-size: 9px; cursor: pointer;
}
.uak-statsMonthDot {
    display: block; width: 11px; height: 11px; border: 3px solid var(--dsw-alias-bg-layer-1, var(--dsw-alias-bg-base));
    border-radius: 50%; background: var(--dsw-alias-border-l3, var(--dsw-alias-border-l2));
}
.uak-statsMonth[data-has-data="true"] .uak-statsMonthDot { background: var(--dsw-alias-state-business-primary); opacity: .55; }
.uak-statsMonth[aria-pressed="true"] { color: var(--dsw-alias-label-primary); font-weight: 600; }
.uak-statsMonth[aria-pressed="true"] .uak-statsMonthDot { background: var(--dsw-alias-state-business-primary); opacity: 1; box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary) 18%, transparent); }
.uak-statsBody { height: var(--uak-stats-height, 360px); min-height: 0; margin-top: 10px; overflow-y: auto; }
.uak-statsMetrics {
    display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
    border-top: 1px solid var(--dsw-alias-border-l2);
    border-bottom: 1px solid var(--dsw-alias-border-l2);
}
.uak-statsMetric { min-width: 0; padding: 12px 10px 11px 0; }
.uak-statsMetric:nth-child(3n+2) { padding-left: 14px; }
.uak-statsMetric:nth-child(3n) { padding-left: 14px; }
.uak-statsMetric:nth-child(n+4) { border-top: 1px solid var(--dsw-alias-border-l2); }
.uak-statsMetricLabel { overflow: hidden; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; text-overflow: ellipsis; white-space: nowrap; }
.uak-statsMetricValue { margin-top: 2px; overflow: hidden; color: var(--dsw-alias-label-primary); font-size: 20px; line-height: 28px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; font-variant-numeric: tabular-nums; }
.uak-statsContent { display: flex; flex-direction: column; gap: 0; margin-top: 14px; }
.uak-statsSectionTitle { margin: 0 0 8px; color: var(--dsw-alias-label-secondary); font-size: 12px; font-weight: 500; }
.uak-statsHeatScroll { width: 100%; max-width: 100%; padding: 0; overflow: hidden; }
.uak-statsHeatGrid {
    display: grid; grid-auto-flow: column; grid-template-rows: repeat(7, 14px);
    grid-auto-columns: 14px; grid-auto-rows: 14px; gap: 4px; width: max-content;
}
.uak-statsWeekday { display: none; }
.uak-statsDay {
    display: block; width: 14px; height: 14px;
    border-radius: 3px; background: color-mix(in srgb, var(--dsw-alias-label-tertiary) 12%, transparent);
}
.uak-statsDay[data-level="1"] { background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 14%, transparent); }
.uak-statsDay[data-level="2"] { background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 28%, transparent); }
.uak-statsDay[data-level="3"] { background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 46%, transparent); }
.uak-statsDay[data-level="4"] { background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 68%, transparent); }
.uak-statsDay[data-level="5"] { background: var(--dsw-alias-state-business-primary); }
.uak-statsLegend { display: flex; flex-wrap: nowrap; align-items: center; justify-content: flex-end; gap: 6px; color: var(--dsw-alias-label-secondary); font-size: 10px; margin-left: auto; flex: none; }
.uak-statsLegendScale { display: inline-flex; align-items: center; gap: 3px; }
.uak-statsLegendEdge { white-space: nowrap; }
.uak-statsLegendSwatch { display: inline-block; flex: none; width: 14px; height: 14px; border-radius: 3px; }
.uak-statsBook {
    position: static; overflow: visible; padding: 0; border: 0;
    background: none; box-shadow: none; -webkit-backdrop-filter: none; backdrop-filter: none;
    display: flex; align-items: baseline; flex-wrap: wrap; gap: 5px;
    color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 19px;
}
.uak-statsBook::after { display: none; }
.uak-statsBookEyebrow, .uak-statsBookEnglish, .uak-statsBookRatio { display: none; }
.uak-statsBookTitle { display: none; }
.uak-statsBookDescription { margin: 0; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 20px; }
.uak-statsBookAmount { color: var(--dsw-alias-label-primary); font-size: 12px; font-weight: 600; }
.uak-statsModels { margin-top: 0; }
.uak-statsModelTable { overflow: hidden; border: 1px solid var(--dsw-alias-border-l2); border-radius: 10px; }
.uak-statsModelRow { display: grid; grid-template-columns: minmax(0, 1fr) minmax(90px, auto) minmax(70px, auto); gap: 14px; padding: 10px 12px; border-bottom: 1px solid var(--dsw-alias-border-l2); }
.uak-statsModelRow:last-child { border-bottom: 0; }
.uak-statsModelRowHead { background: var(--dsw-alias-fill-secondary); color: var(--dsw-alias-label-secondary); font-size: 11px; }
.uak-statsModelRow > :not(:first-child) { text-align: right; }
.uak-statsModel { display: flex; justify-content: space-between; gap: 10px; padding: 7px 0; border-bottom: 1px solid var(--dsw-alias-border-l2); font-size: 12px; }
.uak-statsModelId { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.uak-statsModelValue { flex: none; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
.uak-statsStatus { padding: 28px 10px; color: var(--dsw-alias-label-tertiary); text-align: center; font-size: 12px; }
.uak-statsError { color: var(--dsw-alias-label-error, var(--dsw-alias-state-danger-primary)); }
.uak-statsRetry { margin-left: 8px; padding: 3px 8px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 6px; background: transparent; color: inherit; cursor: pointer; }
.uak-statsEmptyHint { display: block; margin-top: 4px; color: var(--dsw-alias-label-tertiary); font-size: 11px; }
.uak-statsFooter { display: flex; align-items: center; gap: 16px; margin-top: 10px; flex-wrap: wrap; min-width: 0; }
.uak-statsDay[data-today="true"] { box-shadow: inset 0 0 0 1.5px var(--dsw-alias-label-primary); }
@media (max-width: 720px) {
    .uak-statsFrame { padding: 14px; }
    .uak-statsTopline { align-items: flex-start; }
    .uak-statsTabs { gap: 14px; }
    .uak-statsPeriod { flex-wrap: wrap; }
    .uak-statsMonths { order: 3; flex-basis: 100%; max-width: none; }
    .uak-statsMetrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .uak-statsMetric:nth-child(n) { padding-left: 0; }
    .uak-statsMetric:nth-child(even) { padding-left: 14px; }
    .uak-statsMetric:nth-child(n+3) { border-top: 1px solid var(--dsw-alias-border-l2); }
    .uak-statsFooter { flex-direction: column; gap: 7px; }
    .uak-statsLegend { justify-content: flex-start; }
}
/* Blue-white visual language, applied on top of the native layout. */
.uak-stats { color: #172033; }
.uak-statsFrame {
    border-color: rgb(147 197 253 / 48%);
    background: linear-gradient(135deg,
        rgb(219 234 254 / var(--uak-card-alpha, .58)),
        rgb(147 197 253 / var(--uak-card-alpha, .58)));
    box-shadow: inset 0 1px 0 rgb(255 255 255 / 35%), 0 8px 30px rgb(30 64 175 / 10%);
}
.uak-statsTab { color: #64748b; }
.uak-statsTab[aria-selected="true"] { color: #172554; border-bottom-color: #2563eb; }
.uak-statsRange { color: #64748b; }
.uak-statsRange[aria-pressed="true"] { background: rgb(147 197 253 / 42%); color: #172554; }
.uak-statsRange:hover { color: #1e40af; }
.uak-statsYearLabel, .uak-statsMonthLabel { color: #64748b; }
.uak-statsIconButton { color: #64748b; }
.uak-statsIconButton:hover:not(:disabled) { background: rgb(239 246 255); color: #2563eb; }
.uak-statsMonths::before { background: #dbe3ef; }
.uak-statsMonth {
    position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
    min-width: 0; padding: 2px 0; border: 0; background: transparent;
    color: var(--dsw-alias-label-tertiary); font-size: 9px; cursor: pointer;
}
.uak-statsMonthDot { border-color: rgb(219 234 254); background: #cbd5e1; }
.uak-statsMonth[data-has-data="true"] .uak-statsMonthDot { background: #60a5fa; }
.uak-statsMonth[aria-pressed="true"] { color: #1d4ed8; }
.uak-statsMonth[aria-pressed="true"] .uak-statsMonthDot { background: #2563eb; box-shadow: 0 0 0 2px #bfdbfe; }
.uak-statsMetrics { border-color: #e2e8f0; }
.uak-statsMetric:nth-child(n+4) { border-top-color: #e2e8f0; }
.uak-statsMetricLabel { color: #64748b; }
.uak-statsMetricValue { color: #172554; }
.uak-statsSectionTitle, .uak-statsWeekday, .uak-statsLegend, .uak-statsLegendEdge, .uak-statsStatus { color: #94a3b8; }
.uak-statsDay {
    display: block; width: 14px; height: 14px;
    border-radius: 3px; background: color-mix(in srgb, var(--dsw-alias-label-tertiary) 12%, transparent);
}
.uak-statsDay[data-level="1"] { background: #dbeafe; }
.uak-statsDay[data-level="2"] { background: #93c5fd; }
.uak-statsDay[data-level="3"] { background: #60a5fa; }
.uak-statsDay[data-level="4"] { background: #2563eb; }
.uak-statsDay[data-level="5"] { background: #1e3a8a; }
.uak-statsBook { color: #64748b; }
.uak-statsBookTitle { display: none; }
.uak-statsBookDescription { margin: 0; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 20px; }
.uak-statsBookAmount { color: #1e3a8a; }
.uak-statsModelTable { border-color: #e2e8f0; }
.uak-statsModelRow, .uak-statsModel { border-color: #e2e8f0; }
.uak-statsModelRowHead { background: rgb(191 219 254 / 32%); color: #1e3a8a; }
.uak-statsModelId { color: #172554; }
.uak-statsModelValue { color: #64748b; }
.uak-statsRetry { border-color: #93c5fd; color: #1e40af; }
@media (prefers-color-scheme: dark) {
    .uak-stats, .uak-statsYearLabel, .uak-statsMonthLabel, .uak-statsIconButton,
    .uak-statsMonth, .uak-statsMetricValue, .uak-statsBookTitle, .uak-statsModelId { color: #dbeafe; }
    .uak-statsFrame {
        border-color: rgb(96 165 250 / 38%);
        background: linear-gradient(135deg, rgb(30 64 175 / 44%), rgb(15 23 42 / 72%));
        box-shadow: inset 0 1px 0 rgb(255 255 255 / 7%), 0 8px 30px rgb(0 0 0 / 22%);
    }
    .uak-statsTab, .uak-statsRange, .uak-statsMetricLabel, .uak-statsSectionTitle,
    .uak-statsWeekday, .uak-statsLegend, .uak-statsLegendEdge, .uak-statsStatus, .uak-statsBook,
    .uak-statsBookDescription, .uak-statsModelValue { color: #bfdbfe; }
    .uak-statsTab[aria-selected="true"], .uak-statsRange[aria-pressed="true"],
    .uak-statsMonth[aria-pressed="true"], .uak-statsBookAmount { color: #eff6ff; }
    .uak-statsRange[aria-pressed="true"] { background: rgb(37 99 235 / 38%); }
    .uak-statsMonthDot { border-color: rgb(30 64 175 / 55%); }
    .uak-statsMetrics, .uak-statsMetric:nth-child(n+4),
    .uak-statsModelTable, .uak-statsModelRow, .uak-statsModel { border-color: rgb(147 197 253 / 22%); }
    .uak-statsModelRowHead { background: rgb(30 64 175 / 36%); color: #bfdbfe; }
    .uak-statsDay { background: rgb(148 163 184 / 18%); }
    .uak-statsDay[data-level="1"] { background: rgb(96 165 250 / 22%); }
    .uak-statsDay[data-level="2"] { background: rgb(96 165 250 / 40%); }
    .uak-statsDay[data-level="3"] { background: rgb(96 165 250 / 62%); }
    .uak-statsDay[data-level="4"] { background: rgb(59 130 246 / 82%); }
    .uak-statsDay[data-level="5"] { background: #93c5fd; }
}
`;

        function uakStatsStatus(message, options) {
            const source = options !== null && typeof options === "object" ? options : {};
            const h = react.createElement;
            const children = [message];
            if (source.action !== undefined && source.action !== null) children.push(source.action);
            if (source.hint !== undefined && source.hint !== null) {
                children.push(h("span", { className: "uak-statsEmptyHint" }, source.hint));
            }
            return h("div", {
                className: source.error ? "uak-statsStatus uak-statsError" : "uak-statsStatus",
                role: source.error ? "alert" : "status"
            }, ...children);
        }

        // Twelve month dots. Pointer capture and keyboard focus movement are
        // owned by the caller; this builder only paints and reports clicks.
        function uakStatsMonthTrack(options) {
            const source = options !== null && typeof options === "object" ? options : {};
            const { year, month, hasData, onSelect, onKeyDown, rootProps } = source;
            const h = react.createElement;
            const root = Object.assign({}, rootProps);
            root.className = "uak-statsMonths";
            root.role = "group";
            root["aria-label"] = uakStatsT("stats.monthsGroup");
            const monthParam = uakStatsMonthParam(month);
            return h("div", root, Array.from({ length: 12 }, (_, index) => {
                const value = index + 1;
                const active = value === month;
                const populated = typeof hasData === "function" ? hasData(value) === true : false;
                return h("button", {
                    key: value,
                    type: "button",
                    className: "uak-statsMonth",
                    "data-has-data": populated ? "true" : "false",
                    "aria-label": uakStatsT(populated ? "stats.monthAria" : "stats.monthAriaEmpty", {
                        year,
                        month: uakStatsMonthParam(value)
                    }),
                    "aria-pressed": active,
                    tabIndex: active ? 0 : -1,
                    onKeyDown: (event) => onKeyDown?.(event, index),
                    onClick: () => onSelect?.(value)
                },
                h("span", { className: "uak-statsMonthDot", "aria-hidden": "true" }),
                h("span", null, value));
            }));
        }

        // Six headline metrics. The label is already localized by the pure
        // summary function; only numbers go through the units formatter.
        function uakStatsMetricCards(metrics, formatValue) {
            const h = react.createElement;
            const format = typeof formatValue === "function" ? formatValue : (value) => String(value);
            const items = Array.isArray(metrics) ? metrics : [];
            return h("div", { className: "uak-statsMetrics" }, items.map((metric) => h("div", {
                key: metric.id,
                className: "uak-statsMetric"
            },
            h("div", { className: "uak-statsMetricLabel" }, metric.label),
            h("div", { className: "uak-statsMetricValue" },
                metric.format === "text" ? metric.value : format(metric.value)))));
        }

        // Square day grid: 7 rows, Monday-first, one level per cell. `cells`
        // carries the blanks/dates from uakDayCells, `levels` only the shades.
        // Weekly matrix: 22 columns (about five months) and always a complete
        // 7-row grid, so the block stays rectangular whatever the height is.
        const UAK_HEAT_ROWS = 7;
        const UAK_HEAT_COLUMNS = 22;

        function uakHeatMatrix(cells, levels, todayKey) {
            const days = Array.isArray(cells) ? cells : [];
            const shades = Array.isArray(levels) ? levels : [];
            const pairs = days
                .map((cell, index) => ({ cell, level: shades[index] }))
                .filter((pair) => pair.cell !== undefined && pair.cell !== null && pair.cell.blank !== true)
                .filter((pair) => typeof todayKey !== "string" || pair.cell.date <= todayKey);
            const recent = pairs.slice(-(UAK_HEAT_ROWS * UAK_HEAT_COLUMNS));
            const first = recent[0]?.cell;
            let lead = 0;
            if (first !== undefined && typeof first.date === "string") {
                const [year, month, day] = first.date.split("-").map(Number);
                if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
                    lead = (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % UAK_HEAT_ROWS;
                }
            }
            const padded = [...Array.from({ length: lead }, () => null), ...recent];
            // Pad the tail so today lands in the last rendered row of the grid.
            while (padded.length % UAK_HEAT_ROWS !== 0) padded.push(null);
            return padded;
        }

        function uakStatsHeatmap(options) {
            const source = options !== null && typeof options === "object" ? options : {};
            const { year, month, levels, cells, todayKey } = source;
            const h = react.createElement;
            const monthParam = uakStatsMonthParam(month);
            const matrix = uakHeatMatrix(cells, levels, todayKey);
            return h("div", {
                className: "uak-statsHeatGrid",
                role: "img",
                "aria-label": uakStatsT("stats.heatAria", { year, month: monthParam })
            },
                matrix.map((pair, index) => {
                    if (pair === null) {
                        return h("span", {
                            key: `blank-${index}`,
                            className: "uak-statsDay",
                            "data-empty": "true",
                            "aria-hidden": "true"
                        });
                    }
                    const isToday = typeof todayKey === "string" && pair.cell.date === todayKey;
                    return h("span", {
                        key: pair.cell.key,
                        className: "uak-statsDay",
                        "data-level": pair.level,
                        ...(isToday ? { "data-today": "true" } : {})
                    });
                })
            );
        }

        // Five shades with a low/high cue only: numeric token ranges made the
        // footer noisy and are intentionally omitted (the title keeps them).
        function uakStatsLegend(legends) {
            const h = react.createElement;
            const items = Array.isArray(legends) ? legends : [];
            const shades = items.filter((legend) => legend.level > 0);
            return h("div", { className: "uak-statsLegend", "aria-label": uakStatsT("stats.heatLegendAria") },
                h("span", { className: "uak-statsLegendEdge" }, uakStatsT("stats.heatLegendLow")),
                h("span", { className: "uak-statsLegendScale" },
                    shades.map((legend) => h("span", {
                        key: legend.level,
                        className: "uak-statsLegendSwatch",
                        style: { background: legend.color },
                    }))),
                h("span", { className: "uak-statsLegendEdge" }, uakStatsT("stats.heatLegendHigh")));
        }

        // One book compared against the tokens of the active range. The caller
        // may pass a legend element; it is shown only when a book is compared,
        // which preserves the original layout in both states.
        function uakStatsBookComparison(options) {
            const source = options !== null && typeof options === "object" ? options : {};
            const { book, mode, tokens, range, units, formatNumber, legend } = source;
            const h = react.createElement;
            const bookStats = uakBookStats(book, tokens);
            if (bookStats === null) return h("div", { className: "uak-statsBook" }, uakStatsT("stats.bookEmpty"));
            const percent = bookStats.percent < 0.01 && bookStats.percent > 0
                ? "<0.01" : Number(bookStats.percent.toFixed(2));
            const titleParam = { zh: bookStats.title, en: bookStats.englishTitle };
            return h(react.Fragment, null,
                h("article", { className: "uak-statsBook" },
                    h("div", { className: "uak-statsBookEyebrow" },
                        `${mode === "random" ? uakStatsT("stats.bookRandom") : uakStatsT("stats.bookSelected")} · ${uakBookTier(bookStats)}`),
                    h("h3", { className: "uak-statsBookTitle" }, uakStatsT("stats.bookTitle", { title: titleParam })),
                    h("div", { className: "uak-statsBookEnglish" }, bookStats.englishTitle),
                    h("p", { className: "uak-statsBookDescription" }, uakStatsT("stats.bookDescription", {
                        title: titleParam,
                        chars: {
                            zh: uakFormatNumber(bookStats.chars, "myriad"),
                            en: uakFormatNumber(bookStats.chars, "short")
                        },
                        tier: uakBookTier(bookStats),
                        period: uakStatsPeriodParam(range),
                        tokens: typeof formatNumber === "function" ? formatNumber(tokens) : String(tokens),
                        equivalent: uakFormatNumber(bookStats.equivalent, units)
                    })),
                    h("div", { className: "uak-statsBookRatio" },
                        uakStatsT("stats.bookRatio", { percent }))
                ),
                legend === undefined || legend === null ? null : legend);
        }

        function uakStatsModelTable(options) {
            const source = options !== null && typeof options === "object" ? options : {};
            const {
                models, rangeLabel, formatNumber,
                panelId = "uak-stats-tabpanel-models",
                labelledBy = "uak-stats-tab-models"
            } = source;
            const h = react.createElement;
            const format = typeof formatNumber === "function" ? formatNumber : (value) => String(value);
            const rows = Array.isArray(models) ? models : [];
            return h("div", {
                className: "uak-statsModelTable",
                role: "tabpanel",
                id: panelId,
                "aria-labelledby": labelledBy
            },
            h("div", { className: "uak-statsModelRow uak-statsModelRowHead" },
                h("span", null, uakStatsT("stats.modelTable.model")),
                h("span", null, "Token"),
                h("span", null, uakStatsT("stats.modelTable.messages"))),
            rows.length === 0
                ? uakStatsStatus(uakStatsT("stats.noModels", { range: rangeLabel }))
                : rows.map((model) => h("div", { key: model.id, className: "uak-statsModelRow" },
                    h("span", { className: "uak-statsModelId" }, model.id),
                    h("span", null, format(model.tokens)),
                    h("span", null, format(model.messages)))));
        }
