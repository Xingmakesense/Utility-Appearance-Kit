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
  opacity: var(--uak-pop-grain,0);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E");
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
            for (const name of ["--uak-bg-alpha", "--uak-input-alpha", "--uak-glass-blur", "--uak-pop-alpha", "--uak-pop-blur", "--uak-pop-grain"]) root.style.removeProperty(name);
            if (uakSkinStyleTag) uakSkinStyleTag.textContent = "";
            uakRemoveSkinNodes();
            document.querySelector(".uak-liquid-wash")?.remove();
        }
        function uakApplyAppearance(settings) {
            if (typeof document === "undefined" || !document.body) return;
            const cfg = uakSanitizeSettings(settings);
            const signature = JSON.stringify(cfg);
            if (signature === uakLastAppearance) return;
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
            nodes.media.style.backgroundImage = `url("${uakCssUrlEscape(cfg.imageUrl)}")`;
            nodes.media.style.backgroundSize = cfg.imageMode === "repeat" ? "auto" : (cfg.imageMode === "contain" ? "contain" : "cover");
            nodes.media.style.backgroundPosition = "center";
            nodes.media.style.backgroundRepeat = cfg.imageMode === "repeat" ? "repeat" : "no-repeat";
            nodes.media.style.filter = `brightness(${cfg.brightness}%) contrast(${cfg.contrast}%) saturate(${cfg.saturate}%)`;
            nodes.media.style.transform = "scale(" + uakScaleRatio(cfg.scale) + ")";
            nodes.blur.style.backdropFilter = cfg.blur > 0 ? `blur(${cfg.blur}px)` : "none";
            // Reference: applySkin dynamic token rules. A dedicated style tag
            // owns these declarations so a host theme cannot keep an opaque
            // body over the wallpaper.
            const rules = [
                "html.uak-liquid,html.uak-liquid body{background:transparent}",
                "html.uak-liquid body #root,html.uak-liquid body #app{background:transparent}",
                "html.uak-liquid{",
                `--dsw-alias-bg-base:${tint(18,18,20)};`,
                `--dsw-alias-bg-layer-1:${tint(24,24,27)};`,
                `--dsw-alias-bg-layer-2:${tint(30,30,34)};`,
                `--dsw-alias-bg-layer-3:${tint(36,36,40)};`,
                `--dsw-specific-sidebar-fill:${tint(22,22,24)};`,
                `--dsw-alias-bg-module-platform:${tint(40,40,44)};`,
                "}",
                "html.uak-liquid body{",
                `--dsw-alias-bg-base:${tint(18,18,20)};`,
                `--dsw-alias-bg-layer-1:${tint(24,24,27)};`,
                `--dsw-alias-bg-layer-2:${tint(30,30,34)};`,
                `--dsw-alias-bg-layer-3:${tint(36,36,40)};`,
                `--dsw-specific-sidebar-fill:${tint(22,22,24)};`,
                `--dsw-alias-bg-module-platform:${tint(40,40,44)};`,
                "}"
            ];
            if (cfg.blur > 0 && cfg.opacity < 98) {
                rules.push(`html.uak-liquid body > div > div{backdrop-filter:blur(${cfg.blur}px)}`);
            }
            uakEnsureSkinStyle().textContent = rules.join("\n");
            root.style.setProperty("--uak-pop-alpha", String(cfg.popBg.alpha / 100));
            root.style.setProperty("--uak-pop-blur", `${cfg.popBg.blur}px`);
            root.style.setProperty("--uak-pop-grain", String(cfg.popBg.grain * .35 / 100));
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
            uakApplyAppearance(uakSettingsStore.getState());
            uakMarkGlassSurfaces();
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
            void uakLoadSettings().then(uakApplyAppearance);
            unsubscribe = uakSettingsStore.subscribe(uakApplyAppearance);
            return () => {
                disposed = true;
                if (retry !== null) clearTimeout(retry);
                observer?.disconnect();
                if (timer !== null) clearTimeout(timer);
                unsubscribe?.();
            };
        }
        function uakIsSessionLogDialog(element) {
            if (!element || element.closest(".uak-settings")) return false;
            const text = String(element.textContent || "").replace(/\s+/g, " ").trim();
            const title = element.querySelector('[role="heading"],h1,h2,h3');
            const label = `${element.getAttribute("aria-label") || ""} ${title?.textContent || ""} ${text.slice(0, 120)}`;
            // The real host dialog is titled "下载日志"/"Download session log";
            // do not require the exact phrase "session log" and a second verb.
            return /(session\s*log|会话日志|session日志|下载日志)/i.test(label);
        }
        function uakMountSessionLogDismissal() {
            if (typeof document === "undefined") return () => {};
            const timers = new Set();
            const closeDialog = (dialog) => {
                if (!dialog.isConnected) return true;
                const buttons = [...dialog.querySelectorAll("button,[role='button']")];
                const close = buttons.find((button) => {
                    const label = `${button.getAttribute("aria-label") || ""} ${button.getAttribute("title") || ""} ${button.textContent || ""}`.trim();
                    return /close|关闭|cancel|取消|dismiss|知道了|got it/i.test(label)
                        && !/download|下载|export|导出|confirm|确认/i.test(label);
                });
                if (close) { close.click(); return !dialog.isConnected; }
                // Host dialogs listen on document/window, not necessarily on
                // the dialog element itself.
                for (const target of [dialog, document, window]) {
                    try { target.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, bubbles: true, cancelable: true })); } catch { /* best effort */ }
                }
                return !dialog.isConnected;
            };
            const inspect = (dialog) => {
                if (dialog.dataset.uakLogClosing || !uakIsSessionLogDialog(dialog)) return;
                dialog.dataset.uakLogClosing = "true";
                const timer = setTimeout(() => {
                    timers.delete(timer);
                    if (!closeDialog(dialog)) {
                        // The dialog may finish rendering after its container
                        // appears; retry once instead of silently giving up.
                        const retry = setTimeout(() => { timers.delete(retry); closeDialog(dialog); }, 200);
                        timers.add(retry);
                    }
                    delete dialog.dataset.uakLogClosing;
                }, 2000);
                timers.add(timer);
            };
            const scanAddedNode = (node) => {
                if (node.nodeType !== 1) return;
                if (node.matches('[role="dialog"],[data-shell-overlay="true"] [data-slot] > *')) inspect(node);
                for (const dialog of node.querySelectorAll('[role="dialog"],[data-shell-overlay="true"] [data-slot] > *')) inspect(dialog);
            };
            const observer = new MutationObserver((records) => {
                for (const record of records) {
                    if (record.addedNodes.length === 0) continue;
                    for (const node of record.addedNodes) scanAddedNode(node);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            scanAddedNode(document.body);
            return () => { observer.disconnect(); for (const timer of timers) clearTimeout(timer); timers.clear(); };
        }
