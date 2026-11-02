        // Book catalog for the monthly statistics panel. Pure data plus the
        // catalog lookup/comparison helpers, so statistics.js keeps only the
        // usage math. This file shares the client factory scope (no
        // import/export); every identifier keeps the unique uak prefix.
        const uakBooks = Object.freeze([
            { title: "红楼梦", englishTitle: "Dream of the Red Chamber", chars: 730000 },
            { title: "三国演义", englishTitle: "Romance of the Three Kingdoms", chars: 630000 },
            { title: "围城", englishTitle: "Fortress Besieged", chars: 230000 },
            { title: "活着", englishTitle: "To Live", chars: 120000 },
            { title: "骆驼祥子", englishTitle: "Rickshaw Boy", chars: 100000 },
            { title: "我的大学", englishTitle: "My Universities", chars: 150000 },
            { title: "平凡的世界", englishTitle: "Ordinary World", chars: 1000000 },
            { title: "白鹿原", englishTitle: "White Deer Plain", chars: 500000 },
            { title: "一句顶一万句", englishTitle: "Someone to Talk To", chars: 300000 },
            { title: "穷人", englishTitle: "Poor Folk", chars: 150000 },
            { title: "悲惨世界", englishTitle: "Les Misérables", chars: 900000 },
            { title: "鼠疫", englishTitle: "The Plague", chars: 200000 },
            { title: "理想国", englishTitle: "The Republic", chars: 300000 },
            { title: "许三观卖血记", englishTitle: "Chronicle of a Blood Merchant", chars: 120000 },
            { title: "局外人", englishTitle: "The Outsider", chars: 60000 },
            { title: "老人与海", englishTitle: "The Old Man and the Sea", chars: 40000 },
            { title: "变形记", englishTitle: "The Metamorphosis", chars: 30000 },
            { title: "谈谈方法", englishTitle: "Discourse on the Method", chars: 50000 },
            { title: "西西弗神话", englishTitle: "The Myth of Sisyphus", chars: 80000 },
            { title: "乌合之众", englishTitle: "The Crowd", chars: 180000 }
        ].map((book) => Object.freeze({
            ...book,
            tier: book.chars < 50000 ? "短章" : book.chars < 300000 ? "中构" : "鸿篇"
        })));
        const uakBookCatalog = uakBooks;

        // Tier labels stay Chinese in the data (settings-page.js compares the
        // raw value); only the rendered label is localized here.
        const uakBookTier = (book) => uakStatsT(
            book?.tier === "短章" ? "stats.tier.short"
                : book?.tier === "中构" ? "stats.tier.medium" : "stats.tier.epic"
        );

        function uakBookByTitle(title) {
            if (typeof title !== "string") return undefined;
            const normalized = title.trim().replace(/^《|》$/g, "");
            return uakBooks.find((book) => book.title === normalized || book.englishTitle === normalized);
        }

        function uakBookStats(book, tokens) {
            const selected = typeof book === "string" ? uakBookByTitle(book) : book;
            if (selected === undefined || selected === null) return null;
            const safeTokens = uakFiniteCount(tokens);
            return {
                ...selected,
                tokens: safeTokens,
                equivalent: safeTokens / selected.chars,
                percent: safeTokens / selected.chars * 100
            };
        }
