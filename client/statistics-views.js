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
    margin: 0 auto 10px;
    color: var(--dsw-alias-label-primary, #172033);
    font: inherit;
    font-size: 13px;
    line-height: 1.5;
}
.uak-stats *, .uak-stats *::before, .uak-stats *::after { box-sizing: border-box; }
.uak-stats button { font: inherit; }
.uak-statsFrame {
    padding: 18px;
    border: 1px solid rgb(147 197 253 / 48%);
    border-radius: 16px;
    background: linear-gradient(135deg,
        rgb(219 234 254 / var(--uak-card-alpha, .58)),
        rgb(147 197 253 / var(--uak-card-alpha, .58)));
    -webkit-backdrop-filter: blur(var(--uak-glass-blur, 18px));
    backdrop-filter: blur(var(--uak-glass-blur, 18px));
    box-shadow: inset 0 1px 0 rgb(255 255 255 / 35%), 0 8px 30px rgb(30 64 175 / 10%);
}
.uak-statsHeader { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.uak-statsDateControls { min-width: 0; }
.uak-statsYear { display: flex; align-items: center; gap: 7px; height: 28px; }
.uak-statsYearLabel { min-width: 58px; font-size: 15px; font-weight: 650; text-align: center; }
.uak-statsMonthLabel { margin: 5px 0 0 31px; color: var(--dsw-alias-label-secondary, #64748b); font-size: 12px; }
.uak-statsIconButton {
    display: inline-flex; align-items: center; justify-content: center;
    width: 25px; height: 25px; padding: 0; border: 0; border-radius: 7px;
    background: transparent; color: var(--dsw-alias-label-secondary, #64748b); cursor: pointer;
}
.uak-statsIconButton:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover, #eff6ff); color: #2563eb; }
.uak-statsIconButton:disabled { opacity: .28; cursor: default; }
.uak-statsIconButton:focus-visible, .uak-statsMonth:focus-visible, .uak-statsRange:focus-visible {
    outline: 2px solid var(--dsw-alias-state-business-primary, #2563eb); outline-offset: 2px;
}
.uak-statsRanges { display: flex; gap: 3px; padding: 3px; border-radius: 10px; background: rgb(191 219 254 / 32%); }
.uak-statsTabs { display: flex; gap: 18px; margin: 0 0 12px; border-bottom: 1px solid rgb(147 197 253 / 40%); }
.uak-statsTab { padding: 7px 1px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: #1e40af; cursor: pointer; }
.uak-statsTab[aria-selected="true"] { border-bottom-color: #2563eb; color: #172554; font-weight: 650; }
.uak-statsBody { height: var(--uak-stats-height, 360px); min-height: 0; overflow: auto; padding-right: 3px; }
.uak-statsBody [role="tabpanel"] { min-height: 0; }
.uak-statsModelTable { overflow: hidden; border: 1px solid var(--dsw-alias-border-l2, #e2e8f0); border-radius: 10px; }
.uak-statsModelRow { display: grid; grid-template-columns: minmax(0, 1fr) minmax(90px, auto) minmax(70px, auto); gap: 14px; padding: 10px 12px; border-bottom: 1px solid var(--dsw-alias-border-l2, #e2e8f0); }
.uak-statsModelRow:last-child { border-bottom: 0; }
.uak-statsModelRowHead { background: rgb(191 219 254 / 32%); color: #1e3a8a; font-size: 11px; }
.uak-statsModelRow > :not(:first-child) { text-align: right; }
.uak-statsRange {
    height: 26px; padding: 0 10px; border: 0; border-radius: 7px; background: transparent;
    color: var(--dsw-alias-label-secondary, #64748b); font-size: 12px; cursor: pointer; white-space: nowrap;
}
.uak-statsRange[aria-pressed="true"] { background: rgb(147 197 253 / 42%); color: #172554; box-shadow: 0 1px 4px rgb(15 23 42 / 10%); }
.uak-statsRange:disabled { opacity: .4; cursor: not-allowed; }
.uak-statsMonths {
    position: relative; display: grid; grid-template-columns: repeat(12, minmax(22px, 1fr));
    align-items: center; gap: 0; width: 100%; min-width: 300px; margin: 18px 0 16px;
    touch-action: none; user-select: none; -webkit-user-select: none;
}
.uak-statsMonths::before {
    content: ""; position: absolute; left: 4.16%; right: 4.16%; top: 10px; height: 1px;
    background: var(--dsw-alias-border-l2, #dbe3ef); pointer-events: none;
}
.uak-statsMonth {
    position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 5px;
    min-width: 0; padding: 3px 0; border: 0; background: transparent;
    color: var(--dsw-alias-label-caption, #94a3b8); font-size: 10px; cursor: pointer;
}
.uak-statsMonthDot {
    display: block; width: 15px; height: 15px; border: 4px solid var(--dsw-alias-bg-primary, #fff);
    border-radius: 50%; background: #cbd5e1; box-shadow: 0 0 0 1px transparent;
}
.uak-statsMonth[data-has-data="true"] .uak-statsMonthDot { background: #60a5fa; }
.uak-statsMonth[aria-pressed="true"] { color: #1d4ed8; font-weight: 650; }
.uak-statsMonth[aria-pressed="true"] .uak-statsMonthDot { background: #2563eb; box-shadow: 0 0 0 2px #bfdbfe; }
.uak-statsMetrics { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; margin-bottom: 18px; }
.uak-statsMetric { min-width: 0; padding: 11px 10px; border-radius: 10px; background: rgb(191 219 254 / 30%); }
.uak-statsMetricLabel { overflow: hidden; color: #1e40af; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.uak-statsMetricValue { margin-top: 4px; overflow: hidden; color: #172554; font-size: 19px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.uak-statsContent { display: grid; grid-template-columns: minmax(0, 1fr) minmax(230px, .8fr); gap: 20px; align-items: start; }
.uak-statsSectionTitle { margin: 0 0 10px; color: var(--dsw-alias-label-secondary, #64748b); font-size: 12px; font-weight: 600; }
.uak-statsHeatScroll { overflow-x: auto; max-width: 100%; padding: 1px 1px 7px; }
.uak-statsHeatGrid {
    display: grid; grid-template-rows: repeat(7, 20px); grid-auto-flow: column;
    grid-auto-columns: 20px; grid-auto-rows: 20px; gap: 3px; width: max-content;
}
.uak-statsWeekday { display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; color: var(--dsw-alias-label-caption, #94a3b8); font-size: 9px; }
.uak-statsDay {
    display: block; flex: none; width: 20px; height: 20px; aspect-ratio: 1;
    border-radius: 4px; background: var(--dsw-alias-fill-secondary, #e8edf3);
}
.uak-statsDay[data-level="1"] { background: #dbeafe; }
.uak-statsDay[data-level="2"] { background: #93c5fd; }
.uak-statsDay[data-level="3"] { background: #60a5fa; }
.uak-statsDay[data-level="4"] { background: #2563eb; }
.uak-statsDay[data-level="5"] { background: #1e3a8a; }
.uak-statsLegend { display: flex; flex-wrap: wrap; align-items: center; gap: 7px 11px; margin-top: 8px; color: var(--dsw-alias-label-caption, #94a3b8); font-size: 10px; }
.uak-statsLegendItem { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.uak-statsLegendSwatch { display: inline-block; flex: none; width: 9px; height: 9px; border-radius: 2px; }
.uak-statsBook {
    position: relative; overflow: hidden; padding: 17px; border: 1px solid rgb(255 255 255 / 45%);
    border-radius: 15px; background: linear-gradient(135deg, rgb(96 165 250 / 27%), rgb(29 78 216 / 17%));
    box-shadow: inset 0 1px 0 rgb(255 255 255 / 45%), 0 8px 26px rgb(37 99 235 / 10%);
    -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px);
}
.uak-statsBook::after {
    content: ""; position: absolute; width: 130px; height: 130px; right: -48px; top: -54px;
    border-radius: 50%; background: rgb(255 255 255 / 20%); pointer-events: none;
}
.uak-statsBookEyebrow { color: #1d4ed8; font-size: 10px; font-weight: 650; letter-spacing: .08em; }
.uak-statsBookTitle { margin: 7px 0 1px; color: #172554; font-size: 22px; font-weight: 700; }
.uak-statsBookEnglish { overflow: hidden; color: rgb(30 64 175 / 72%); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.uak-statsBookDescription { margin: 13px 0 0; color: #1e3a8a; line-height: 1.8; }
.uak-statsBookAmount { font-size: 18px; font-weight: 700; }
.uak-statsBookRatio { margin-top: 5px; color: rgb(30 64 175 / 80%); font-size: 11px; }
.uak-statsModels { margin-top: 15px; }
.uak-statsModel { display: flex; justify-content: space-between; gap: 10px; padding: 5px 0; border-bottom: 1px solid var(--dsw-alias-border-l2, #e2e8f0); font-size: 11px; }
.uak-statsModelId { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.uak-statsModelValue { flex: none; color: var(--dsw-alias-label-secondary, #64748b); }
.uak-statsStatus { padding: 26px 10px; color: var(--dsw-alias-label-secondary, #64748b); text-align: center; }
.uak-statsError { color: var(--dsw-alias-state-danger-primary, #b91c1c); }
.uak-statsRetry { margin-left: 8px; padding: 3px 8px; border: 1px solid currentColor; border-radius: 6px; background: transparent; color: inherit; cursor: pointer; }
.uak-statsEmptyHint { display: block; margin-top: 4px; color: var(--dsw-alias-label-caption, #94a3b8); font-size: 11px; }
@media (prefers-color-scheme: dark) {
    .uak-stats, .uak-statsYearLabel, .uak-statsMetricValue, .uak-statsMonth[aria-pressed="true"] { color: #dbeafe; }
    .uak-statsMonthLabel, .uak-statsIconButton, .uak-statsSectionTitle, .uak-statsLegend,
    .uak-statsWeekday, .uak-statsStatus, .uak-statsEmptyHint, .uak-statsModelValue { color: #bfdbfe; }
    .uak-statsMetricLabel, .uak-statsTab, .uak-statsRange, .uak-statsModelRowHead,
    .uak-statsBookEyebrow, .uak-statsBookEnglish, .uak-statsBookDescription, .uak-statsBookRatio { color: #bfdbfe; }
    .uak-statsBookTitle, .uak-statsRange[aria-pressed="true"], .uak-statsTab[aria-selected="true"] { color: #eff6ff; }
    .uak-statsMetric, .uak-statsRanges, .uak-statsModelRowHead { background: rgb(30 64 175 / 36%); }
}
@media (max-width: 800px) {
    .uak-statsContent { grid-template-columns: 1fr; }
    .uak-statsMetrics { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .uak-statsHeader { flex-direction: column; }
    .uak-statsRanges { align-self: flex-end; margin-top: -36px; }
    .uak-statsMonths { min-width: 280px; }
}
@media (max-width: 480px) {
    .uak-statsFrame { padding: 13px; }
    .uak-statsMetrics { gap: 5px; }
    .uak-statsMetric { padding: 8px; }
    .uak-statsMetricValue { font-size: 16px; }
    .uak-statsRange { padding: 0 7px; }
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
            h("div", { className: "uak-statsMetricValue", title: String(metric.value) },
                metric.format === "text" ? metric.value : format(metric.value)))));
        }

        // Square day grid: 7 rows, Monday-first, one level per cell. `cells`
        // carries the blanks/dates from uakDayCells, `levels` only the shades.
        function uakStatsHeatmap(options) {
            const source = options !== null && typeof options === "object" ? options : {};
            const { year, month, levels, cells, formatValue } = source;
            const h = react.createElement;
            const format = typeof formatValue === "function" ? formatValue : (value) => String(value);
            const shades = Array.isArray(levels) ? levels : [];
            const days = Array.isArray(cells) ? cells : [];
            const weekdays = uakStatsT("stats.weekdays");
            const monthParam = uakStatsMonthParam(month);
            return h("section", null,
                h("h2", { className: "uak-statsSectionTitle" }, uakStatsT("stats.heatTitle", { year, month: monthParam })),
                h("div", { className: "uak-statsHeatScroll" },
                    h("div", {
                        className: "uak-statsHeatGrid",
                        role: "img",
                        "aria-label": uakStatsT("stats.heatAria", { year, month: monthParam })
                    },
                        weekdays.map((day, index) => h("span", {
                            key: `${day}-${index}`,
                            className: "uak-statsWeekday",
                            "aria-hidden": "true"
                        }, day)),
                        shades.map((level, index) => {
                            const cell = days[index];
                            if (cell === undefined || cell.blank) {
                                return h("span", {
                                    key: cell?.key ?? `blank-${index}`,
                                    className: "uak-statsDay",
                                    style: { visibility: "hidden" }
                                });
                            }
                            return h("span", {
                                key: cell.key,
                                className: "uak-statsDay",
                                "data-level": level,
                                title: uakStatsT("stats.cellTitle", {
                                    date: cell.date,
                                    tokens: format(cell.tokens),
                                    messages: format(cell.messages)
                                })
                            });
                        })
                    )
                )
            );
        }

        function uakStatsLegend(legends) {
            const h = react.createElement;
            const items = Array.isArray(legends) ? legends : [];
            return h("div", { className: "uak-statsLegend", "aria-label": uakStatsT("stats.heatLegendAria") },
                items.filter((legend) => legend.level > 0).map((legend) => h("span", {
                    key: legend.level,
                    className: "uak-statsLegendItem"
                },
                h("span", { className: "uak-statsLegendSwatch", style: { background: legend.color } }),
                `${legend.label} Token`)));
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
                    h("div", { className: "uak-statsBookEnglish", title: bookStats.englishTitle }, bookStats.englishTitle),
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
                    h("span", { className: "uak-statsModelId", title: model.id }, model.id),
                    h("span", null, format(model.tokens)),
                    h("span", null, format(model.messages)))));
        }
