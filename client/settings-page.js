        function uakCreateSettingsPage() {
            const h = react.createElement;
            const Slider = ({ label, value, min, max, step = 1, suffix = "", onChange }) => h("label", { className: "uak-setting-slider" },
                h("span", null, label),
                h("input", { type: "range", min, max, step, value, onChange: (event) => onChange(Number(event.target.value)), "aria-label": label }),
                h("output", null, `${value}${suffix}`));
            const Choice = ({ label, options, value, onChange }) => h("div", { className: "uak-setting-choice" },
                h("span", null, label), h("div", { className: "uak-setting-options", role: "group", "aria-label": label },
                    options.map(([id, text]) => h("button", { key: id, type: "button", className: "uak-chip", "data-active": value === id ? "true" : "false", "aria-pressed": value === id, onClick: () => onChange(id) }, text))));
            const UrlInput = ({ label, value, onChange }) => h("label", { className: "uak-setting-field" }, h("span", null, label), h("input", { type: "text", value, placeholder: "https://…", onChange: (event) => onChange(event.target.value) }));
            const Section = ({ title, children }) => h("section", { className: "uak-settings-section" }, h("h2", null, title), children);
            return function UakSettingsPage() {
                const [, setRevision] = react.useState(0);
                const [draft, setDraft] = react.useState(uakSettingsStore.getState);
                const [message, setMessage] = react.useState("");
                const [saving, setSaving] = react.useState(false);
                const imageRef = react.useRef(null);
                react.useEffect(() => uakSubscribeUiLocale(setRevision), []);
                react.useEffect(() => { void uakLoadSettings().then(setDraft).catch(() => setMessage(uakTr("读取失败", "Could not load settings"))); }, []);
                const commit = (next) => {
                    setDraft(next);
                    uakSettingsStore.commit(next);
                    void uakSaveSettings(next).then(() => setMessage(uakTr("已保存并即时生效。", "Saved and applied."))).catch(() => setMessage(uakTr("保存失败，请稍后重试。", "Could not save settings.")));
                };
                const update = (patch) => commit({ ...draft, ...patch });
                const chooseImage = (file) => {
                    if (!file) return;
                    setSaving(true);
                    void uakUploadImage(file).then((url) => {
                        update({ imageUrl: url });
                        setMessage(uakTr("图片已保存并即时生效。", "Image saved and applied."));
                    }).catch(() => setMessage(uakTr("图片上传失败，请检查文件格式。", "Upload failed. Check the image format."))).finally(() => setSaving(false));
                };
                return h("div", { className: "uak-settings" },
                    h("p", { className: "uak-settings-intro" }, uakTr("图片壁纸、磨砂材质与月度书卷。外观设置实时保存。", "Image wallpaper, frosted materials, and monthly books. Appearance changes save live.")),
                    h(Section, { title: uakTr("图片壁纸", "Image wallpaper") },
                        h(UrlInput, { label: uakTr("图片 URL", "Image URL"), value: draft.imageUrl, onChange: (value) => update({ imageUrl: value }) }),
                        h("div", { className: "uak-setting-actions" }, h("input", { ref: imageRef, hidden: true, type: "file", accept: "image/*", onChange: (event) => chooseImage(event.target.files?.[0]) }), h("button", { type: "button", className: "uak-chip", disabled: saving, onClick: () => imageRef.current?.click() }, uakTr("选择图片", "Choose image")), h("button", { type: "button", className: "uak-chip", onClick: () => update({ imageUrl: "" }) }, uakTr("清除背景", "Clear background"))),
                        h(Choice, { label: uakTr("显示模式", "Display mode"), value: draft.imageMode, onChange: (value) => update({ imageMode: value }), options: [["cover", uakTr("填充", "Cover")], ["contain", uakTr("适应", "Contain")], ["repeat", uakTr("平铺", "Repeat")]] })),
                    h(Section, { title: uakTr("效果与滤镜", "Effects and filters") },
                        h("div", { className: "uak-setting-sliders" },
                            h(Slider, { label: uakTr("背景模糊", "Background blur"), value: draft.blur, min: 0, max: 40, suffix: "px", onChange: (value) => update({ blur: value }) }),
                            h(Slider, { label: uakTr("界面透明度", "UI opacity"), value: draft.opacity, min: 0, max: 100, suffix: "%", onChange: (value) => update({ opacity: value }) }),
                            h(Slider, { label: uakTr("图片缩放", "Image zoom"), value: draft.scale, min: -100, max: 100, onChange: (value) => update({ scale: value }) }),
                            h(Slider, { label: uakTr("磨砂模糊", "Frosted blur"), value: draft.glassBlur, min: 0, max: 40, suffix: "px", onChange: (value) => update({ glassBlur: value }) }),
                            h(Slider, { label: uakTr("卡片不透明度", "Card opacity"), value: draft.glassOpacity, min: 20, max: 95, suffix: "%", onChange: (value) => update({ glassOpacity: value }) }),
                            h(Slider, { label: uakTr("亮度", "Brightness"), value: draft.brightness, min: 50, max: 150, suffix: "%", onChange: (value) => update({ brightness: value }) }),
                            h(Slider, { label: uakTr("对比度", "Contrast"), value: draft.contrast, min: 50, max: 150, suffix: "%", onChange: (value) => update({ contrast: value }) }),
                            h(Slider, { label: uakTr("饱和度", "Saturation"), value: draft.saturate, min: 0, max: 200, suffix: "%", onChange: (value) => update({ saturate: value }) })),
                        h("button", { type: "button", className: "uak-chip", onClick: () => update({ brightness: 100, contrast: 100, saturate: 100 }) }, uakTr("滤镜恢复默认", "Reset filters"))),
                    h(Section, { title: uakTr("展开框背景", "Popover background") },
                        h("div", { className: "uak-setting-sliders" },
                            h(Slider, { label: uakTr("不透明度", "Opacity"), value: draft.popBg.alpha, min: 0, max: 100, suffix: "%", onChange: (value) => update({ popBg: { ...draft.popBg, alpha: value } }) }),
                            h(Slider, { label: uakTr("模糊度", "Blur"), value: draft.popBg.blur, min: 0, max: 40, suffix: "px", onChange: (value) => update({ popBg: { ...draft.popBg, blur: value } }) }),
                            h(Slider, { label: uakTr("颗粒度", "Grain"), value: draft.popBg.grain, min: 0, max: 100, suffix: "%", onChange: (value) => update({ popBg: { ...draft.popBg, grain: value } }) })),
                        h("button", { type: "button", className: "uak-chip", onClick: () => update({ popBg: { alpha: 40, blur: 10, grain: 5 } }) }, uakTr("恢复默认", "Reset"))),
                    h(Section, { title: uakTr("月度书卷", "Monthly books") },
                        h("p", null, uakTr("短章不足5万字；中构5万至不足30万字；鸿篇30万字及以上。字数为约数。", "Short: under 50K characters. Medium: 50K–300K. Epic: 300K or more. Counts are approximate.")),
                        h(Choice, { label: uakTr("书目选取", "Book selection"), value: draft.bookMode, onChange: (value) => update({ bookMode: value }), options: [["random", uakTr("随机选书", "Random")], ["selected", uakTr("固定选书", "Selected")]] }),
                        h("div", { className: "uak-book-catalog", role: "listbox", "aria-label": uakTr("选择书目", "Select a book") },
                            uakBookCatalog.map((book) => h("button", { key: book.title, type: "button", role: "option", "aria-selected": draft.bookMode === "selected" && draft.bookTitle === book.title, "data-active": draft.bookTitle === book.title ? "true" : "false", className: "uak-book-option", onClick: () => update({ bookMode: "selected", bookTitle: book.title }) },
                                h("strong", null, uakTr(`《${book.title}》`, book.englishTitle)), h("span", null, uakTr(`约${book.chars / 10000}万字 · ${book.tier}`, `≈${uakFormatNumber(book.chars, "short")} chars · ${uakBookTier(book)}`))))),
                        h("div", { className: "uak-setting-sliders" }, h(Slider, { label: uakTr("统计面板高度", "Statistics height"), value: draft.bodyHeight, min: 300, max: 560, step: 4, suffix: "px", onChange: (value) => update({ bodyHeight: value }) })),
                        h(Choice, { label: uakTr("数字单位", "Number units"), value: draft.units, onChange: (value) => update({ units: value }), options: [["auto", uakTr("跟随语言", "Follow language")], ["myriad", "万 / 亿"], ["short", "K / M / B"]] })),
                    h("button", { type: "button", className: "uak-save", disabled: saving, onClick: () => commit(uakDefaultSettings()) }, uakTr("恢复全部默认", "Reset all settings")),
                    h("p", { className: "uak-save-message", role: "status" }, message));
            };
        }
        function uakMountSettings(ctx) {
            const page = uakCreateSettingsPage();
            const locale = "utility-appearance-kit/settings";
            const navLabel = () => uakTr("外观与月度书卷", "Appearance & Monthly Books");
            ctx.slots.inject("settings.section", () => ctx.slots.register({
                name: "settings.section", id: "utility-appearance-kit", order: 2,
                label: navLabel, locale,
                children: { "settings.utility-appearance-kit.item": { kind: "list", scope: "root" } }
            }, function UakSettingsSection({ renderSlot }) {
                if (typeof renderSlot !== "function") return null;
                return renderSlot("settings.utility-appearance-kit.item", {});
            }));
            ctx.slots.inject("settings.utility-appearance-kit.item", () => ctx.slots.register({
                name: "settings.utility-appearance-kit.item", id: "appearance"
            }, page));
            if (typeof ctx.locale?.register === "function" && typeof ctx.effect === "function") {
                try {
                    ctx.effect(() => ctx.locale.register(locale, {
                        zh: { nav: "外观与月度书卷" },
                        en: { nav: "Appearance & Monthly Books" }
                    }), "utility-appearance-kit: settings dictionary");
                } catch (error) {
                    console.warn("[utility-appearance-kit] settings dictionary unavailable; section stays accessible", error);
                }
            }
        }
