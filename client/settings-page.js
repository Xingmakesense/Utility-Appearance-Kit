        function uakCreateSettingsPage() {
            const h = react.createElement;
            const Slider = ({ label, field, min, max, step = 1, suffix = "", draft, update }) => h("label", { className: "uak-setting-slider" },
                h("span", null, label),
                h("input", { type: "range", min, max, step, value: draft[field], onChange: (event) => update(field, Number(event.target.value)), "aria-label": label }),
                h("output", null, `${draft[field]}${suffix}`));
            const Choice = ({ label, options, value, onChange }) => h("div", { className: "uak-setting-choice" },
                h("span", null, label), h("div", { className: "uak-setting-options", role: "group", "aria-label": label },
                    options.map(([id, text]) => h("button", { key: id, type: "button", className: "uak-chip", "data-active": value === id ? "true" : "false", "aria-pressed": value === id, onClick: () => onChange(id) }, text))));
            return function UakSettingsPage() {
                const [, setRevision] = react.useState(0);
                const [draft, setDraft] = react.useState(uakSettingsStore.getState);
                const [message, setMessage] = react.useState(uakTr("正在读取配置…", "Loading settings…"));
                const [saving, setSaving] = react.useState(false);
                const fileRef = react.useRef(null);
                react.useEffect(() => uakSubscribeUiLocale(setRevision), []);
                react.useEffect(() => { void uakLoadSettings().then((value) => { setDraft(value); setMessage(""); }); }, []);
                const update = (field, value) => setDraft((previous) => ({ ...previous, [field]: value }));
                const chooseFile = async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setSaving(true);
                    try { update("imageUrl", await uakUploadImage(file)); setMessage(uakTr("图片已上传，点击“保存配置”后应用。", 'Image uploaded. Click "Save settings" to apply.')); }
                    catch (error) { setMessage(uakTr("图片上传失败，请检查文件与网络。", "Upload failed. Check the image and your connection.")); console.warn("[utility-appearance-kit] image upload:", error); }
                    finally { setSaving(false); event.target.value = ""; }
                };
                const save = async () => {
                    setSaving(true);
                    try { await uakSaveSettings(draft); setMessage(uakTr("配置已保存并即时生效，无需重启。", "Saved and applied. No restart needed.")); }
                    catch (error) { setMessage(uakTr("保存失败，请稍后重试。", "Could not save settings. Please try again.")); console.warn("[utility-appearance-kit] settings save:", error); }
                    finally { setSaving(false); }
                };
                return h("div", { className: "uak-settings" },
                    h("p", { className: "uak-settings-intro" }, uakTr("壁纸、玻璃与月度阅读统计。原生界面和交互保持不变。", "Wallpaper, glass, and monthly reading statistics. Native controls and interactions stay intact.")),
                    h("section", { className: "uak-settings-section" },
                        h("h2", null, uakTr("图片壁纸", "Image wallpaper")),
                        h("div", { className: "uak-setting-url" },
                            h("input", { type: "url", value: draft.imageUrl, placeholder: uakTr("https://… 或已上传图片地址", "https://… or an uploaded image URL"), "aria-label": uakTr("图片地址", "Image URL"), onChange: (event) => update("imageUrl", event.target.value) }),
                            h("input", { ref: fileRef, hidden: true, type: "file", accept: "image/png,image/jpeg,image/gif,image/webp", onChange: chooseFile }),
                            h("button", { type: "button", className: "uak-chip", onClick: () => fileRef.current?.click() }, uakTr("选择图片", "Choose image")),
                            h("button", { type: "button", className: "uak-chip", onClick: () => update("imageUrl", "") }, uakTr("清除", "Clear"))),
                        h(Choice, { label: uakTr("显示模式", "Display mode"), value: draft.imageMode, onChange: (value) => update("imageMode", value), options: [["cover", uakTr("填充", "Cover")], ["contain", uakTr("适应", "Contain")], ["repeat", uakTr("平铺", "Repeat")]] }),
                        h("div", { className: "uak-setting-sliders" },
                            h(Slider, { label: uakTr("背景模糊", "Background blur"), field: "blur", min: 0, max: 40, suffix: "px", draft, update }),
                            h(Slider, { label: uakTr("界面透明度", "UI opacity"), field: "opacity", min: 0, max: 100, suffix: "%", draft, update }),
                            h(Slider, { label: uakTr("图片缩放", "Image zoom"), field: "scale", min: -100, max: 100, draft, update }),
                            h(Slider, { label: uakTr("亮度", "Brightness"), field: "brightness", min: 50, max: 150, suffix: "%", draft, update }),
                            h(Slider, { label: uakTr("对比度", "Contrast"), field: "contrast", min: 50, max: 150, suffix: "%", draft, update }),
                            h(Slider, { label: uakTr("饱和度", "Saturation"), field: "saturate", min: 0, max: 200, suffix: "%", draft, update }))),
                    h("section", { className: "uak-settings-section" },
                        h("h2", null, uakTr("液态与磨砂玻璃", "Liquid and frosted glass")),
                        h("div", { className: "uak-setting-sliders" },
                            h(Slider, { label: uakTr("磨砂模糊", "Frosted blur"), field: "glassBlur", min: 0, max: 40, suffix: "px", draft, update }),
                            h(Slider, { label: uakTr("卡片不透明度", "Card opacity"), field: "glassOpacity", min: 20, max: 95, suffix: "%", draft, update }),
                            h(Slider, { label: uakTr("弹层不透明度", "Popup opacity"), field: "popupOpacity", min: 40, max: 100, suffix: "%", draft, update }),
                            h(Slider, { label: uakTr("统计面板高度", "Statistics height"), field: "bodyHeight", min: 300, max: 560, step: 4, suffix: "px", draft, update })),
                        h(Choice, { label: uakTr("数字单位", "Number units"), value: draft.units, onChange: (value) => update("units", value), options: [["auto", uakTr("跟随语言", "Follow language")], ["myriad", uakTr("万 / 亿", "10K / 100M")], ["short", "K / M / B"]] })),
                    h("section", { className: "uak-settings-section uak-book-settings" },
                        h("h2", null, uakTr("月度书卷", "Monthly books")),
                        h("p", null, uakTr("短章不足5万字；中构5万至不足30万字；鸿篇30万字及以上。字数为约数。", "Short: under 50K characters. Medium: 50K–300K. Epic: 300K or more. Counts are approximate.")),
                        h(Choice, { label: uakTr("书目选取", "Book selection"), value: draft.bookMode, onChange: (value) => update("bookMode", value), options: [["random", uakTr("随机选书", "Random")], ["selected", uakTr("固定选书", "Selected")]] }),
                        h("div", { className: "uak-book-catalog", role: "listbox", "aria-label": uakTr("选择书目", "Select a book") },
                            uakBookCatalog.map((book) => h("button", { key: book.title, type: "button", role: "option", "aria-selected": draft.bookMode === "selected" && draft.bookTitle === book.title, "data-active": draft.bookTitle === book.title ? "true" : "false", className: "uak-book-option", onClick: () => setDraft((previous) => ({ ...previous, bookMode: "selected", bookTitle: book.title })) },
                                h("strong", null, uakTr(`《${book.title}》`, book.englishTitle)),
                                h("span", null, uakTr(`约${book.chars / 10000}万字 · ${book.tier}`, `≈${uakFormatNumber(book.chars, "short")} chars · ${uakBookTier(book)}`))))),
                        h("button", { type: "button", className: "uak-save", disabled: saving, onClick: save }, saving ? uakTr("保存中…", "Saving…") : uakTr("保存配置", "Save settings")),
                        message ? h("p", { className: "uak-save-message", role: "status" }, message) : null));
            };
        }
        function uakMountSettings(ctx) {
            const page = uakCreateSettingsPage();
            const locale = "utility-appearance-kit/settings";
            if (ctx.locale?.register) ctx.effect(() => ctx.locale.register(locale, { zh: { nav: "外观与月度书卷" }, en: { nav: "Appearance & Monthly Books" } }), locale);
            const navLabel = () => {
                try {
                    if (typeof ctx.locale?.bind === "function") return ctx.locale.bind(locale)("nav");
                } catch { /* local language fallback */ }
                return uakTr("外观与月度书卷", "Appearance & Monthly Books");
            };
            ctx.slots.inject("settings.section", () => ctx.slots.register({
                name: "settings.section", id: "utility-appearance-kit", order: 2,
                label: navLabel, locale,
                children: { "settings.utility-appearance-kit.item": { kind: "list", scope: "root" } }
            }, function UakSettingsSection({ renderSlot }) {
                if (typeof renderSlot !== "function") return null;
                return renderSlot("settings.utility-appearance-kit.item", {});
            }));
            ctx.slots.inject("settings.utility-appearance-kit.item", () => ctx.slots.register({ name: "settings.utility-appearance-kit.item", id: "appearance" }, page));
        }
