        // User-facing statistics copy. Every zh/en pair for the panel lives
        // here so statistics.js and statistics-ui.js never accumulate inline
        // bilingual literals. This file shares the client factory scope (no
        // import/export), so each identifier keeps the unique uak prefix.
        //
        // uakStatsT(key, params) is the only accessor:
        //  - a string value is returned as-is for the active language;
        //  - `{name}` placeholders are replaced from params;
        //  - a param whose value is `{ zh, en }` is resolved to the active
        //    language, which keeps one template valid for both locales even
        //    when the surrounding sentence needs a different phrase order;
        //  - an array value (e.g. weekday labels) is returned unchanged.
        const UAK_STATS_DICTIONARY = Object.freeze({
            zh: Object.freeze({
                "stats.section": "使用统计",
                "stats.prevYear": "上一个有数据年份",
                "stats.nextYear": "下一个有数据年份",
                "stats.year": "{year} 年",
                "stats.monthOverview": "{month} 月使用概览",
                "stats.monthHint": "月份选择（切换后回到月视图）",
                "stats.rangeGroup": "统计范围",
                "stats.range.month": "月度",
                "stats.range.all": "全部",
                "stats.range.30d": "30天",
                "stats.range.7d": "7天",
                "stats.monthsGroup": "选择月份，可点击或拖动",
                "stats.monthAria": "{year} 年 {month} 月",
                "stats.monthAriaEmpty": "{year} 年 {month} 月，无数据",
                "stats.narrative.month": "{year} 年 {month} 月",
                "stats.narrative.all": "全部时间",
                "stats.narrative.30d": "最近 30 天",
                "stats.narrative.7d": "最近 7 天",
                "stats.tabs": "统计内容",
                "stats.tab.overview": "总览",
                "stats.tab.models": "模型",
                "stats.loading": "正在读取使用统计…",
                "stats.error": "暂时无法读取使用统计。",
                "stats.retry": "重试",
                "stats.invalidResponse": "统计响应格式无效",
                "stats.noMonth": "{range}暂无使用记录",
                "stats.noMonthHint": "该月份仍可选择，切换到其他范围可查看已有统计。",
                "stats.empty": "{range}暂无活动",
                "stats.emptyHint": "完成一次会话后，这里会显示用量与书籍对照。",
                "stats.modelTable.model": "模型",
                "stats.modelTable.messages": "消息数",
                "stats.noModels": "{range}暂无模型用量",
                "stats.heatTitle": "{year} 年 {month} 月 · 每日 Token",
                "stats.heatAria": "{year} 年 {month} 月每日 Token 热力图",
                "stats.heatNone": "无消耗",
                "stats.heatLegendAria": "每日 Token 五档图例",
                "stats.cellTitle": "{date} · {tokens} Token · {messages} 条消息",
                "stats.weekdays": ["一", "二", "三", "四", "五", "六", "日"],
                "stats.bookSection": "书籍对照",
                "stats.bookEmpty": "请在设置页选择一本书。",
                "stats.bookRandom": "随机书籍",
                "stats.bookSelected": "我的书籍",
                "stats.bookTitle": "《{title}》",
                "stats.bookDescription": "《{title}》约{chars}字 · {tier}，你{period}约使用 {tokens} Token，约相当于 {equivalent} 本。",
                "stats.bookRatio": "约 {percent}% 本书的字数对照",
                "stats.period.month": "本月",
                "stats.period.all": "累计",
                "stats.period.30d": "近30天",
                "stats.period.7d": "近7天",
                "stats.metric.sessions": "会话数",
                "stats.metric.messages": "消息数",
                "stats.metric.tokens": "总 Token",
                "stats.metric.activeDays": "活跃天数",
                "stats.metric.peakHour": "高峰时段",
                "stats.metric.favoriteModel": "常用模型",
                "stats.tier.short": "短章",
                "stats.tier.medium": "中构",
                "stats.tier.epic": "鸿篇"
            }),
            en: Object.freeze({
                "stats.section": "Usage statistics",
                "stats.prevYear": "Previous year with activity",
                "stats.nextYear": "Next year with activity",
                "stats.year": "{year}",
                "stats.monthOverview": "Month {month} overview",
                "stats.monthHint": "Choose a month to return to the monthly view",
                "stats.rangeGroup": "Statistics range",
                "stats.range.month": "Month",
                "stats.range.all": "All",
                "stats.range.30d": "30 days",
                "stats.range.7d": "7 days",
                "stats.monthsGroup": "Select a month by clicking or dragging",
                "stats.monthAria": "{year}-{month}",
                "stats.monthAriaEmpty": "{year}-{month}, no activity",
                "stats.narrative.month": "{year}-{month}",
                "stats.narrative.all": "All time",
                "stats.narrative.30d": "Last 30 days",
                "stats.narrative.7d": "Last 7 days",
                "stats.tabs": "Statistics content",
                "stats.tab.overview": "Overview",
                "stats.tab.models": "Models",
                "stats.loading": "Loading usage statistics…",
                "stats.error": "Usage statistics are unavailable.",
                "stats.retry": "Retry",
                "stats.invalidResponse": "Invalid statistics response",
                "stats.noMonth": "No activity in {range}",
                "stats.noMonthHint": "This month stays selected. Choose another range to view existing statistics.",
                "stats.empty": "No activity for {range}",
                "stats.emptyHint": "Finish a session to see usage and book comparisons here.",
                "stats.modelTable.model": "Model",
                "stats.modelTable.messages": "Messages",
                "stats.noModels": "No model usage for {range}",
                "stats.heatTitle": "{year}-{month} · Daily tokens",
                "stats.heatAria": "Daily token heatmap for {year}-{month}",
                "stats.heatNone": "No activity",
                "stats.heatLegendAria": "Five daily token levels",
                "stats.cellTitle": "{date} · {tokens} tokens · {messages} messages",
                "stats.weekdays": ["M", "T", "W", "T", "F", "S", "S"],
                "stats.bookSection": "Book comparison",
                "stats.bookEmpty": "Select a book in settings.",
                "stats.bookRandom": "Random book",
                "stats.bookSelected": "Selected book",
                "stats.bookTitle": "{title}",
                "stats.bookDescription": "{title} · {tier} · ≈{chars} characters. Your {period} usage of {tokens} tokens is about {equivalent} copies.",
                "stats.bookRatio": "Approximately {percent}% of one copy",
                "stats.period.month": "this month",
                "stats.period.all": "all-time",
                "stats.period.30d": "last 30 days",
                "stats.period.7d": "last 7 days",
                "stats.metric.sessions": "Sessions",
                "stats.metric.messages": "Messages",
                "stats.metric.tokens": "Total tokens",
                "stats.metric.activeDays": "Active days",
                "stats.metric.peakHour": "Peak hour",
                "stats.metric.favoriteModel": "Favorite model",
                "stats.tier.short": "Short",
                "stats.tier.medium": "Medium",
                "stats.tier.epic": "Epic"
            })
        });

        // A `{ zh, en }` param follows the active language; everything else is
        // used verbatim so numbers, dates and preformatted strings just work.
        const uakStatsLocaleValue = (value) => {
            if (value === null || typeof value !== "object" || Array.isArray(value)) return value;
            if (!("zh" in value) && !("en" in value)) return value;
            return uakIsEnglish() ? (value.en ?? value.zh) : (value.zh ?? value.en);
        };

        function uakStatsT(key, params) {
            if (typeof key !== "string" || key.length === 0) return "";
            const table = uakIsEnglish() ? UAK_STATS_DICTIONARY.en : UAK_STATS_DICTIONARY.zh;
            const template = table[key] ?? UAK_STATS_DICTIONARY.zh[key];
            if (template === undefined) return key;
            if (typeof template !== "string") return template;
            if (params === null || typeof params !== "object") return template;
            return template.replace(/\{([A-Za-z0-9_]+)\}/g, (placeholder, name) => {
                const value = uakStatsLocaleValue(params[name]);
                return value === undefined || value === null ? placeholder : String(value);
            });
        }

        // Range ids are UI state ("month" | "all" | "30d" | "7d") and the
        // dictionary serves two shapes: the short tab label and the full
        // sentence fragment ("November 2026" vs "Last 30 days").
        // The zh sentences keep the raw month ("11 月"), the en ones pad it
        // ("2026-11"); this bilingual param keeps one template valid for both.
        const uakStatsMonthParam = (month) => ({ zh: month, en: String(month).padStart(2, "0") });

        const uakStatsRangeLabel = (range) => uakStatsT(`stats.range.${range}`);

        const uakStatsRangeNarrative = (range, year, month) => uakStatsT(`stats.narrative.${range}`, {
            year,
            month: uakStatsMonthParam(month)
        });

        // `{ period }` needs a different phrase per language, so the param is
        // handed over as a bilingual pair for uakStatsT to resolve.
        const uakStatsPeriodParam = (range) => {
            const period = range === "month" ? "month" : range === "all" ? "all" : range === "30d" ? "30d" : "7d";
            return {
                zh: UAK_STATS_DICTIONARY.zh[`stats.period.${period}`],
                en: UAK_STATS_DICTIONARY.en[`stats.period.${period}`]
            };
        };
