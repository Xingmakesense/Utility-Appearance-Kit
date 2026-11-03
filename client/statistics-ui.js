        // Usage panel UI: state, fetching, pointer/keyboard interaction,
        // assembly, and slot registration. Markup lives in
        // client/statistics-views.js and copy in client/statistics-i18n.js, so
        // this file stays free of CSS and bilingual literals. React is supplied
        // by the shared client factory.
        const uakUsagePanelSlot = "conversation.input.dock";
        const uakUsageEndpoint = "/utility-appearance-kit/usage";
        const uakUsageCacheTTL = 30000;
        let uakUsageCache = null;

        function uakUsageReadSettings(settingsStore) {
            try {
                const state = settingsStore?.getState?.();
                return state !== null && typeof state === "object" ? state : {};
            } catch {
                return {};
            }
        }

        function uakUsageShouldShow(props) {
            return props?.blank === true && props?.running === false && props?.promptAttempted === false;
        }

        function uakUsageVisibility(props) {
            const source = props !== null && typeof props === "object" ? props : {};
            if (Object.prototype.hasOwnProperty.call(source, "blank")
                || Object.prototype.hasOwnProperty.call(source, "running")
                || Object.prototype.hasOwnProperty.call(source, "promptAttempted")) {
                return uakUsageShouldShow(source);
            }
            for (const key of ["session", "conversation", "state", "status", "slotProps"]) {
                const nested = source[key];
                if (nested !== null && typeof nested === "object" && (
                    Object.prototype.hasOwnProperty.call(nested, "blank")
                    || Object.prototype.hasOwnProperty.call(nested, "running")
                    || Object.prototype.hasOwnProperty.call(nested, "promptAttempted")
                )) return uakUsageShouldShow(nested);
            }
            return false;
        }

        async function uakFetchUsage(signal) {
            const response = await fetch(uakUsageEndpoint, {
                method: "GET",
                headers: { "x-dsh-uak-usage": "1" },
                signal
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const summary = await response.json();
            if (summary === null || typeof summary !== "object" || Array.isArray(summary)) {
                throw new Error(uakStatsT("stats.invalidResponse"));
            }
            return summary;
        }

        function uakCreateUsagePanel(settingsStore) {
            const h = react.createElement;
            const randomBook = uakBooks[Math.floor(Math.random() * uakBooks.length)];

            function UsagePanel(props) {
                const visible = uakUsageVisibility(props);
                const today = react.useMemo(() => new Date(), []);
                const [, setUiRevision] = react.useState(0);
                const [year, setYear] = react.useState(today.getFullYear());
                const [month, setMonth] = react.useState(today.getMonth() + 1);
                const [range, setRange] = react.useState("month");
                const [tab, setTab] = react.useState("overview");
                const [settings, setSettings] = react.useState(() => uakUsageReadSettings(settingsStore));
                const [request, setRequest] = react.useState({ status: "loading", summary: null, error: null });
                const [reloadKey, setReloadKey] = react.useState(0);
                const mountedRef = react.useRef(true);
                const abortRef = react.useRef(null);
                const monthTrackRef = react.useRef(null);
                const monthPointerRef = react.useRef(null);
                const panelRef = react.useRef(null);
                const metricsRef = react.useRef(null);
                const footerRef = react.useRef(null);
                const [viewportWidth, setViewportWidth] = react.useState(
                    typeof window === "undefined" ? 1104 : window.innerWidth
                );
                const [measured, setMeasured] = react.useState({ metrics: 0, footer: 0 });

                react.useEffect(() => {
                    if (typeof ResizeObserver !== "function") return undefined;
                    const observer = new ResizeObserver(() => {
                        const width = Math.round(panelRef.current?.contentRect?.width
                            ?? panelRef.current?.getBoundingClientRect().width ?? 0);
                        if (width > 0) setViewportWidth(width);
                        const metrics = Math.round(metricsRef.current?.getBoundingClientRect().height ?? 0);
                        const footer = Math.round(footerRef.current?.getBoundingClientRect().height ?? 0);
                        setMeasured((current) => (current.metrics === metrics && current.footer === footer
                            ? current : { metrics, footer }));
                    });
                    for (const node of [panelRef.current, metricsRef.current, footerRef.current]) {
                        if (node) observer.observe(node);
                    }
                    return () => observer.disconnect();
                }, [visible, tab, request.status, range, year, month]);

                react.useEffect(() => uakSubscribeUiLocale(setUiRevision), []);
                react.useEffect(() => {
                    if (typeof settingsStore?.subscribe !== "function") return undefined;
                    return settingsStore.subscribe(() => setSettings(uakUsageReadSettings(settingsStore)));
                }, []);

                react.useEffect(() => {
                    if (!visible) return undefined;
                    mountedRef.current = true;
                    const cached = uakUsageCache;
                    if (reloadKey === 0 && cached !== null && Date.now() - cached.time < uakUsageCacheTTL) {
                        setRequest({ status: "ready", summary: cached.summary, error: null });
                        return undefined;
                    }
                    abortRef.current?.abort();
                    const controller = new AbortController();
                    abortRef.current = controller;
                    setRequest((current) => ({ status: "loading", summary: current.summary, error: null }));
                    uakFetchUsage(controller.signal).then((summary) => {
                        if (controller.signal.aborted || !mountedRef.current) return;
                        uakUsageCache = { time: Date.now(), summary };
                        setRequest({ status: "ready", summary, error: null });
                    }).catch((error) => {
                        if (controller.signal.aborted || !mountedRef.current) return;
                        setRequest({ status: "error", summary: null, error });
                    });
                    return () => controller.abort();
                }, [reloadKey, visible]);

                react.useEffect(() => () => {
                    mountedRef.current = false;
                    abortRef.current?.abort();
                }, []);

                const summary = request.summary;
                const years = react.useMemo(() => uakAvailableYears(summary), [summary]);
                const previousYear = [...years].reverse().find((value) => value < year);
                const nextYear = years.find((value) => value > year);
                const monthSummary = react.useMemo(
                    () => uakSummarizeMonth(summary, year, month),
                    [summary, year, month]
                );
                const rangeSummary = react.useMemo(
                    () => uakSummarizeRange(summary, range, year, month, today),
                    [summary, range, year, month, today]
                );
                const current = range === "month" ? monthSummary : rangeSummary;
                const heatmap = react.useMemo(
                    () => uakMonthHeatmap(summary, year, month, settings.units),
                    [summary, year, month, settings.units]
                );
                const mode = settings.bookMode === "selected" ? "selected" : "random";
                const selectedBook = mode === "selected" ? uakBookByTitle(settings.bookTitle) : undefined;
                const book = selectedBook ?? (mode === "selected" ? null : randomBook);
                const units = ["auto", "short", "myriad"].includes(settings.units) ? settings.units : "auto";
                const number = (value) => uakFormatNumber(value, units);

                // One predicate feeds the month track dots and the "no data"
                // state, so both always agree on the selected year.
                const hasMonthData = (value) => summary?.perDay !== null && typeof summary?.perDay === "object"
                    && Object.keys(summary.perDay).some((date) => date.startsWith(
                        `${year}-${String(value).padStart(2, "0")}-`
                    ));
                const monthHasData = hasMonthData(month);

                const chooseYear = (next) => {
                    if (!years.includes(next)) return;
                    setYear(next);
                    setRange("month");
                    if (!hasMonthData(month) && next !== today.getFullYear()) {
                        const months = Object.keys(summary.perDay)
                            .filter((date) => date.startsWith(`${next}-`))
                            .map((date) => Number(date.slice(5, 7)));
                        if (months.length > 0) setMonth(months[0]);
                    }
                };

                const onMonthKeyDown = (event, index) => {
                    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                    event.preventDefault();
                    const next = Math.min(11, Math.max(0, index + (event.key === "ArrowRight" ? 1 : -1)));
                    setMonth(next + 1);
                    setRange("month");
                    event.currentTarget.parentElement?.children[next]?.focus();
                };

                const selectMonthAtPointer = (event) => {
                    const track = monthTrackRef.current;
                    if (track === null) return;
                    const bounds = track.getBoundingClientRect();
                    if (!(bounds.width > 0)) return;
                    const ratio = Math.min(0.999999, Math.max(0, (event.clientX - bounds.left) / bounds.width));
                    setMonth(Math.floor(ratio * 12) + 1);
                    setRange("month");
                };
                const onMonthPointerDown = (event) => {
                    if (event.button !== 0 || monthPointerRef.current !== null) return;
                    event.preventDefault();
                    monthPointerRef.current = event.pointerId;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    selectMonthAtPointer(event);
                };
                const onMonthPointerMove = (event) => {
                    if (monthPointerRef.current !== event.pointerId) return;
                    event.preventDefault();
                    selectMonthAtPointer(event);
                };
                const onMonthPointerUp = (event) => {
                    if (monthPointerRef.current !== event.pointerId) return;
                    selectMonthAtPointer(event);
                    monthPointerRef.current = null;
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                        event.currentTarget.releasePointerCapture(event.pointerId);
                    }
                };

                const rangeLabel = uakStatsRangeLabel(range);
                const empty = request.status === "ready" && current.tokens === 0 && current.messages === 0;
                const noSelectedMonth = request.status === "ready" && tab === "models" && range === "month" && !monthHasData;

                const bodyHeight = Number.isFinite(Number(settings.bodyHeight))
                    ? Math.max(180, Math.min(900, Number(settings.bodyHeight))) : 360;

                if (!visible) return null;

                // Match the reference's height budget: fixed metrics/footer are
                // subtracted, then the square-cell cap shrinks before its gaps.
                // No viewport-derived type sizing and no cell flex collapsing.
                const heatTiers = [
                    { minCell: 18, pad: 8, gap: 4, cardPad: 11, label: 12, labelLh: 18, value: 20, valueLh: 27 },
                    { minCell: 13, pad: 6, gap: 3, cardPad: 9, label: 12, labelLh: 18, value: 18, valueLh: 24 },
                    { minCell: 9, pad: 4, gap: 2, cardPad: 6, label: 11, labelLh: 16, value: 15, valueLh: 20 }
                ];
                // Measured heights when available; conservative estimates until
                // the first measurement lands. 20 = content margin-top plus the
                // gap above the note row, 6 = row gaps inside a column.
                const metricsHeight = measured.metrics > 0 ? measured.metrics : (viewportWidth <= 720 ? 158 : 108);
                const footerHeight = measured.footer > 0 ? measured.footer : 20;
                const heatRows = 7;
                let heatLayout = heatTiers[heatTiers.length - 1];
                let heatCell = heatTiers[heatTiers.length - 1].minCell;
                for (const tier of heatTiers) {
                    const avail = bodyHeight - metricsHeight - footerHeight - 20 - tier.pad * 2 - tier.gap * (heatRows - 1);
                    const cell = Math.floor(avail / heatRows);
                    heatLayout = { ...tier, cell };
                    if (cell >= tier.minCell) {
                        heatCell = Math.min(22, cell);
                        break;
                    }
                    heatCell = Math.max(2, Math.min(22, cell));
                }
                const heatPadding = heatLayout.pad;
                const heatGap = heatLayout.gap;
                // The metrics and footer alone can already fill a very short
                // panel; only then does the band step aside instead of pushing
                // them out of view.
                const heatFits = bodyHeight - metricsHeight - footerHeight - 20 >= 40;

                return h("section", {
                    ref: panelRef,
                    className: "uak-stats",
                    "aria-label": uakStatsT("stats.section"),
                    style: {
                        "--uak-stats-height": `${bodyHeight}px`,
                        "--uak-heat-cell": `${heatCell}px`,
                        "--uak-heat-gap": `${heatGap}px`,
                        "--uak-heat-pad": `${heatPadding}px`,
                        "--uak-card-pad": `${heatLayout.cardPad}px`,
                        "--uak-card-label-size": `${heatLayout.label}px`,
                        "--uak-card-label-lh": `${heatLayout.labelLh}px`,
                        "--uak-card-value-size": `${heatLayout.value}px`,
                        "--uak-card-value-lh": `${heatLayout.valueLh}px`
                    }
                },
                    h("div", { className: "uak-statsFrame" },
                        h("header", { className: "uak-statsTopline" },
                            h("div", { className: "uak-statsTabs", role: "tablist", "aria-label": uakStatsT("stats.tabs") },
                                [["overview", uakStatsT("stats.tab.overview")], ["models", uakStatsT("stats.tab.models")]].map(([id, label]) => h("button", {
                                    key: id,
                                    type: "button",
                                    role: "tab",
                                    id: `uak-stats-tab-${id}`,
                                    className: "uak-statsTab",
                                    "aria-selected": tab === id,
                                    "aria-controls": `uak-stats-tabpanel-${id}`,
                                    onClick: () => setTab(id)
                                }, label))),
                            h("div", { className: "uak-statsPeriod" },
                                h("div", { className: "uak-statsYear" },
                                    h("button", {
                                        type: "button",
                                        className: "uak-statsIconButton",
                                        "aria-label": uakStatsT("stats.prevYear"),
                                        disabled: previousYear === undefined,
                                        onClick: () => chooseYear(previousYear)
                                    }, "‹"),
                                    h("span", { className: "uak-statsYearLabel" }, uakStatsT("stats.year", { year })),
                                    h("button", {
                                        type: "button",
                                        className: "uak-statsIconButton",
                                        "aria-label": uakStatsT("stats.nextYear"),
                                        disabled: nextYear === undefined,
                                        onClick: () => chooseYear(nextYear)
                                    }, "›")),
                                h("span", { className: "uak-statsMonthLabel" }, range === "month" ? uakStatsT("stats.monthOverview", { month }) : uakStatsT("stats.monthHint")),
                                uakStatsMonthTrack({
                                    year,
                                    month,
                                    hasData: hasMonthData,
                                    onSelect: (value) => {
                                        setMonth(value);
                                        setRange("month");
                                    },
                                    onKeyDown: onMonthKeyDown,
                                    rootProps: {
                                        ref: monthTrackRef,
                                        onPointerDown: onMonthPointerDown,
                                        onPointerMove: onMonthPointerMove,
                                        onPointerUp: onMonthPointerUp,
                                        onPointerCancel: onMonthPointerUp
                                    }
                                })
                            ),
                            h("div", { className: "uak-statsRanges", role: "group", "aria-label": uakStatsT("stats.rangeGroup") },
                                ["month", "all", "30d", "7d"].map((id) => h("button", {
                                    key: id,
                                    type: "button",
                                    className: "uak-statsRange",
                                    "aria-pressed": range === id,
                                    onClick: () => {
                                        setRange(id);
                                        if (id !== "month") setTab("overview");
                                    }
                                }, uakStatsRangeLabel(id))))
                        ),
                        h("div", { className: "uak-statsBody" },
                            request.status === "loading" && summary === null
                                ? uakStatsStatus(uakStatsT("stats.loading"))
                                : request.status === "error"
                                    ? uakStatsStatus(uakStatsT("stats.error"), {
                                        error: true,
                                        action: h("button", {
                                            type: "button",
                                            className: "uak-statsRetry",
                                            onClick: () => setReloadKey((key) => key + 1)
                                        }, uakStatsT("stats.retry"))
                                    })
                                    : h(react.Fragment, null,
                                        noSelectedMonth ? uakStatsStatus(
                                            uakStatsT("stats.noMonth", { year, month }),
                                            { hint: uakStatsT("stats.noMonthHint") })
                                            : empty ? uakStatsStatus(
                                                uakStatsT("stats.empty", { range: rangeLabel }),
                                                { hint: uakStatsT("stats.emptyHint") })
                                                : tab === "models"
                                                    ? uakStatsModelTable({
                                                        models: current.models,
                                                        rangeLabel,
                                                        formatNumber: number
                                                    })
                                                    : h("div", {
                                                        className: "uak-statsOverview",
                                                        role: "tabpanel",
                                                        id: "uak-stats-tabpanel-overview",
                                                        "aria-labelledby": "uak-stats-tab-overview"
                                                    },
                                                        h("div", { className: "uak-statsMetricsWrap", ref: metricsRef }, uakStatsMetricCards(current.metrics, number)),
                                                        h("div", { className: "uak-statsContent" },
                                                            heatFits ? h("div", { className: "uak-statsHeatScroll" },
                                                                uakStatsHeatmap({ year, month, summary, today })
                                                            ) : null
                                                        ),
                                                        // The note lives on its own row below the heat band,
                                                        // never inside it, and stays a single line.
                                                        h("div", { className: "uak-statsNote", ref: footerRef },
                                                            uakStatsBookComparison({
                                                                book,
                                                                mode,
                                                                tokens: current.tokens,
                                                                range,
                                                                units,
                                                                formatNumber: number
                                                            }),
                                                            uakStatsLegend(heatmap.legends)
                                                        )
                                                    )
                                    )
                        )
                    )
                );
            }

            UsagePanel.displayName = "UtilityAppearanceKitUsagePanel";
            return UsagePanel;
        }

        // The Host/apply layer owns the shared settings store and injects it
        // here; this module never creates a second settings page or store.
        function uakRegisterUsagePanel(ctx, settingsStore) {
            if (typeof ctx?.inject !== "function") return () => {};
            let disposed = false;
            let unregister;
            const mount = (scope) => {
                if (disposed) return undefined;
                const slots = scope.get("slots");
                const component = uakCreateUsagePanel(settingsStore);
                unregister = slots.inject(uakUsagePanelSlot, () => slots.register({
                    name: uakUsagePanelSlot,
                    id: "utility-appearance-kit-statistics",
                    order: 80,
                    available: uakUsageShouldShow
                }, component));
                return () => {
                    try { unregister?.(); } catch { /* ignore */ }
                    unregister = undefined;
                };
            };
            const install = () => ctx.inject(["slots"], (scope) => {
                if (typeof scope.effect === "function") return scope.effect(() => mount(scope));
                return mount(scope);
            });
            const disposeEffect = typeof ctx.effect === "function" ? ctx.effect(install) : install();
            return () => {
                disposed = true;
                try { disposeEffect?.(); } catch { /* ignore */ }
                try { unregister?.(); } catch { /* ignore */ }
                unregister = undefined;
            };
        }
