        // Pure usage/calendar calculations. Books live in client/books.js and
        // user-facing copy in client/statistics-i18n.js, so this file holds the
        // statistics math only. This file shares the client factory scope, so
        // every public constant has a unique uak prefix.
        const uakUsageFirstMonthThresholds = Object.freeze([
            20000,
            100000,
            500000,
            1000000
        ]);

        const uakUsageNeutralColor = "var(--dsw-alias-fill-secondary, #e8edf3)";
        const uakUsageHeatColors = Object.freeze([
            uakUsageNeutralColor,
            "#dbeafe",
            "#93c5fd",
            "#60a5fa",
            "#2563eb",
            "#1e3a8a"
        ]);

        function uakClampMonth(month) {
            const value = Number.isFinite(Number(month)) ? Math.trunc(Number(month)) : 1;
            return Math.min(12, Math.max(1, value));
        }

        function uakClampYear(year, minimum = 1970, maximum = 9999) {
            const value = Number.isFinite(Number(year)) ? Math.trunc(Number(year)) : minimum;
            return Math.min(maximum, Math.max(minimum, value));
        }

        function uakDayKey(year, month, day) {
            return `${uakClampYear(year)}-${String(uakClampMonth(month)).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        }

        function uakIsDayKey(value) {
            if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
            const year = Number(value.slice(0, 4));
            const month = Number(value.slice(5, 7));
            const day = Number(value.slice(8, 10));
            if (month < 1 || month > 12 || day < 1) return false;
            const date = new Date(Date.UTC(year, month - 1, day));
            return date.getUTCFullYear() === year
                && date.getUTCMonth() === month - 1
                && date.getUTCDate() === day;
        }

        function uakFiniteCount(value) {
            const number = typeof value === "number" ? value : Number(value);
            return Number.isFinite(number) && number > 0 ? number : 0;
        }

        function uakEmptyDay() {
            return { tokens: 0, messages: 0, hours: Array(24).fill(0), messageHours: Array(24).fill(0), models: {} };
        }

        function uakNormalizeDay(value) {
            const source = value !== null && typeof value === "object" ? value : {};
            const models = {};
            const rawModels = source.models !== null && typeof source.models === "object"
                ? source.models : {};
            for (const [id, model] of Object.entries(rawModels)) {
                if (model === null || typeof model !== "object") continue;
                models[id] = {
                    tokens: uakFiniteCount(model.tokens),
                    messages: uakFiniteCount(model.messages)
                };
            }
            const hours = Array.from({ length: 24 }, (_, index) => uakFiniteCount(source.hours?.[index]));
            const messageHours = Array.from({ length: 24 }, (_, index) => uakFiniteCount(source.messageHours?.[index]));
            return {
                tokens: uakFiniteCount(source.tokens),
                messages: uakFiniteCount(source.messages),
                hours,
                messageHours,
                models
            };
        }

        function uakPerDayEntries(summary) {
            if (summary === null || typeof summary !== "object"
                || summary.perDay === null || typeof summary.perDay !== "object") return [];
            return Object.entries(summary.perDay)
                .filter(([date]) => uakIsDayKey(date))
                .sort(([left], [right]) => left.localeCompare(right));
        }

        function uakMergeUsage(target, source) {
            target.tokens += uakFiniteCount(source?.tokens);
            target.messages += uakFiniteCount(source?.messages);
            for (let index = 0; index < 24; index += 1) {
                target.hours[index] += uakFiniteCount(source?.hours?.[index]);
                target.messageHours[index] += uakFiniteCount(source?.messageHours?.[index]);
            }
            const models = source?.models !== null && typeof source?.models === "object" ? source.models : {};
            for (const [id, model] of Object.entries(models)) {
                if (target.models[id] === undefined) target.models[id] = { id, tokens: 0, messages: 0 };
                target.models[id].tokens += uakFiniteCount(model?.tokens);
                target.models[id].messages += uakFiniteCount(model?.messages);
            }
            return target;
        }

        function uakNewUsage() {
            return { tokens: 0, messages: 0, hours: Array(24).fill(0), messageHours: Array(24).fill(0), models: {} };
        }

        function uakFinalizeUsage(usage) {
            return {
                tokens: usage.tokens,
                messages: usage.messages,
                hours: usage.hours,
                messageHours: usage.messageHours,
                models: Object.values(usage.models).sort((left, right) => right.tokens - left.tokens
                    || left.id.localeCompare(right.id))
            };
        }

        function uakAddModelTotal(target, id, tokens, messages) {
            if (target[id] === undefined) target[id] = { id, tokens: 0, messages: 0 };
            target[id].tokens += uakFiniteCount(tokens);
            target[id].messages += uakFiniteCount(messages);
        }

        function uakUsageMetrics(usage, sessions, activeDays, messageHours = usage.messageHours ?? Array(24).fill(0)) {
            let peakHour = 0;
            for (let index = 1; index < 24; index += 1) {
                if (messageHours[index] > messageHours[peakHour]) peakHour = index;
            }
            const favoriteModel = usage.models.length > 0 ? usage.models[0].id : "—";
            return [
                { id: "sessions", label: uakStatsT("stats.metric.sessions"), value: sessions, format: "number" },
                { id: "messages", label: uakStatsT("stats.metric.messages"), value: usage.messages, format: "number" },
                { id: "tokens", label: uakStatsT("stats.metric.tokens"), value: usage.tokens, format: "number" },
                { id: "activeDays", label: uakStatsT("stats.metric.activeDays"), value: activeDays, format: "number" },
                { id: "peakHour", label: uakStatsT("stats.metric.peakHour"), value: messageHours.some((value) => value > 0) ? `${String(peakHour).padStart(2, "0")}:00` : "—", format: "text" },
                { id: "favoriteModel", label: uakStatsT("stats.metric.favoriteModel"), value: favoriteModel, format: "text" }
            ];
        }

        // The six headline metrics are shared by month and range views.
        function uakSummarizeMonth(summary, year, month) {
            const normalizedYear = uakClampYear(year);
            const normalizedMonth = uakClampMonth(month);
            const prefix = `${normalizedYear}-${String(normalizedMonth).padStart(2, "0")}-`;
            const usage = uakNewUsage();
            const sessions = new Set();
            const perDay = {};
            for (const [date, raw] of uakPerDayEntries(summary)) {
                if (!date.startsWith(prefix)) continue;
                const day = uakNormalizeDay(raw);
                perDay[date] = day;
                uakMergeUsage(usage, day);
                const count = uakFiniteCount(summary.sessionsByDay?.[date]);
                for (let index = 0; index < count; index += 1) sessions.add(`${date}:${index}`);
            }
            const finalized = uakFinalizeUsage(usage);
            const days = Object.entries(perDay).sort(([left], [right]) => left.localeCompare(right));
            const activeDays = days.filter(([, day]) => day.tokens > 0 || day.messages > 0).length;
            const peakEntry = days.reduce((peak, entry) => peak === null || entry[1].tokens > peak[1].tokens
                ? entry : peak, null);
            const activeHours = finalized.hours.filter((value) => value > 0).length;
            let peakHour = 0;
            for (let index = 1; index < 24; index += 1) {
                if (finalized.messageHours[index] > finalized.messageHours[peakHour]) peakHour = index;
            }
            const favoriteModel = finalized.models.length > 0 ? finalized.models[0].id : null;
            return {
                year: normalizedYear,
                month: normalizedMonth,
                tokens: finalized.tokens,
                messages: finalized.messages,
                sessions: sessions.size,
                activeDays,
                activeHours,
                peakHour,
                favoriteModel,
                peakDay: peakEntry === null ? null : peakEntry[0],
                peakDayTokens: peakEntry === null ? 0 : peakEntry[1].tokens,
                metrics: uakUsageMetrics(finalized, sessions.size, activeDays, finalized.messageHours),
                models: finalized.models,
                perDay
            };
        }

        function uakDayCells(summary, year, month) {
            const normalizedYear = uakClampYear(year);
            const normalizedMonth = uakClampMonth(month);
            const count = new Date(Date.UTC(normalizedYear, normalizedMonth, 0)).getUTCDate();
            // Monday-first, like the weekday labels in the panel.
            const offset = (new Date(Date.UTC(normalizedYear, normalizedMonth - 1, 1)).getUTCDay() + 6) % 7;
            const cells = Array.from({ length: offset }, (_, index) => ({
                key: `blank-${index}`, date: null, blank: true, tokens: 0, messages: 0
            }));
            for (let day = 1; day <= count; day += 1) {
                const date = uakDayKey(normalizedYear, normalizedMonth, day);
                const raw = summary?.perDay?.[date];
                const normalized = uakNormalizeDay(raw);
                cells.push({
                    key: date,
                    date,
                    day,
                    blank: false,
                    tokens: normalized.tokens,
                    messages: normalized.messages,
                    hours: normalized.hours,
                    models: normalized.models
                });
            }
            return cells;
        }

        function uakPositiveTokenHistory(summary, beforeDate) {
            return uakPerDayEntries(summary)
                .filter(([date]) => beforeDate === undefined || date < beforeDate)
                .map(([, day]) => uakFiniteCount(day?.tokens))
                .filter((tokens) => tokens > 0)
                .sort((left, right) => left - right);
        }

        function uakHeatThresholds(summary, year, month) {
            const normalizedYear = uakClampYear(year);
            const normalizedMonth = uakClampMonth(month);
            const prefix = `${normalizedYear}-${String(normalizedMonth).padStart(2, "0")}`;
            const firstMonth = uakIsDayKey(summary?.firstDay)
                ? summary.firstDay.slice(0, 7)
                : uakPerDayEntries(summary).find(([, day]) => uakFiniteCount(day?.tokens) > 0)?.[0]?.slice(0, 7) ?? prefix;
            if (firstMonth === prefix) return [...uakUsageFirstMonthThresholds];
            const history = uakPositiveTokenHistory(summary);
            if (history.length === 0) return [...uakUsageFirstMonthThresholds];
            const p60 = Math.max(1, Math.ceil(history[Math.ceil(0.6 * history.length) - 1]));
            const thresholds = [];
            for (let index = 1; index <= 4; index += 1) {
                const previous = thresholds.length === 0 ? 0 : thresholds[thresholds.length - 1];
                thresholds.push(Math.max(previous + 1, Math.ceil(p60 * index / 4)));
            }
            return thresholds;
        }

        function uakHeatLevel(tokens, thresholds) {
            if (!(tokens > 0)) return 0;
            for (let index = 0; index < thresholds.length; index += 1) {
                if (tokens <= thresholds[index]) return index + 1;
            }
            return 5;
        }

        function uakFormatThreshold(value, units) {
            if (units === "auto") units = uakIsEnglish() ? "short" : "myriad";
            if (units === "short" && value >= 1000) {
                const number = value / 1000;
                return `${Number(number.toFixed(number >= 100 ? 0 : 1))}k`;
            }
            if (units === "myriad" && value >= 10000) {
                const number = value / 10000;
                return `${Number(number.toFixed(number >= 100 ? 0 : 1))}万`;
            }
            return String(value);
        }

        function uakMonthHeatmap(summary, year, month, units = "auto") {
            const thresholds = uakHeatThresholds(summary, year, month);
            const cells = uakDayCells(summary, year, month);
            const levels = cells.map((cell) => cell.blank ? null : uakHeatLevel(cell.tokens, thresholds));
            const labels = [uakStatsT("stats.heatNone")];
            let lower = 0;
            for (let index = 0; index < thresholds.length; index += 1) {
                const upper = thresholds[index];
                labels.push(`${uakFormatThreshold(lower + 1, units)}–${uakFormatThreshold(upper, units)}`);
                lower = upper;
            }
            labels.push(`>${uakFormatThreshold(lower, units)}`);
            return {
                thresholds,
                levels,
                legends: labels.map((label, level) => ({
                    level,
                    label,
                    color: uakUsageHeatColors[level]
                }))
            };
        }

        function uakFormatNumber(value, units = "auto") {
            if (units === "auto") units = uakIsEnglish() ? "short" : "myriad";
            const number = Number.isFinite(Number(value)) ? Number(value) : 0;
            const absolute = Math.abs(number);
            const sign = number < 0 ? "-" : "";
            if (units === "short") {
                if (absolute >= 1000000000) return `${sign}${Number((absolute / 1000000000).toFixed(1))}B`;
                if (absolute >= 1000000) return `${sign}${Number((absolute / 1000000).toFixed(1))}M`;
                if (absolute >= 1000) return `${sign}${Number((absolute / 1000).toFixed(1))}k`;
            }
            if (units === "myriad") {
                if (absolute >= 100000000) return `${sign}${Number((absolute / 100000000).toFixed(1))}亿`;
                if (absolute >= 10000) return `${sign}${Number((absolute / 10000).toFixed(1))}万`;
            }
            return number.toLocaleString(uakIsEnglish() ? "en-US" : "zh-CN", Number.isInteger(number) ? {} : { maximumFractionDigits: 2 });
        }

        function uakTodayKey(date = new Date()) {
            const value = date instanceof Date ? date : new Date(date);
            if (!Number.isFinite(value.getTime())) return null;
            return uakDayKey(value.getFullYear(), value.getMonth() + 1, value.getDate());
        }

        function uakAvailableYears(summary) {
            const years = [...new Set(uakPerDayEntries(summary).map(([date]) => Number(date.slice(0, 4))))];
            return years.sort((left, right) => left - right);
        }

        // Non-month views never reuse the monthly headline summary. When the
        // Host has no all-time aggregate, perDay supplies the complete fallback.
        function uakSummarizeRange(summary, range = "month", year, month, now = new Date()) {
            if (range === "month") return uakSummarizeMonth(summary, year, month);
            const allTime = summary?.allTime ?? summary?.total ?? summary?.overall;
            const today = uakTodayKey(now);
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            if (range === "30d") start.setDate(start.getDate() - 29);
            if (range === "7d") start.setDate(start.getDate() - 6);
            const since = uakDayKey(start.getFullYear(), start.getMonth() + 1, start.getDate());
            const usage = uakNewUsage();
            let activeDays = 0;
            let peakDay = null;
            let peakDayTokens = 0;
            let sessions = 0;
            if (range === "all" && allTime !== null && typeof allTime === "object") {
                usage.tokens = uakFiniteCount(allTime.tokens);
                usage.messages = uakFiniteCount(allTime.messages);
                sessions = uakFiniteCount(allTime.sessions);
                for (let index = 0; index < 24; index += 1) {
                    usage.hours[index] = uakFiniteCount(allTime.hours?.[index]);
                    usage.messageHours[index] = uakFiniteCount(allTime.messageHours?.[index]);
                }
                for (const [id, model] of Object.entries(allTime.models ?? {})) {
                    uakAddModelTotal(usage.models, id, model?.tokens, model?.messages);
                }
            }
            for (const [date, raw] of uakPerDayEntries(summary)) {
                if (range !== "all" && (today === null || date < since || date > today)) continue;
                const day = uakNormalizeDay(raw);
                if (day.tokens > 0 || day.messages > 0) activeDays += 1;
                if (day.tokens > peakDayTokens) {
                    peakDay = date;
                    peakDayTokens = day.tokens;
                }
                sessions += uakFiniteCount(summary.sessionsByDay?.[date]);
                // All-time totals are authoritative, but daily model rows fill
                // in any breakdown omitted by the Host's aggregate.
                if (range !== "all" || allTime === null || typeof allTime !== "object") {
                    uakMergeUsage(usage, day);
                } else if (allTime.models === undefined) {
                    for (const [id, model] of Object.entries(day.models)) {
                        uakAddModelTotal(usage.models, id, model.tokens, model.messages);
                    }
                }
            }
            const finalized = uakFinalizeUsage(usage);
            const activeHours = finalized.hours.filter((value) => value > 0).length;
            let peakHour = 0;
            for (let index = 1; index < 24; index += 1) {
                if (finalized.messageHours[index] > finalized.messageHours[peakHour]) peakHour = index;
            }
            const favoriteModel = finalized.models.length > 0 ? finalized.models[0].id : null;
            return {
                range,
                tokens: finalized.tokens,
                messages: finalized.messages,
                sessions,
                activeDays,
                activeHours,
                peakHour,
                favoriteModel,
                peakDay,
                peakDayTokens,
                metrics: uakUsageMetrics(finalized, sessions, activeDays, finalized.messageHours),
                models: finalized.models
            };
        }
