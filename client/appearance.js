        // Reference: skin-master cssText and applySkin token/background rules.
        const UAK_GLASS_CSS = `
html.uak-liquid, html.uak-liquid body { background: transparent !important; }
html.uak-liquid body #root, html.uak-liquid body #app { background: transparent !important; }
#uak-skin-root { position: fixed; inset: 0; z-index: -1; pointer-events: none; overflow: hidden; background: #0d1117; }
#uak-skin-media { position: absolute; inset: 0; width: 100%; height: 100%; background-position: center; }
#uak-skin-blur { position: absolute; inset: 0; pointer-events: none; }
.uak-liquid-wash { position: fixed; inset: 0; z-index: 0; pointer-events: none; background: radial-gradient(circle at 15% 20%, rgb(96 165 250 / .15), transparent 40%), radial-gradient(circle at 85% 80%, rgb(168 85 247 / .12), transparent 45%); mix-blend-mode: overlay; }
html.uak-liquid [data-slot="sidebar"] { background-color: rgb(20 25 35 / var(--uak-bg-alpha, .6)) !important; backdrop-filter: blur(var(--uak-glass-blur,18px)) saturate(1.2) !important; -webkit-backdrop-filter: blur(var(--uak-glass-blur,18px)) saturate(1.2) !important; border-color: rgb(255 255 255 / .05) !important; }
/* L2 composer material is fixed; there is no input image configuration. */
html.uak-liquid [data-composer-card], html.uak-liquid [data-uak-glass-card] { background-color: rgb(30 41 59 / var(--uak-input-alpha, .7)) !important; backdrop-filter: blur(var(--uak-glass-blur,18px)) saturate(1.15) !important; -webkit-backdrop-filter: blur(var(--uak-glass-blur,18px)) saturate(1.15) !important; border: 1px solid rgb(255 255 255 / .08) !important; box-shadow: 0 8px 32px rgb(0 0 0 / .15) !important; }
/* Light palette: white-tinted glass so the dark text of the light theme keeps
   its contrast; the dark rules above stay the default for the dark theme. */
html.uak-liquid body:not([data-ds-dark-theme]) [data-slot="sidebar"] { background-color: rgb(248 250 253 / var(--uak-bg-alpha, .6)) !important; border-color: rgb(15 23 42 / .06) !important; }
html.uak-liquid body:not([data-ds-dark-theme]) [data-composer-card],
html.uak-liquid body:not([data-ds-dark-theme]) [data-uak-glass-card] { background-color: rgb(252 253 255 / var(--uak-input-alpha, .7)) !important; border: 1px solid rgb(15 23 42 / .08) !important; box-shadow: 0 8px 32px rgb(15 23 42 / .08) !important; }
html.uak-liquid body:not([data-ds-dark-theme]) [role="dialog"], html.uak-liquid body:not([data-ds-dark-theme]) [role="menu"],
html.uak-liquid body:not([data-ds-dark-theme]) [data-shell-overlay="true"] [data-slot] > *,
html.uak-liquid body:not([data-ds-dark-theme]) [class*='_portal_'], html.uak-liquid body:not([data-ds-dark-theme]) [class*='_list_'], html.uak-liquid body:not([data-ds-dark-theme]) [class*='_menu'] {
  --dsw-alias-bg-base: rgba(250,251,253,var(--uak-pop-alpha,1)) !important;
  --dsw-alias-bg-layer-1: rgba(255,255,255,var(--uak-pop-alpha,1)) !important;
  --dsw-alias-bg-layer-2: rgba(246,249,253,var(--uak-pop-alpha,1)) !important;
  --dsw-alias-bg-layer-3: rgba(255,255,255,var(--uak-pop-alpha,1)) !important;
  --dsw-specific-sidebar-fill: rgba(248,250,253,var(--uak-pop-alpha,1)) !important;
  --dsw-alias-bg-module-platform: rgba(226,236,250,var(--uak-pop-alpha,1)) !important;
  background-color: rgba(255,255,255,var(--uak-pop-alpha,1)) !important;
}
html.uak-liquid body:not([data-ds-dark-theme]) .uak-liquid-wash { background: radial-gradient(circle at 15% 20%, rgb(96 165 250 / .1), transparent 40%), radial-gradient(circle at 85% 80%, rgb(168 85 247 / .06), transparent 45%); }
html.uak-liquid [role="dialog"], html.uak-liquid [role="menu"],
html.uak-liquid [data-shell-overlay="true"] [data-slot] > *,
html.uak-liquid [class*='_portal_'], html.uak-liquid [class*='_list_'], html.uak-liquid [class*='_menu'] {
  --dsw-alias-bg-base: rgba(18,18,20,var(--uak-pop-alpha,1)) !important;
  --dsw-alias-bg-layer-1: rgba(24,24,27,var(--uak-pop-alpha,1)) !important;
  --dsw-alias-bg-layer-2: rgba(30,30,34,var(--uak-pop-alpha,1)) !important;
  --dsw-alias-bg-layer-3: rgba(36,36,40,var(--uak-pop-alpha,1)) !important;
  --dsw-specific-sidebar-fill: rgba(22,22,24,var(--uak-pop-alpha,1)) !important;
  --dsw-alias-bg-module-platform: rgba(40,40,44,var(--uak-pop-alpha,1)) !important;
  background-color: rgba(36,36,40,var(--uak-pop-alpha,1)) !important;
  backdrop-filter: blur(var(--uak-pop-blur,0px)) !important;
  -webkit-backdrop-filter: blur(var(--uak-pop-blur,0px)) !important;
}
html.uak-liquid [role="dialog"]::before, html.uak-liquid [role="menu"]::before,
html.uak-liquid [data-shell-overlay="true"] [data-slot] > *::before,
html.uak-liquid [class*='_portal_']::before, html.uak-liquid [class*='_list_']::before, html.uak-liquid [class*='_menu']::before {
  content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none; border-radius: inherit;
  background-image: none;
}
.uak-no-blur [data-slot="sidebar"], .uak-no-blur [data-composer-card], .uak-no-blur [data-uak-glass-card], .uak-no-blur [role="dialog"], .uak-no-blur [role="menu"] { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
`;
        let uakLastAppearance = null;
        let uakSkinNodes = null;
        let uakSkinStyleTag = null;
        const uakCssUrlEscape = (value) => String(value).replace(/["\\]/g, "\\$&");
        const uakScaleRatio = (value) => String(Math.max(100 + Math.min(Math.max(Number(value ?? 0), -100), 100), 10) / 100);
        // Reference: ensureSkinNodes / removeSkinNodes, UAK-owned ids.
        function uakEnsureSkinNodes() {
            if (uakSkinNodes && !document.body.contains(uakSkinNodes.root)) uakSkinNodes = null;
            if (uakSkinNodes) return uakSkinNodes;
            const root = document.createElement("div");
            root.id = "uak-skin-root";
            root.style.cssText = "position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden;background:#0d1117";
            const media = document.createElement("div");
            media.id = "uak-skin-media";
            media.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
            const blur = document.createElement("div");
            blur.id = "uak-skin-blur";
            blur.style.cssText = "position:absolute;inset:0;width:100%;height:100%;backdrop-filter:none";
            root.appendChild(media); root.appendChild(blur);
            document.body.appendChild(root);
            uakSkinNodes = { root, media, blur };
            return uakSkinNodes;
        }
        function uakRemoveSkinNodes() {
            if (!uakSkinNodes) return;
            try { uakSkinNodes.root.remove(); } catch { /* already detached */ }
            uakSkinNodes = null;
        }
        // Reference: ensureSkinStyle and applySkin's dynamic rules.
        function uakEnsureSkinStyle() {
            if (uakSkinStyleTag && uakSkinStyleTag.isConnected) return uakSkinStyleTag;
            uakSkinStyleTag = document.createElement("style");
            uakSkinStyleTag.id = "uak-skin-css";
            document.head.appendChild(uakSkinStyleTag);
            return uakSkinStyleTag;
        }
        function uakClearAppearance(root) {
            root.classList.remove("uak-liquid", "uak-no-blur");
            for (const name of ["--uak-bg-alpha", "--uak-input-alpha", "--uak-glass-blur", "--uak-pop-alpha", "--uak-pop-blur"]) root.style.removeProperty(name);
            if (uakSkinStyleTag) uakSkinStyleTag.textContent = "";
            uakRemoveSkinNodes();
            document.querySelector(".uak-liquid-wash")?.remove();
        }
        function uakApplyAppearance(settings) {
            if (typeof document === "undefined" || !document.body) return;
            const cfg = uakSanitizeSettings(settings);
            const signature = JSON.stringify(cfg);
            // Reference: applySkin re-checks the live DOM on every call, so a
            // host-side wipe of the layer is rebuilt even when the config did
            // not change. Only a fully intact layer may take the shortcut.
            const layerAlive = uakSkinNodes !== null && document.body.contains(uakSkinNodes.root);
            const styleAlive = uakSkinStyleTag !== null && uakSkinStyleTag.isConnected;
            if (signature === uakLastAppearance && layerAlive && styleAlive) return;
            uakLastAppearance = signature;
            const root = document.documentElement;
            if (!cfg.imageUrl) {
                uakClearAppearance(root);
                root.classList.add("uak-liquid", "uak-no-blur");
                root.style.setProperty("--uak-bg-alpha", "1");
                return;
            }
            root.classList.add("uak-liquid");
            root.classList.toggle("uak-no-blur", cfg.glassBlur === 0 || cfg.opacity >= 98);
            root.style.setProperty("--uak-bg-alpha", String(cfg.opacity / 100));
            root.style.setProperty("--uak-input-alpha", String(cfg.glassOpacity / 100));
            root.style.setProperty("--uak-glass-blur", `${cfg.glassBlur}px`);
            root.style.setProperty("--uak-stats-height", `${cfg.bodyHeight}px`);
            const nodes = uakEnsureSkinNodes();
            const a = Math.min(Math.max(Number(cfg.opacity ?? 100), 0), 100) / 100;
            const tint = (r, g, b) => `rgba(${r},${g},${b},${a})`;
            // Light and dark palettes: the wallpaper tint must not paint a dark
            // scrim under the light theme's dark text.
            const dark = document.body?.hasAttribute("data-ds-dark-theme") === true;
            const palette = dark
                ? { base: [18, 18, 20], layer1: [24, 24, 27], layer2: [30, 30, 34], layer3: [36, 36, 40], sidebar: [22, 22, 24], platform: [40, 40, 44] }
                : { base: [250, 251, 253], layer1: [255, 255, 255], layer2: [246, 249, 253], layer3: [255, 255, 255], sidebar: [248, 250, 253], platform: [226, 236, 250] };
            nodes.root.style.background = dark ? "#0d1117" : "#eef2f8";
            nodes.media.style.backgroundImage = `url("${uakCssUrlEscape(cfg.imageUrl)}")`;
            nodes.media.style.backgroundSize = cfg.imageMode === "repeat" ? "auto" : (cfg.imageMode === "contain" ? "contain" : "cover");
            nodes.media.style.backgroundPosition = "center";
            nodes.media.style.backgroundRepeat = cfg.imageMode === "repeat" ? "repeat" : "no-repeat";
            nodes.media.style.filter = `brightness(${cfg.brightness}%)`;
            nodes.media.style.transform = "scale(1)";
            nodes.blur.style.backdropFilter = "none";
            // Reference: applySkin dynamic token rules. A dedicated style tag
            // owns these declarations so a host theme cannot keep an opaque
            // body over the wallpaper.
            const rules = [
                "html.uak-liquid,html.uak-liquid body{background:transparent}",
                "html.uak-liquid body #root,html.uak-liquid body #app{background:transparent}",
                "html.uak-liquid{",
                `--dsw-alias-bg-base:${tint(...palette.base)};`,
                `--dsw-alias-bg-layer-1:${tint(...palette.layer1)};`,
                `--dsw-alias-bg-layer-2:${tint(...palette.layer2)};`,
                `--dsw-alias-bg-layer-3:${tint(...palette.layer3)};`,
                `--dsw-specific-sidebar-fill:${tint(...palette.sidebar)};`,
                `--dsw-alias-bg-module-platform:${tint(...palette.platform)};`,
                "}",
                "html.uak-liquid body{",
                `--dsw-alias-bg-base:${tint(...palette.base)};`,
                `--dsw-alias-bg-layer-1:${tint(...palette.layer1)};`,
                `--dsw-alias-bg-layer-2:${tint(...palette.layer2)};`,
                `--dsw-alias-bg-layer-3:${tint(...palette.layer3)};`,
                `--dsw-specific-sidebar-fill:${tint(...palette.sidebar)};`,
                `--dsw-alias-bg-module-platform:${tint(...palette.platform)};`,
                "}"
            ];
            uakEnsureSkinStyle().textContent = rules.join("\n");
            root.style.setProperty("--uak-pop-alpha", String(cfg.popBg.alpha / 100));
            root.style.setProperty("--uak-pop-blur", `${cfg.popBg.blur}px`);
            if (!document.querySelector(".uak-liquid-wash")) {
                const wash = document.createElement("div"); wash.className = "uak-liquid-wash"; wash.setAttribute("aria-hidden", "true"); document.body.append(wash);
            }
        }
        function uakMarkGlassSurfaces(root = document) {
            if (typeof document === "undefined") return;
            const candidates = [];
            if (root.nodeType === 1 && root.matches('[data-lexical-editor="true"],textarea')) candidates.push(root);
            if (typeof root.querySelectorAll === "function") candidates.push(...root.querySelectorAll('[data-lexical-editor="true"],textarea'));
            for (const editor of candidates) {
                let node = editor.parentElement;
                while (node && node !== document.body) {
                    if (/card|composer|editor/i.test(String(node.className))) {
                        if (node.dataset.uakGlassCard !== "true") node.dataset.uakGlassCard = "true";
                        break;
                    }
                    node = node.parentElement;
                }
            }
        }
        function uakMountAppearance() {
            if (typeof document === "undefined") return () => {};
            let disposed = false;
            let retry = null;
            let unsubscribe = null;
            let observer = null;
            let timer = null;
            const attach = () => {
                if (disposed || document.body) return true;
                retry = setTimeout(attach, 50);
                return false;
            };
            if (!attach()) {
                return () => { disposed = true; if (retry !== null) clearTimeout(retry); };
            }
            // Reference: initSkin retries the host load before applying. The
            // web server can still be cold on the first paint, and a single
            // failed fetch used to leave the wallpaper off for the session.
            const boot = async () => {
                for (let attempt = 0; attempt < 5 && !disposed; attempt += 1) {
                    try {
                        const settings = await uakLoadSettings();
                        if (!disposed) uakApplyAppearance(settings);
                        return;
                    } catch {
                        await new Promise((resolve) => setTimeout(resolve, 400));
                    }
                }
                if (!disposed) uakApplyAppearance(uakSettingsStore.getState());
            };
            void boot();
            uakApplyAppearance(uakSettingsStore.getState());
            uakMarkGlassSurfaces();
            // The host toggles data-ds-dark-theme on <body>; repaint the
            // palette when it flips instead of waiting for a settings change.
            const themeObserver = typeof MutationObserver === "function"
                ? new MutationObserver(() => {
                    uakLastAppearance = null;
                    uakApplyAppearance(uakSettingsStore.getState());
                })
                : null;
            themeObserver?.observe(document.body, { attributes: true, attributeFilter: ["data-ds-dark-theme"] });
            if (typeof MutationObserver === "function") {
                observer = new MutationObserver((records) => {
                    const added = records.some((record) => record.addedNodes.length > 0);
                    if (!added || timer !== null) return;
                    timer = setTimeout(() => {
                        timer = null;
                        for (const record of records) {
                            for (const node of record.addedNodes) {
                                if (node.nodeType === 1) uakMarkGlassSurfaces(node);
                            }
                        }
                    }, 80);
                });
                observer.observe(document.body, { childList: true, subtree: true });
            }
            unsubscribe = uakSettingsStore.subscribe(uakApplyAppearance);
            return () => {
                disposed = true;
                if (retry !== null) clearTimeout(retry);
                themeObserver?.disconnect();
                observer?.disconnect();
                if (timer !== null) clearTimeout(timer);
                unsubscribe?.();
            };
        }