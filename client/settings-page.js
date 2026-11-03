        // Reference: SkinPanel. Controls commit to UAK's store and Host route.
        function uakCreateSettingsPage() {
            const h = react.createElement;
            const Slider = ({ label, value, min, max, step = 1, suffix = "", onChange }) => h("label", { className: "uak-setting-slider" },
                h("span", null, label),
                h("input", { type: "range", min, max, step, value, onChange: (event) => onChange(Number(event.target.value)), "aria-label": label }),
                h("output", null, `${value}${suffix}`));
            const Choice = ({ label, options, value, onChange }) => h("div", { className: "uak-setting-choice" },
                h("span", null, label), h("div", { className: "uak-setting-options", role: "group", "aria-label": label },
                    options.map(([id, text]) => h("button", { key: id, type: "button", className: "uak-chip", "data-active": value === id ? "true" : "false", "aria-pressed": value === id, onClick: () => onChange(id) }, text))));
            const Toggle = ({ label, checked, onChange }) => h("label", { className: "uak-setting-toggle" }, h("span", null, label), h("input", { type: "checkbox", checked, onChange: (event) => onChange(event.target.checked) }));
            const Color = ({ label, value, fallback = "#000000", onChange, reset }) => h("div", { className: "uak-setting-color" },
                h("span", null, label), h("input", { type: "color", value: value || fallback, onChange: (event) => onChange(event.target.value), "aria-label": label }),
                h("code", null, value || uakTr("默认", "Default")), reset ? h("button", { type: "button", className: "uak-chip", onClick: reset }, uakTr("恢复默认", "Reset")) : null);
            const UrlInput = ({ label, value, onChange }) => h("label", { className: "uak-setting-field" }, h("span", null, label), h("input", { type: "text", value, placeholder: "https://…", onChange: (event) => onChange(event.target.value) }));
            const Section = ({ title, children }) => h("section", { className: "uak-settings-section" }, h("h2", null, title), children);
            return function UakSettingsPage() {
                const [, setRevision] = react.useState(0);
                const [draft, setDraft] = react.useState(uakSettingsStore.getState);
                const [message, setMessage] = react.useState("");
                const [saving, setSaving] = react.useState(false);
                const [dragPreview, setDragPreview] = react.useState(null);
                const previewRef = react.useRef(null);
                const imageRef = react.useRef(null);
                const videoRef = react.useRef(null);
                const inputImageRef = react.useRef(null);
                react.useEffect(() => uakSubscribeUiLocale(setRevision), []);
                react.useEffect(() => { void uakLoadSettings().then(setDraft).catch(() => setMessage(uakTr("读取失败", "Could not load settings"))); }, []);
                const commit = (next) => {
                    setDraft(next);
                    uakSettingsStore.commit(next);
                    void uakSaveSettings(next).then(() => setMessage(uakTr("已保存并即时生效。", "Saved and applied."))).catch(() => setMessage(uakTr("保存失败，请稍后重试。", "Could not save settings.")));
                };
                const update = (patch) => commit({ ...draft, ...patch });
                const updateNested = (key, patch) => update({ [key]: { ...draft[key], ...patch } });
                const chooseMedia = (file, target) => {
                    if (!file) return;
                    setSaving(true);
                    void uakUploadMedia(file).then((url) => {
                        if (target === "inputBg") updateNested("inputBg", { imageUrl: url });
                        else if (target === "video") update({ videoUrl: url, imageUrl: "" });
                        else update({ imageUrl: url, videoUrl: "" });
                        setMessage(uakTr("本地文件已保存并即时生效。", "Local file saved and applied."));
                    }).catch(() => setMessage(uakTr("媒体上传失败，请检查文件格式。", "Upload failed. Check the media format."))).finally(() => setSaving(false));
                };
                const previewSize = () => {
                    const ib = draft.inputBg;
                    const width = 100 + Math.min(Math.max(Number(ib.scale) || 0, -100), 100);
                    return ib.mode === "stretch" ? `${width}% ${width}%` : ib.mode === "fit" ? "contain" : `${width}% auto`;
                };
                const previewMask = () => {
                    const ib = draft.inputBg;
                    if (ib.mode === "cross") return "none";
                    const mid = Math.min(Math.max(Number(ib.transition) || 55, 10), 90);
                    return `linear-gradient(to right, transparent 0%, transparent ${Math.max(mid - 12, 0)}%, #000 ${Math.min(mid + 22, 100)}%, #000 100%)`;
                };
                // Reference: dragPreview handlers from SkinPanel.
                react.useEffect(() => {
                    if (!dragPreview) return undefined;
                    const move = (event) => {
                        const { startX, startY, baseX, baseY, rect } = dragPreview;
                        updateNested("inputBg", { posX: Math.round(Math.min(Math.max(baseX + (event.clientX - startX) / rect.width * 100, 0), 100)), posY: Math.round(Math.min(Math.max(baseY + (event.clientY - startY) / rect.height * 100, 0), 100)) });
                    };
                    const up = () => setDragPreview(null);
                    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
                    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
                }, [dragPreview, draft.inputBg]);
                // Reference: chatFontPreviewStyle.
                const fontPreviewStyle = () => {
                    const font = draft.chatFont;
                    const color = uakHexToRgba(font.shadowColor, font.shadowStrength / 100) || font.shadowColor;
                    return {
                        fontWeight: font.aiBold || font.userBold ? String(font.weight) : "400",
                        textShadow: font.aiShadow || font.userShadow ? `${font.shadowX}px ${font.shadowY}px ${font.shadowBlur}px ${color}` : "none"
                    };
                };
                return h("div", { className: "uak-settings" },
                    h("p", { className: "uak-settings-intro" }, uakTr("壁纸、材质、输入框、消息与月度书卷。所有外观设置实时保存。", "Wallpaper, materials, composer, messages, and monthly books. Appearance changes save live.")),
                    h(Section, { title: uakTr("背景图片", "Background image") },
                        h(UrlInput, { label: uakTr("图片 URL", "Image URL"), value: draft.imageUrl, onChange: (value) => update({ imageUrl: value, videoUrl: "" }) }),
                        h("div", { className: "uak-setting-actions" }, h("input", { ref: imageRef, hidden: true, type: "file", accept: "image/*", onChange: (event) => chooseMedia(event.target.files?.[0], "image") }), h("button", { type: "button", className: "uak-chip", disabled: saving, onClick: () => imageRef.current?.click() }, uakTr("选择图片", "Choose image")), h("button", { type: "button", className: "uak-chip", onClick: () => update({ imageUrl: "", videoUrl: "" }) }, uakTr("清除背景", "Clear background"))),
                        h(Choice, { label: uakTr("显示模式", "Display mode"), value: draft.imageMode, onChange: (value) => update({ imageMode: value }), options: [["cover", uakTr("填充", "Cover")], ["contain", uakTr("适应", "Contain")], ["repeat", uakTr("平铺", "Repeat")]] })),
                    h(Section, { title: uakTr("背景视频", "Background video") },
                        h(UrlInput, { label: uakTr("视频 URL", "Video URL"), value: draft.videoUrl, onChange: (value) => update({ videoUrl: value, imageUrl: "" }) }),
                        h("div", { className: "uak-setting-actions" }, h("input", { ref: videoRef, hidden: true, type: "file", accept: "video/*", onChange: (event) => chooseMedia(event.target.files?.[0], "video") }), h("button", { type: "button", className: "uak-chip", disabled: saving, onClick: () => videoRef.current?.click() }, uakTr("选择视频", "Choose video"))),
                        h("div", { className: "uak-setting-sliders" }, h(Slider, { label: uakTr("音量", "Volume"), value: draft.videoVolume, min: 0, max: 100, suffix: "%", onChange: (value) => update({ videoVolume: value }) })),
                        h(Toggle, { label: uakTr("静音", "Muted"), checked: draft.videoMuted, onChange: (value) => update({ videoMuted: value }) })),
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
                    h(Section, { title: uakTr("输入框背景", "Input background") },
                        h(Toggle, { label: uakTr("启用输入框背景", "Enable input background"), checked: draft.inputBg.enabled, onChange: (value) => updateNested("inputBg", { enabled: value }) }),
                        h(UrlInput, { label: uakTr("图片 URL", "Image URL"), value: draft.inputBg.imageUrl, onChange: (value) => updateNested("inputBg", { imageUrl: value }) }),
                        h("div", { className: "uak-setting-actions" }, h("input", { ref: inputImageRef, hidden: true, type: "file", accept: "image/*", onChange: (event) => chooseMedia(event.target.files?.[0], "inputBg") }), h("button", { type: "button", className: "uak-chip", onClick: () => inputImageRef.current?.click() }, uakTr("选择图片", "Choose image")), h("button", { type: "button", className: "uak-chip", onClick: () => updateNested("inputBg", { imageUrl: "" }) }, uakTr("清除", "Clear"))),
                        h(Choice, { label: uakTr("图片模式", "Image mode"), value: draft.inputBg.mode, onChange: (value) => updateNested("inputBg", { mode: value }), options: [["fill", uakTr("填充", "Fill")], ["fit", uakTr("适应", "Fit")], ["stretch", uakTr("拉伸", "Stretch")], ["repeat", uakTr("平铺", "Tile")], ["center", uakTr("居中", "Center")], ["cross", uakTr("跨区", "Span")]] }),
                        h("div", { ref: previewRef, className: "uak-bg-preview", title: uakTr("拖动调整图片位置", "Drag to move the image"), onMouseDown: (event) => { event.preventDefault(); const rect = previewRef.current?.getBoundingClientRect(); if (rect) setDragPreview({ startX: event.clientX, startY: event.clientY, baseX: draft.inputBg.posX, baseY: draft.inputBg.posY, rect }); } }, h("div", { className: "uak-bg-preview-image", style: { backgroundImage: draft.inputBg.imageUrl ? `url("${uakCssUrlEscape(draft.inputBg.imageUrl)}")` : "none", backgroundSize: previewSize(), backgroundRepeat: draft.inputBg.mode === "repeat" ? "repeat" : "no-repeat", backgroundPosition: draft.inputBg.mode === "center" ? "center" : `${draft.inputBg.posX}% ${draft.inputBg.posY}%`, maskImage: previewMask(), WebkitMaskImage: previewMask() } })),
                        h("div", { className: "uak-setting-sliders" },
                            h(Slider, { label: uakTr("过渡位置", "Transition"), value: draft.inputBg.transition, min: 10, max: 90, suffix: "%", onChange: (value) => updateNested("inputBg", { transition: value }) }),
                            h(Slider, { label: uakTr("图片左右位置", "Image X position"), value: draft.inputBg.posX, min: 0, max: 100, suffix: "%", onChange: (value) => updateNested("inputBg", { posX: value }) }),
                            h(Slider, { label: uakTr("图片上下位置", "Image Y position"), value: draft.inputBg.posY, min: 0, max: 100, suffix: "%", onChange: (value) => updateNested("inputBg", { posY: value }) }),
                            h(Slider, { label: uakTr("图片模糊", "Image blur"), value: draft.inputBg.blur, min: 0, max: 40, suffix: "px", onChange: (value) => updateNested("inputBg", { blur: value }) }),
                            h(Slider, { label: uakTr("图片透明", "Image opacity"), value: draft.inputBg.opacity, min: 0, max: 100, suffix: "%", onChange: (value) => updateNested("inputBg", { opacity: value }) }),
                            h(Slider, { label: uakTr("图片缩放", "Image zoom"), value: draft.inputBg.scale, min: -100, max: 100, onChange: (value) => updateNested("inputBg", { scale: value }) }),
                            h(Slider, { label: uakTr("输入框透明", "Input transparency"), value: draft.inputBg.inputOpacity, min: 0, max: 100, suffix: "%", onChange: (value) => updateNested("inputBg", { inputOpacity: value }) }))),
                    h(Section, { title: uakTr("展开框背景", "Popover background") },
                        h("div", { className: "uak-setting-sliders" }, h(Slider, { label: uakTr("不透明度", "Opacity"), value: draft.popBg.alpha, min: 0, max: 100, suffix: "%", onChange: (value) => updateNested("popBg", { alpha: value }) }), h(Slider, { label: uakTr("模糊度", "Blur"), value: draft.popBg.blur, min: 0, max: 40, suffix: "px", onChange: (value) => updateNested("popBg", { blur: value }) }), h(Slider, { label: uakTr("颗粒度", "Grain"), value: draft.popBg.grain, min: 0, max: 100, suffix: "%", onChange: (value) => updateNested("popBg", { grain: value }) })),
                        h("button", { type: "button", className: "uak-chip", onClick: () => update({ popBg: { alpha: 40, blur: 10, grain: 5 } }) }, uakTr("恢复默认", "Reset"))),
                    h(Section, { title: uakTr("我发送的消息", "My messages") },
                        h(Color, { label: uakTr("气泡颜色", "Bubble color"), value: draft.inputBox.bgColor, fallback: "#f9fafb", onChange: (value) => updateNested("inputBox", { bgColor: value }), reset: () => updateNested("inputBox", { bgColor: "" }) }),
                        h(Color, { label: uakTr("文字颜色", "Text color"), value: draft.inputBox.textColor, fallback: "#1c1c1e", onChange: (value) => updateNested("inputBox", { textColor: value }), reset: () => updateNested("inputBox", { textColor: "" }) }),
                        h("div", { className: "uak-setting-sliders" }, h(Slider, { label: uakTr("不透明度", "Opacity"), value: draft.inputBox.opacity, min: 0, max: 100, suffix: "%", onChange: (value) => updateNested("inputBox", { opacity: value }) }), h(Slider, { label: uakTr("模糊度", "Blur"), value: draft.inputBox.blur, min: 0, max: 40, suffix: "px", onChange: (value) => updateNested("inputBox", { blur: value }) })),
                        h("button", { type: "button", className: "uak-chip", onClick: () => update({ inputBox: { bgColor: "", textColor: "", opacity: 100, blur: 0 } }) }, uakTr("恢复默认", "Reset"))),
                    h(Section, { title: uakTr("AI 回复文本", "AI reply text") }, h(Color, { label: uakTr("颜色", "Color"), value: draft.chatColor, fallback: "#f9fafb", onChange: (value) => update({ chatColor: value }), reset: () => update({ chatColor: "" }) })),
                    h(Section, { title: uakTr("对话字体", "Chat typography") },
                        h(Toggle, { label: uakTr("AI 回复加粗", "Bold AI replies"), checked: draft.chatFont.aiBold, onChange: (value) => updateNested("chatFont", { aiBold: value }) }),
                        h(Toggle, { label: uakTr("我的消息加粗", "Bold my messages"), checked: draft.chatFont.userBold, onChange: (value) => updateNested("chatFont", { userBold: value }) }),
                        h(Toggle, { label: uakTr("AI 回复阴影", "AI reply shadow"), checked: draft.chatFont.aiShadow, onChange: (value) => updateNested("chatFont", { aiShadow: value }) }),
                        h(Toggle, { label: uakTr("我的消息阴影", "My message shadow"), checked: draft.chatFont.userShadow, onChange: (value) => updateNested("chatFont", { userShadow: value }) }),
                        h("p", { className: "uak-font-preview", style: fontPreviewStyle() }, uakTr("预览：对话字体 AaBb 123", "Preview: chat typography AaBb 123")),
                        h(Color, { label: uakTr("阴影颜色", "Shadow color"), value: draft.chatFont.shadowColor, onChange: (value) => updateNested("chatFont", { shadowColor: value }) }),
                        h("div", { className: "uak-setting-sliders" },
                            h(Slider, { label: uakTr("加粗字重", "Bold weight"), value: draft.chatFont.weight, min: 400, max: 900, step: 100, onChange: (value) => updateNested("chatFont", { weight: value }) }),
                            h(Slider, { label: uakTr("阴影深浅", "Shadow strength"), value: draft.chatFont.shadowStrength, min: 0, max: 100, suffix: "%", onChange: (value) => updateNested("chatFont", { shadowStrength: value }) }),
                            h(Slider, { label: uakTr("阴影模糊", "Shadow blur"), value: draft.chatFont.shadowBlur, min: 0, max: 20, suffix: "px", onChange: (value) => updateNested("chatFont", { shadowBlur: value }) }),
                            h(Slider, { label: uakTr("阴影左右偏移", "Shadow X offset"), value: draft.chatFont.shadowX, min: -10, max: 10, suffix: "px", onChange: (value) => updateNested("chatFont", { shadowX: value }) }),
                            h(Slider, { label: uakTr("阴影上下偏移", "Shadow Y offset"), value: draft.chatFont.shadowY, min: -10, max: 10, suffix: "px", onChange: (value) => updateNested("chatFont", { shadowY: value }) }))),
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
