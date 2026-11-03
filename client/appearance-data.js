        const UAK_SETTINGS_KEY = "utility-appearance-kit/settings";
        const uakIsEnglish = () => !String(document.documentElement.lang || navigator.language || "zh").toLowerCase().startsWith("zh");
        const uakTr = (zh, en) => uakIsEnglish() ? en : zh;
        let uakUiRevision = 0;
        const uakUiLocaleListeners = new Set();
        function uakSubscribeUiLocale(listener) {
            uakUiLocaleListeners.add(listener);
            return () => uakUiLocaleListeners.delete(listener);
        }
        function uakMountUiLocale(ctx) {
            let previous = uakIsEnglish();
            const check = () => {
                const next = uakIsEnglish();
                if (next === previous) return;
                previous = next;
                uakUiRevision += 1;
                for (const listener of [...uakUiLocaleListeners]) listener(uakUiRevision);
            };
            const unsubscribe = typeof ctx?.locale?.subscribe === "function" ? ctx.locale.subscribe(check) : null;
            const observer = new MutationObserver(check);
            observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
            return () => { observer.disconnect(); unsubscribe?.(); uakUiLocaleListeners.clear(); };
        }
        const UAK_SETTINGS_PATH = "/utility-appearance-kit/settings";
        const UAK_USAGE_PATH = "/utility-appearance-kit/usage";
        // Reference: SKIN_DEFAULTS. Nested defaults are cloned before use.
        const UAK_DEFAULTS = Object.freeze({
            imageUrl: "", videoUrl: "", imageMode: "cover", blur: 0, opacity: 0, scale: 0,
            brightness: 100, contrast: 100, saturate: 100,
            videoMuted: true, videoVolume: 50,
            glassOpacity: 70, glassBlur: 18,
            popBg: Object.freeze({ alpha: 40, blur: 10, grain: 5 }),
            inputBg: Object.freeze({ enabled: false, imageUrl: "", mode: "fill", transition: 55, posX: 50, posY: 50, blur: 0, opacity: 100, inputOpacity: 100, scale: 0 }),
            inputBox: Object.freeze({ bgColor: "", textColor: "", opacity: 100, blur: 0 }),
            chatColor: "",
            chatFont: Object.freeze({ aiBold: false, userBold: false, aiShadow: false, userShadow: false, weight: 700, shadowColor: "#000000", shadowStrength: 100, shadowBlur: 3, shadowX: 0, shadowY: 1 }),
            bodyHeight: 360, bookMode: "random", bookTitle: "活着", units: "auto"
        });
        const uakClamp = (value, min, max, fallback) => {
            const number = Number(value);
            return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
        };
        const uakBool = (value, fallback) => typeof value === "boolean" ? value : fallback;
        const uakColor = (value) => typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : "";
        const uakMediaUrl = (value) => typeof value === "string" && (/^https?:\/\//i.test(value) || /^\/(skin-master|utility-appearance-kit)\/asset\/[\w.-]+$/.test(value)) ? value.slice(0, 2048) : "";
        function uakSanitizeSettings(raw) {
            const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
            const pop = source.popBg && typeof source.popBg === "object" ? source.popBg : {};
            const input = source.inputBg && typeof source.inputBg === "object" ? source.inputBg : {};
            const box = source.inputBox && typeof source.inputBox === "object" ? source.inputBox : {};
            const font = source.chatFont && typeof source.chatFont === "object" ? source.chatFont : {};
            return {
                imageUrl: uakMediaUrl(source.imageUrl),
                videoUrl: uakMediaUrl(source.videoUrl),
                imageMode: ["cover", "contain", "repeat"].includes(source.imageMode) ? source.imageMode : "cover",
                blur: uakClamp(source.blur, 0, 40, 0),
                opacity: uakClamp(source.opacity, 0, 100, 0),
                scale: uakClamp(source.scale, -100, 100, 0),
                brightness: uakClamp(source.brightness, 50, 150, 100),
                contrast: uakClamp(source.contrast, 50, 150, 100),
                saturate: uakClamp(source.saturate, 0, 200, 100),
                videoMuted: uakBool(source.videoMuted, true),
                videoVolume: uakClamp(source.videoVolume, 0, 100, 50),
                glassOpacity: uakClamp(source.glassOpacity, 20, 95, 70),
                glassBlur: uakClamp(source.glassBlur, 0, 40, 18),
                popBg: {
                    alpha: uakClamp(pop.alpha, 0, 100, 40),
                    blur: uakClamp(pop.blur, 0, 40, 10),
                    grain: uakClamp(pop.grain, 0, 100, 5)
                },
                inputBg: {
                    enabled: uakBool(input.enabled, false), imageUrl: uakMediaUrl(input.imageUrl),
                    mode: ["fill", "fit", "stretch", "repeat", "center", "cross"].includes(input.mode) ? input.mode : "fill",
                    transition: uakClamp(input.transition, 10, 90, 55), posX: uakClamp(input.posX, 0, 100, 50), posY: uakClamp(input.posY, 0, 100, 50),
                    blur: uakClamp(input.blur, 0, 40, 0), opacity: uakClamp(input.opacity, 0, 100, 100), inputOpacity: uakClamp(input.inputOpacity, 0, 100, 100), scale: uakClamp(input.scale, -100, 100, 0)
                },
                inputBox: { bgColor: uakColor(box.bgColor), textColor: uakColor(box.textColor), opacity: uakClamp(box.opacity, 0, 100, 100), blur: uakClamp(box.blur, 0, 40, 0) },
                chatColor: uakColor(source.chatColor),
                chatFont: {
                    aiBold: uakBool(font.aiBold, false), userBold: uakBool(font.userBold, false), aiShadow: uakBool(font.aiShadow, false), userShadow: uakBool(font.userShadow, false),
                    weight: uakClamp(font.weight, 400, 900, 700), shadowColor: uakColor(font.shadowColor) || "#000000", shadowStrength: uakClamp(font.shadowStrength, 0, 100, 100),
                    shadowBlur: uakClamp(font.shadowBlur, 0, 20, 3), shadowX: uakClamp(font.shadowX, -10, 10, 0), shadowY: uakClamp(font.shadowY, -10, 10, 1)
                },
                bodyHeight: Math.round(uakClamp(source.bodyHeight, 300, 560, 360) / 4) * 4,
                bookMode: source.bookMode === "selected" ? "selected" : "random",
                bookTitle: typeof source.bookTitle === "string" ? source.bookTitle : "活着",
                units: ["auto", "short", "myriad"].includes(source.units) ? source.units : "auto"
            };
        }
        function uakDefaultSettings() { return uakSanitizeSettings(UAK_DEFAULTS); }
        let uakSettingsState = uakDefaultSettings();
        const uakSettingsListeners = new Set();
        let uakSettingsReady;
        let uakSaveSequence = Promise.resolve();
        const uakSettingsStore = {
            getState: () => uakSettingsState,
            subscribe(listener) {
                uakSettingsListeners.add(listener);
                return () => uakSettingsListeners.delete(listener);
            },
            commit(next) {
                const sanitized = uakSanitizeSettings(next);
                if (JSON.stringify(sanitized) === JSON.stringify(uakSettingsState)) return uakSettingsState;
                uakSettingsState = sanitized;
                try { localStorage.setItem(UAK_SETTINGS_KEY, JSON.stringify(uakSettingsState)); } catch { /* server remains authoritative */ }
                for (const listener of [...uakSettingsListeners]) {
                    try { listener(uakSettingsState); } catch { /* one view must not break another */ }
                }
                return uakSettingsState;
            }
        };
        function uakLoadSettings() {
            if (uakSettingsReady) return uakSettingsReady;
            uakSettingsReady = (async () => {
                let saved = null;
                try { saved = JSON.parse(localStorage.getItem(UAK_SETTINGS_KEY) || "null"); } catch { /* ignore malformed local state */ }
                if (saved && typeof saved === "object") uakSettingsStore.commit(saved);
                else {
                    try {
                        const response = await fetch("/skin-master/settings", { headers: { accept: "application/json" } });
                        if (!response.ok) throw new Error("legacy settings unavailable");
                        const legacy = (await response.json())?.value;
                        if (legacy && typeof legacy === "object") {
                            uakSettingsStore.commit({
                                imageUrl: legacy.imageUrl, imageMode: legacy.imageMode,
                                blur: legacy.blur, opacity: legacy.opacity, scale: legacy.scale,
                                brightness: legacy.brightness, contrast: legacy.contrast, saturate: legacy.saturate
                            });
                        }
                    } catch { /* defaults are a complete configuration */ }
                }
                try {
                    const response = await fetch(UAK_SETTINGS_PATH, { headers: { accept: "application/json", "x-dsh-uak-settings": "1" } });
                    const data = await response.json();
                    if (response.ok && data?.value) uakSettingsStore.commit(data.value);
                } catch { /* local fallback */ }
                return uakSettingsState;
            })();
            return uakSettingsReady;
        }
        async function uakSaveSettings(value) {
            const next = uakSanitizeSettings(value);
            uakSettingsStore.commit(next);
            uakSaveSequence = uakSaveSequence.catch(() => {}).then(async () => {
                const response = await fetch(UAK_SETTINGS_PATH, {
                    method: "POST", headers: { "content-type": "application/json", accept: "application/json", "x-dsh-uak-settings": "1" },
                    body: JSON.stringify(next)
                });
                const result = await response.json().catch(() => ({}));
                if (!response.ok || result.ok !== true) throw new Error(result.message || "配置保存失败");
            });
            return uakSaveSequence;
        }
        async function uakUploadMedia(file) {
            const name = `${Date.now().toString(36)}-${String(file.name || "wallpaper").replace(/[^A-Za-z0-9._-]/g, "_")}`;
            const response = await fetch("/utility-appearance-kit/asset?name=" + encodeURIComponent(name), { method: "POST", headers: { "content-type": file.type || "application/octet-stream", "x-dsh-uak-settings": "1" }, body: file });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.url) throw new Error(result.message || "媒体保存失败");
            return result.url;
        }
        async function uakUploadImage(file) { return uakUploadMedia(file); }
        function uakFetchUsage(options = {}) {
            return fetch(UAK_USAGE_PATH + (options.force ? "?refresh=1" : ""), {
                headers: { accept: "application/json", "x-dsh-uak-usage": "1" }
            }).then((response) => {
                if (!response.ok) throw new Error(`统计读取失败 (${response.status})`);
                return response.json();
            });
        }
