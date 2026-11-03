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
            // ctx.locale is declared in `inject`, but a defensive wrapper keeps
            // a locale glitch from ever blocking the appearance mount.
            try {
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
            } catch {
                return () => {};
            }
        }
        const UAK_SETTINGS_PATH = "/utility-appearance-kit/settings";
        const UAK_USAGE_PATH = "/utility-appearance-kit/usage";
        const UAK_DEFAULTS = Object.freeze({
            imageUrl: "", imageMode: "cover", blur: 0, opacity: 0, scale: 0,
            brightness: 100, contrast: 100, saturate: 100,
            glassOpacity: 70, glassBlur: 18,
            popBg: Object.freeze({ alpha: 40, blur: 10, grain: 5 }),
            bodyHeight: 360, bookMode: "random", bookTitle: "活着", units: "auto"
        });
        const uakClamp = (value, min, max, fallback) => {
            const number = Number(value);
            return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
        };
        const uakMediaUrl = (value) => typeof value === "string" && (/^https?:\/\//i.test(value) || /^\/(skin-master|utility-appearance-kit)\/asset\/[\w.-]+$/.test(value)) ? value.slice(0, 2048) : "";
        function uakSanitizeSettings(raw) {
            const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
            const pop = source.popBg && typeof source.popBg === "object" ? source.popBg : {};
            return {
                imageUrl: uakMediaUrl(source.imageUrl),
                imageMode: ["cover", "contain", "repeat"].includes(source.imageMode) ? source.imageMode : "cover",
                blur: uakClamp(source.blur, 0, 40, 0),
                opacity: uakClamp(source.opacity, 0, 100, 0),
                scale: uakClamp(source.scale, -100, 100, 0),
                brightness: uakClamp(source.brightness, 50, 150, 100),
                contrast: uakClamp(source.contrast, 50, 150, 100),
                saturate: uakClamp(source.saturate, 0, 200, 100),
                glassOpacity: uakClamp(source.glassOpacity, 20, 95, 70),
                glassBlur: uakClamp(source.glassBlur, 0, 40, 18),
                popBg: {
                    alpha: uakClamp(pop.alpha, 0, 100, 40),
                    blur: uakClamp(pop.blur, 0, 40, 10),
                    grain: uakClamp(pop.grain, 0, 100, 5)
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
        async function uakUploadImage(file) {
            const name = `${Date.now().toString(36)}-${String(file.name || "wallpaper").replace(/[^A-Za-z0-9._-]/g, "_")}`;
            const response = await fetch("/utility-appearance-kit/asset?name=" + encodeURIComponent(name), { method: "POST", headers: { "content-type": file.type || "application/octet-stream", "x-dsh-uak-settings": "1" }, body: file });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.url) throw new Error(result.message || "图片保存失败");
            return result.url;
        }
        function uakFetchUsage(options = {}) {
            return fetch(UAK_USAGE_PATH + (options.force ? "?refresh=1" : ""), {
                headers: { accept: "application/json", "x-dsh-uak-usage": "1" }
            }).then((response) => {
                if (!response.ok) throw new Error(`统计读取失败 (${response.status})`);
                return response.json();
            });
        }
