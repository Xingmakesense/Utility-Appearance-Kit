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
    margin: 0 auto 8px;
    color: var(--dsw-alias-label-primary);
    font: inherit;
    font-size: 13px;
    line-height: 1.5;
}
.uak-stats *, .uak-stats *::before, .uak-stats *::after { box-sizing: border-box; }
.uak-stats button { font: inherit; }
/* Frosted card: the whole statistics surface is one glass panel. */
.uak-statsFrame {
    padding: 12px 18px;
    border: 1px solid rgb(120 160 230 / .16);
    border-radius: 18px;
    background: rgb(18 22 30 / var(--uak-bg-alpha, .6)) !important;
    backdrop-filter: blur(var(--uak-glass-blur, 18px)) saturate(1.25) !important;
    -webkit-backdrop-filter: blur(var(--uak-glass-blur, 18px)) saturate(1.25) !important;
    box-shadow: inset 0 1px 0 rgb(255 255 255 / .08), 0 10px 32px rgb(0 0 0 / .22);
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
.uak-statsYearLabel { min-width: 48px; color: var(--dsw-alias-label-secondary); font-size: 13px; text-align: center; font-variant-numeric: tabular-nums; }
.uak-statsIconButton {
    display: inline-flex; align-items: center; justify-content: center;
    width: 26px; height: 30px; padding: 0; border: 0; border-radius: 6px;
    background: transparent; color: var(--dsw-alias-label-secondary);
    font-size: 16px; line-height: 1; cursor: pointer;
}
.uak-statsIconButton:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.uak-statsIconButton:disabled { opacity: .55; cursor: default; }
.uak-statsIconButton:focus-visible, .uak-statsMonth:focus-visible, .uak-statsRange:focus-visible, .uak-statsTab:focus-visible {
    outline: 2px solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 2px;
}
.uak-statsMonthLabel { color: var(--dsw-alias-label-primary); font-size: 12px; font-weight: 500; white-space: nowrap; }
.uak-statsMonths {
    position: relative; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr));
    align-items: start; gap: 0; flex: 1 1 auto; min-width: 0; max-width: none; padding-top: 2px;
    touch-action: none; user-select: none; -webkit-user-select: none;
}
/* The rail passes through the middle of the dots: dot centre = 4px of padding
   plus half of 11px, so a 6px rail sits at 6.5px. Opaque by request. */
.uak-statsMonths::before {
    content: ""; position: absolute; left: 4%; right: 4%; top: 6.5px; height: 6px;
    border-radius: 3px;
    background: var(--dsw-alias-border-l3, var(--dsw-alias-border-l2));
    pointer-events: none; opacity: 1;
}
.uak-statsMonth {
    position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
    min-width: 0; padding: 2px 0; border: 0; background: transparent;
    color: var(--dsw-alias-label-tertiary); font-size: 9px; cursor: pointer;
}
.uak-statsMonthDot {
    display: block; width: 11px; height: 11px; border: 0; border-radius: 50%;
    background: var(--dsw-alias-border-l3, var(--dsw-alias-border-l2));
    box-shadow: 0 0 0 2px var(--dsw-alias-bg-layer-1, var(--dsw-alias-bg-base));
    opacity: 1;
}
.uak-statsMonth[data-has-data="true"] .uak-statsMonthDot {
    background: var(--dsw-alias-state-business-primary); opacity: 1;
}
.uak-statsMonth[aria-pressed="true"] { color: var(--dsw-alias-label-primary); font-weight: 600; }
.uak-statsMonth[aria-pressed="true"] .uak-statsMonthDot {
    background: var(--dsw-alias-state-business-primary); opacity: 1;
    box-shadow: 0 0 0 2px var(--dsw-alias-bg-layer-1, var(--dsw-alias-bg-base)),
        0 0 0 4px var(--dsw-alias-state-business-primary);
}
.uak-statsBody { height: var(--uak-stats-height, 360px); min-height: 0; margin-top: 6px; overflow: hidden; display: flex; flex-direction: column; }
/* The overview tab owns the body's full height, so the metrics sit on top, the
   heat band absorbs the slack and the note row stays pinned at the bottom. */
.uak-statsOverview { display: flex; flex-direction: column; height: 100%; min-height: 0; overflow: hidden; }
.uak-statsMetricsWrap { flex: none; min-height: 0; }
.uak-statsMetrics {
    display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
    border-top: 1px solid var(--dsw-alias-border-l2);
    border-bottom: 1px solid var(--dsw-alias-border-l2);
    flex: none;
}
/* One line per metric: the label and the number share the row, the label
   takes the slack on the left and the number stays flush right. */
.uak-statsMetric {
    display: flex; align-items: baseline; justify-content: space-between; gap: 8px;
    min-width: 0; padding: var(--uak-card-pad, 11px) 10px var(--uak-card-pad, 10px) 0;
}
.uak-statsMetric:nth-child(3n+2) { padding-left: 14px; }
.uak-statsMetric:nth-child(3n) { padding-left: 14px; }
.uak-statsMetric:nth-child(n+4) { border-top: 1px solid var(--dsw-alias-border-l2); }
.uak-statsMetricLabel { flex: 1 1 auto; min-width: 0; overflow: hidden; color: var(--dsw-alias-label-tertiary); font-size: var(--uak-card-label-size, 12px); line-height: var(--uak-card-label-lh, 18px); text-overflow: ellipsis; white-space: nowrap; }
.uak-statsMetricValue { flex: 0 1 auto; min-width: 0; overflow: hidden; color: var(--dsw-alias-label-primary); font-size: var(--uak-card-value-size, 20px); line-height: var(--uak-card-value-lh, 27px); font-weight: 650; text-overflow: ellipsis; white-space: nowrap; font-variant-numeric: tabular-nums; }
.uak-statsContent { display: flex; flex-direction: column; flex: 1 1 auto; gap: 8px; margin-top: 12px; overflow: hidden; min-height: 0; }
.uak-statsSectionTitle { margin: 0 0 8px; color: var(--dsw-alias-label-secondary); font-size: 12px; font-weight: 500; }
/* Heat band: week columns, height set by the cell size so it never collapses. */
.uak-statsHeatScroll {
    display: flex; align-items: flex-start; gap: var(--uak-heat-gap, 4px);
    flex: 0 0 auto; overflow-x: auto; overflow-y: hidden;
    padding: var(--uak-heat-pad, 8px); border-radius: 10px;
    background: color-mix(in srgb, var(--dsw-alias-bg-module-platform) 20%, transparent);
    justify-content: space-between; overscroll-behavior-x: contain;
    scrollbar-width: none; width: 100%; max-width: 100%; box-sizing: border-box;
}
.uak-statsHeatScroll::-webkit-scrollbar { display: none; }
.uak-statsHeatGrid { display: flex; align-items: stretch; gap: var(--uak-heat-gap, 4px); width: max-content; min-width: 100%; }
.uak-statsHeatWeek {
    display: flex; flex-direction: column; gap: var(--uak-heat-gap, 4px);
    flex: 1 0 9px; max-width: var(--uak-heat-cell, 22px); min-width: 0;
}
.uak-statsDay {
    display: block; width: 100%; aspect-ratio: 1; flex: none;
    border-radius: 2px;
    background: color-mix(in srgb, var(--dsw-alias-label-tertiary) 12%, transparent);
}
.uak-statsDay[data-level="1"] { background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 12%, transparent); }
.uak-statsDay[data-level="2"] { background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 22%, transparent); }
.uak-statsDay[data-level="3"] { background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 32%, transparent); }
.uak-statsDay[data-level="4"] { background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 42%, transparent); }
.uak-statsDay[data-level="5"] { background: var(--dsw-alias-state-business-primary); }
.uak-statsDay[data-today="true"] { box-shadow: inset 0 0 0 1.5px var(--dsw-alias-label-primary); }
.uak-statsLegend { display: flex; flex-wrap: nowrap; align-items: center; justify-content: flex-end; gap: 6px; color: var(--dsw-alias-label-secondary); font-size: 10px; margin-left: auto; flex: none; }
.uak-statsLegendScale { display: inline-flex; align-items: center; gap: 3px; }
.uak-statsLegendEdge { white-space: nowrap; }
.uak-statsLegendSwatch { display: inline-block; flex: none; width: 14px; height: 14px; border-radius: 3px; }
.uak-statsBook {
    position: static; overflow: visible; padding: 0; border: 0;
    background: none; box-shadow: none;
    display: flex; align-items: baseline; flex-wrap: wrap; gap: 5px;
    color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px;
}
.uak-statsBookEyebrow, .uak-statsBookEnglish, .uak-statsBookRatio, .uak-statsBookTitle { display: none; }
.uak-statsBookDescription { margin: 0; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }
.uak-statsBookAmount { color: var(--dsw-alias-label-primary); font-size: 12px; font-weight: 600; }
/* Its own row under the band, mirroring .uak-statsTopline: a divider, full
   width, text on the left and the legend pinned right, one line only. */
.uak-statsNote {
    display: flex; align-items: center; gap: 12px; flex: none;
    min-width: 0; width: 100%; margin-top: auto; padding-top: 10px;
    border-top: 1px solid var(--dsw-alias-border-l2); white-space: nowrap;
}
.uak-statsNote > .uak-statsBook { flex: 1 1 auto; min-width: 0; flex-wrap: nowrap; overflow: hidden; }
.uak-statsNote .uak-statsBookDescription { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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
@media (max-width: 720px) {
    .uak-statsFrame { padding: 10px 12px; }
    .uak-statsTopline { align-items: flex-start; flex-wrap: wrap; }
    .uak-statsTabs { gap: 14px; }
    .uak-statsPeriod { flex-wrap: wrap; }
    .uak-statsMetrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .uak-statsMetric:nth-child(n) { padding-left: 0; }
    .uak-statsMetric:nth-child(even) { padding-left: 14px; }
    .uak-statsMetric:nth-child(n+3) { border-top: 1px solid var(--dsw-alias-border-l2); }
    .uak-statsNote { gap: 8px; }
    .uak-statsLegend { justify-content: flex-start; margin-left: 0; }
}`;

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
                h("span", { className: "uak-statsMonthDot", "aria-hidden": "true" }));
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

        // Rolling calendar ported from HwFee's usage-stats layout: 22 complete
        // columns of seven square cells, ending on the latest visible date.
        // No colors are imported here; UAK's existing level ramp stays in use.
        const UAK_HEAT_ROWS = 7;
        const UAK_HEAT_COLUMNS = 22;
        const UAK_HEAT_DAY_MS = 86400000;

        function uakHeatDateKey(date) {
            return date.toISOString().slice(0, 10);
        }

        function uakHeatMatrix(summary, todayKey) {
            const entries = uakPerDayEntries(summary);
            if (entries.length === 0) return null;
            const [year, month, day] = todayKey.split("-").map(Number);
            const anchor = Date.UTC(year, month - 1, day);
            const count = UAK_HEAT_COLUMNS * UAK_HEAT_ROWS;
            const start = anchor - (count - 1) * UAK_HEAT_DAY_MS;
            const thresholds = uakHeatThresholds(summary, year, month);
            return Array.from({ length: count }, (_, index) => {
                const date = uakHeatDateKey(new Date(start + index * UAK_HEAT_DAY_MS));
                const tokens = uakFiniteCount(summary?.perDay?.[date]?.tokens);
                return {
                    key: date,
                    cell: { key: date, date },
                    level: uakHeatLevel(tokens, thresholds)
                };
            });
        }

        function uakStatsHeatmap(options) {
            const source = options !== null && typeof options === "object" ? options : {};
            const { year, month, summary, today, todayKey } = source;
            const h = react.createElement;
            const monthParam = uakStatsMonthParam(month);
            const latestKey = typeof todayKey === "string"
                ? todayKey : typeof today === "string" ? today : uakTodayKey(today);
            const matrix = latestKey !== null && uakPerDayEntries(summary).length > 0
                ? uakHeatMatrix(summary, latestKey)
                : null;
            if (matrix === null) return null;
            const weeks = [];
            for (let index = 0; index < matrix.length; index += UAK_HEAT_ROWS) {
                weeks.push(matrix.slice(index, index + UAK_HEAT_ROWS));
            }
            return h("div", {
                className: "uak-statsHeatGrid",
                role: "img",
                "aria-label": uakStatsT("stats.heatAria", { year, month: monthParam })
            },
                weeks.map((week, weekIndex) => h("div", {
                    key: `week-${weekIndex}`,
                    className: "uak-statsHeatWeek"
                }, week.map((pair, dayIndex) => {
                    if (pair === null) {
                        return h("span", {
                            key: `blank-${weekIndex}-${dayIndex}`,
                            className: "uak-statsDay",
                            "data-empty": "true",
                            "aria-hidden": "true"
                        });
                    }
                    const isToday = pair.cell.date === latestKey;
                    return h("span", {
                        key: pair.cell.key,
                        className: "uak-statsDay",
                        "data-level": pair.level,
                        ...(isToday ? { "data-today": "true" } : {})
                    });
                })))
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
