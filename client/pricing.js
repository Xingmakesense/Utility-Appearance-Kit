        // -------------------------------------------------------------------
        // Peak / valley pricing (DeepSeek API, Beijing time).
        //
        // Published rule (api-docs.deepseek.com, 模型 & 价格): peak is Monday to
        // Friday, excluding Chinese statutory holidays, 09:00–12:00 and
        // 14:00–18:00 Beijing time; every other hour, plus all weekends and
        // statutory holidays, is valley (half price). Only statutory holiday
        // dates matter: a make-up workday on a Saturday is still a weekend and
        // therefore still valley.
        //
        // The host scans a public holiday dataset once per Beijing month and
        // serves the merged result at HOLIDAY_ROUTE; HOLIDAY_FALLBACK keeps the
        // indicator correct when that route is unavailable (first paint,
        // headless host, offline laptop).
        // -------------------------------------------------------------------
        const PEAK_HOURS = [[9, 12], [14, 18]];
        const BJ_OFFSET_MS = 8 * 3600 * 1000;
        const HOLIDAY_ROUTE = "/utility-appearance-kit/holidays.json";

        const HOLIDAY_FALLBACK = Object.freeze({
            "2026": [
                "2026-01-01", "2026-01-02", "2026-01-03",
                "2026-02-15", "2026-02-16", "2026-02-17", "2026-02-18", "2026-02-19", "2026-02-20", "2026-02-21", "2026-02-22", "2026-02-23",
                "2026-04-04", "2026-04-05", "2026-04-06",
                "2026-05-01", "2026-05-02", "2026-05-03", "2026-05-04", "2026-05-05",
                "2026-06-19", "2026-06-20", "2026-06-21",
                "2026-09-25", "2026-09-26", "2026-09-27",
                "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07"
            ]
        });

        function beijingDate(ms) {
            return new Date(ms + BJ_OFFSET_MS);
        }

        function beijingDayKey(ms) {
            return beijingDate(ms).toISOString().slice(0, 10);
        }

        function holidayDatesOf(entry) {
            const list = Array.isArray(entry) ? entry : entry?.offDays;
            return Array.isArray(list) ? list.filter((date) => typeof date === "string") : [];
        }

        function buildHolidaySet(calendar) {
            const set = new Set();
            for (const entry of Object.values(calendar ?? {})) {
                for (const date of holidayDatesOf(entry)) set.add(date);
            }
            return set;
        }

        function mergeCalendar(base, incoming) {
            const merged = { ...(base ?? {}) };
            const years = incoming?.years ?? incoming;
            if (years === null || typeof years !== "object") return merged;
            for (const [year, entry] of Object.entries(years)) {
                if (!/^\d{4}$/.test(year)) continue;
                const dates = [...new Set(holidayDatesOf(entry))].sort();
                if (dates.length > 0) merged[year] = dates;
            }
            return merged;
        }

        function calendarHasYear(calendar, year) {
            return holidayDatesOf(calendar?.[String(year)]).length > 0;
        }

        function isPeakTime(ms, offDays) {
            if (!Number.isFinite(ms)) return false;
            const bj = beijingDate(ms);
            const dow = bj.getUTCDay();
            if (dow === 0 || dow === 6) return false;
            if (offDays.has(bj.toISOString().slice(0, 10))) return false;
            const hour = bj.getUTCHours();
            for (const [start, end] of PEAK_HOURS) {
                if (hour >= start && hour < end) return true;
            }
            return false;
        }

        function nextPeakChangeAt(ms, offDays) {
            const cur = isPeakTime(ms, offDays);
            const sec = Math.floor(ms / 1000);
            const day0 = Math.floor((sec + 8 * 3600) / 86400) * 86400;
            // A statutory holiday plus the surrounding weekend can keep one
            // price state for more than a week (the National Day break is the
            // longest), so look far enough ahead instead of only 12 days.
            for (let day = 0; day <= 45; day++) {
                for (const edge of [0, 9, 12, 14, 18]) {
                    const candidate = day0 + day * 86400 + edge * 3600 - 8 * 3600;
                    if (candidate * 1000 <= ms) continue;
                    if (isPeakTime(candidate * 1000, offDays) !== cur) return candidate * 1000;
                }
            }
            return null;
        }

        function remainingLabel(ms) {
            if (!Number.isFinite(ms) || ms < 0) ms = 0;
            const total = Math.floor(ms / 1000);
            const hours = Math.floor(total / 3600);
            const minutes = Math.floor((total % 3600) / 60);
            const seconds = total % 60;
            return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
        }

        const pricingCss = `
.dsh-uak-brand {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    height: 24px;
    color: inherit;
}
.dsh-uak-brand > svg {
    display: block;
    flex: none;
}
.dsh-uak-wordmarkFallback {
    flex: none;
    font-size: 17px;
    font-weight: 600;
    letter-spacing: .04em;
    white-space: nowrap;
}
.dsh-uak-peak {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    box-sizing: border-box;
    height: 24px;
    padding: 0 7px;
    border: 1px solid transparent;
    border-radius: 12px;
    background: transparent;
    color: var(--dsw-alias-label-secondary);
    font-size: 13px;
    font-weight: 500;
    line-height: 22px;
    cursor: default;
    user-select: none;
    flex: none;
}
.dsh-uak-peak:focus-visible {
    outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
    outline-offset: 1px;
}
.dsh-uak-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex: none;
}
.dsh-uak-peakTip {
    position: fixed;
    z-index: 10001;
    width: max-content;
    max-width: 220px;
    padding: 7px 10px;
    border: 0;
    border-radius: var(--dsw-radius-md, 8px);
    background: var(--dsw-alias-bg-module-platform);
    box-shadow: var(--dsw-shadow-lv3);
    color: var(--dsw-alias-label-primary);
    font-size: 11px;
    line-height: 17px;
    pointer-events: none;
}
.dsh-uak-lockTip {
    position: fixed;
    z-index: 10001;
    padding: 5px 9px;
    border: 0;
    border-radius: 6px;
    background: var(--dsw-alias-bg-module-platform);
    box-shadow: var(--dsw-shadow-lv3);
    color: var(--dsw-alias-label-primary);
    font-size: 11px;
    line-height: 16px;
    white-space: nowrap;
    pointer-events: none;
}
.dsh-uak-lockOverlay {
    position: absolute;
    inset: 0;
    z-index: 20;
    border-radius: var(--dsw-radius-sm, 6px);
    cursor: default;
}
.dsh-uak-peakTip strong {
    display: block;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 2px;
}
.dsh-uak-peakTip b {
    font-size: 15px;
    font-variant-numeric: tabular-nums;
}
`;

        function useHolidayCalendar() {
            const [calendar, setCalendar] = react.useState(HOLIDAY_FALLBACK);
            react.useEffect(() => {
                if (typeof fetch !== "function" || typeof document === "undefined") return undefined;
                let live = true;
                let controller;
                const load = () => {
                    controller?.abort();
                    controller = new AbortController();
                    fetch(HOLIDAY_ROUTE, { cache: "no-store", signal: controller.signal })
                        .then((response) => response.ok ? response.json() : null)
                        .then((payload) => {
                            if (!live || payload === null) return;
                            setCalendar((current) => mergeCalendar(current, payload));
                        })
                        .catch(() => {});
                };
                load();
                // The host refreshes its cache from a public calendar feed. A
                // long-lived page must observe that result without a reload.
                const timer = setInterval(load, 6 * 3600 * 1000);
                return () => {
                    live = false;
                    clearInterval(timer);
                    controller?.abort();
                };
            }, []);
            return calendar;
        }

        function PricingPill() {
            const calendar = useHolidayCalendar();
            const offDays = react.useMemo(() => buildHolidaySet(calendar), [calendar]);
            const [now, setNow] = react.useState(() => Date.now());
            const [hover, setHover] = react.useState(false);
            const [rect, setRect] = react.useState(null);
            const rootRef = react.useRef(null);
            const shown = hover;
            const dayKey = beijingDayKey(now);
            // A missing year is not evidence that every date is a workday.
            // Show "unknown" instead of silently painting New Year's Day as peak.
            const calendarKnown = calendarHasYear(calendar, dayKey.slice(0, 4));
            const peak = calendarKnown ? isPeakTime(now, offDays) : undefined;
            const accent = peak === undefined ? "var(--dsw-alias-label-caption)" : peak ? "#e0433f" : "#2fa24c";
            const next = react.useMemo(
                () => calendarKnown ? nextPeakChangeAt(now, offDays) : null,
                [calendarKnown, offDays, peak, dayKey]
            );

            // A single timer at the next price boundary replaces the old 30 s
            // poll. `now` is a dependency so a timer that wakes before a far
            // boundary (the 1h cap) reschedules instead of stopping forever.
            react.useEffect(() => {
                if (shown) return undefined;
                const target = next === null ? Date.now() + 3_600_000 : next;
                const delay = Math.min(3_600_000, Math.max(1_000, target - Date.now() + 300));
                const timer = setTimeout(() => setNow(Date.now()), delay);
                return () => clearTimeout(timer);
            }, [shown, next, now]);
            react.useEffect(() => {
                if (!shown) return undefined;
                setNow(Date.now());
                const timer = setInterval(() => setNow(Date.now()), 1_000);
                return () => clearInterval(timer);
            }, [shown]);
            react.useEffect(() => {
                if (!shown) {
                    setRect(null);
                    return undefined;
                }
                const update = () => {
                    const node = rootRef.current;
                    if (node !== null) setRect(node.getBoundingClientRect());
                };
                update();
                window.addEventListener("resize", update);
                return () => window.removeEventListener("resize", update);
            }, [shown]);

            const tipLeft = rect === null ? 0 : Math.max(8, Math.min(rect.left, (window.innerWidth || 1024) - 236));
            const tip = shown && rect !== null
                ? react.createElement(
                    "span",
                    {
                        className: "dsh-uak-peakTip",
                        role: "tooltip",
                        style: {
                            left: `${Math.round(tipLeft)}px`,
                            top: `${Math.round(rect.bottom + 6)}px`
                        }
                    },
                    react.createElement("strong", { style: { color: accent } },
                        peak === undefined ? "节假日数据未知" : peak ? "高峰时段" : "空闲时段"),
                    react.createElement("span", { style: { color: "var(--dsw-alias-label-primary)" } }, "距切换 "),
                    react.createElement("b", { style: { color: accent } },
                        peak === undefined ? "--:--:--" : remainingLabel(next === null ? 0 : next - now))
                )
                : null;

            return react.createElement(
                "span",
                {
                    ref: rootRef,
                    className: "dsh-uak-peak",
                    role: "note",
                    tabIndex: 0,
                    "aria-label": peak === undefined ? "节假日数据未知" : peak ? "高峰时段" : "空闲时段",
                    onMouseEnter: () => setHover(true),
                    onMouseLeave: () => setHover(false),
                    onFocus: () => setHover(true),
                    onBlur: () => setHover(false)
                },
                react.createElement("span", { className: "dsh-uak-dot", style: { background: accent } }),
                react.createElement("span", { style: { color: accent } },
                    peak === undefined ? "未知" : peak ? "峰" : "谷"),
                tip === null ? null : (typeof reactDom?.createPortal === "function" ? reactDom.createPortal(tip, document.body) : tip)
            );
        }

        /**
         * Occupant of `sidebar.brand.name`: the official DeepSeek wordmark
         * (unchanged colour) followed immediately by the pricing pill. The
         * official brand-name occupant cannot render beside a second occupant
         * in this single slot, so this component re-renders the same official
         * `BrandWordmark` primitive instead of inventing new artwork.
         */
        function BrandIdentity() {
            const wordmark = typeof primitives?.BrandWordmark === "function"
                ? react.createElement(primitives.BrandWordmark, { includeMark: false, size: 22 })
                : react.createElement("span", { className: "dsh-uak-wordmarkFallback" }, "deepseek");
            return react.createElement(
                "span",
                { className: "dsh-uak-brand", "data-dsh-plugin": name },
                wordmark,
                react.createElement(PricingPill)
            );
        }

