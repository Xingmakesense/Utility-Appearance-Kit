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
        // The statistics card (and the heat band inside it) has one fixed
        // height. It used to be a 300-560 px slider; the default 360 px is now
        // the only value, so every host renders the same budget.
        const UAK_STATS_HEIGHT = 360;
        const UAK_DEFAULTS = Object.freeze({
            imageUrl: "", imageMode: "cover", opacity: 0,
            brightness: 100,
            glassOpacity: 70, glassBlur: 18,
            popBg: Object.freeze({ alpha: 40, blur: 10 }),
            bookMode: "random", bookTitle: "活着", units: "auto"
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
                opacity: uakClamp(source.opacity, 0, 100, 0),
                brightness: uakClamp(source.brightness, 50, 150, 100),
                glassOpacity: uakClamp(source.glassOpacity, 20, 95, 70),
                glassBlur: uakClamp(source.glassBlur, 0, 40, 18),
                popBg: {
                    alpha: uakClamp(pop.alpha, 0, 100, 40),
                    blur: uakClamp(pop.blur, 0, 40, 10)
                },
                bookMode: source.bookMode === "selected" ? "selected" : "random",
                bookTitle: typeof source.bookTitle === "string" ? source.bookTitle : "活着",
                units: ["auto", "short", "myriad"].includes(source.units) ? source.units : "auto"
            };
        }
        function uakDefaultSettings() { return uakSanitizeSettings(UAK_DEFAULTS); }
        let uakSettingsState = uakDefaultSettings();
        const uakSettingsListeners = new Set();
        let uakSettingsReady;
        // Every local edit bumps this revision. An in-flight host read or save
        // response only lands when no newer local edit happened meanwhile, so a
        // slow boot fetch can never roll back a setting the user just changed.
        let uakLocalRevision = 0;
        let uakPendingSaves = 0;
        let uakSaveSequence = Promise.resolve();
        function uakNotifySettings() {
            for (const listener of [...uakSettingsListeners]) {
                try { listener(uakSettingsState); } catch { /* one view must not break another */ }
            }
        }
        function uakCommitSettings(next, options = {}) {
            if (options.expectedLocalRevision !== undefined && options.expectedLocalRevision !== uakLocalRevision) {
                return uakSettingsState;
            }
            if (options.remote === true && uakPendingSaves > 0) return uakSettingsState;
            const sanitized = uakSanitizeSettings(next);
            if (JSON.stringify(sanitized) === JSON.stringify(uakSettingsState)) return uakSettingsState;
            uakSettingsState = sanitized;
            if (options.remote !== true) uakLocalRevision += 1;
            try { localStorage.setItem(UAK_SETTINGS_KEY, JSON.stringify(uakSettingsState)); } catch { /* server remains authoritative */ }
            uakNotifySettings();
            return uakSettingsState;
        }
        const uakSettingsStore = {
            getState: () => uakSettingsState,
            subscribe(listener) {
                uakSettingsListeners.add(listener);
                return () => uakSettingsListeners.delete(listener);
            },
            commit(next) { return uakCommitSettings(next); },
            /** Apply a server snapshot only when no local edit raced it. */
            applyRemote(next, expectedLocalRevision) {
                return uakCommitSettings(next, { remote: true, expectedLocalRevision });
            }
        };
        async function uakHostSettings() {
            const response = await fetch(UAK_SETTINGS_PATH, {
                headers: { accept: "application/json", "x-dsh-uak-settings": "1" },
                cache: "no-store"
            });
            const data = await response.json().catch(() => null);
            return response.ok && data?.value ? data.value : null;
        }
        function uakLoadSettings() {
            if (uakSettingsReady) return uakSettingsReady.then(() => uakSettingsState);
            uakSettingsReady = (async () => {
                let saved = null;
                try { saved = JSON.parse(localStorage.getItem(UAK_SETTINGS_KEY) || "null"); } catch { /* ignore malformed local state */ }
                if (saved && typeof saved === "object") {
                    uakSettingsStore.applyRemote(saved);
                } else {
                    // One-time migration from the original skin-master keys.
                    try {
                        const response = await fetch("/skin-master/settings", { headers: { accept: "application/json" } });
                        if (!response.ok) throw new Error("legacy settings unavailable");
                        const legacy = (await response.json())?.value;
                        if (legacy && typeof legacy === "object") {
                            uakSettingsStore.applyRemote({
                                imageUrl: legacy.imageUrl, imageMode: legacy.imageMode,
                                blur: legacy.blur, opacity: legacy.opacity, scale: legacy.scale,
                                brightness: legacy.brightness, contrast: legacy.contrast, saturate: legacy.saturate
                            });
                        }
                    } catch { /* defaults are a complete configuration */ }
                }
                const revision = uakLocalRevision;
                const pending = uakPendingSaves;
                try {
                    const value = await uakHostSettings();
                    if (value !== null && pending === 0 && uakPendingSaves === 0) {
                        uakSettingsStore.applyRemote(value, revision);
                    }
                } catch { /* local fallback */ }
                return uakSettingsState;
            })();
            return uakSettingsReady.then(() => uakSettingsState);
        }
        /** Re-read the host copy without dropping a newer local edit or an in-flight save. */
        async function uakRefreshSettings() {
            const revision = uakLocalRevision;
            const pending = uakPendingSaves;
            const value = await uakHostSettings();
            if (value !== null && pending === 0 && uakPendingSaves === 0) {
                uakSettingsStore.applyRemote(value, revision);
            }
            return uakSettingsState;
        }
        async function uakSaveSettings(value) {
            const next = uakSanitizeSettings(value);
            uakSettingsStore.commit(next);
            const revision = uakLocalRevision;
            uakPendingSaves += 1;
            let savedValue;
            uakSaveSequence = uakSaveSequence.catch(() => {}).then(async () => {
                const response = await fetch(UAK_SETTINGS_PATH, {
                    method: "POST", headers: { "content-type": "application/json", accept: "application/json", "x-dsh-uak-settings": "1" },
                    body: JSON.stringify(next)
                });
                const result = await response.json().catch(() => ({}));
                if (!response.ok || result.ok !== true) throw new Error(result.message || "配置保存失败");
                savedValue = result.value;
            });
            try {
                await uakSaveSequence;
            } finally {
                uakPendingSaves = Math.max(0, uakPendingSaves - 1);
            }
            // The pending counter is already released, so a host-side
            // normalization (for example dropping a legacy field) can land now.
            if (savedValue !== undefined) uakSettingsStore.applyRemote(savedValue, revision);
            return uakSettingsState;
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
        /**
         * Cross-view convergence for appearance settings. The store is shared
         * by the settings page, the wallpaper layer and the monthly card in one
         * page; a second window writes localStorage and (rarely) the host file.
         * Both paths land here without a reload.
         */
        function uakMountSettingsSync() {
            if (typeof window === "undefined" || typeof document === "undefined") return () => {};
            if (typeof window.addEventListener !== "function" || typeof document.addEventListener !== "function") return () => {};
            let lastRefresh = 0;
            const refresh = () => {
                const now = Date.now();
                if (now - lastRefresh < 1500) return;
                lastRefresh = now;
                void uakRefreshSettings().catch(() => {});
            };
            const onStorage = (event) => {
                if (event.key !== UAK_SETTINGS_KEY || typeof event.newValue !== "string") return;
                try { uakSettingsStore.applyRemote(JSON.parse(event.newValue)); } catch { /* malformed peer state */ }
            };
            const onVisible = () => {
                if (typeof document.visibilityState === "string" && document.visibilityState !== "visible") return;
                refresh();
            };
            window.addEventListener("storage", onStorage);
            window.addEventListener("focus", onVisible);
            document.addEventListener("visibilitychange", onVisible);
            return () => {
                window.removeEventListener("storage", onStorage);
                window.removeEventListener("focus", onVisible);
                document.removeEventListener("visibilitychange", onVisible);
            };
        }
