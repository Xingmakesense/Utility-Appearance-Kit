        const UAK_GLASS_CSS = `
/* L1: wallpaper and liquid colour wash. Neither layer intercepts input. */
html.uak-liquid, html.uak-liquid body { background: transparent !important; }
html.uak-liquid body #root, html.uak-liquid body #app { background: transparent !important; }
html.uak-liquid,
html.uak-liquid[data-ds-dark-theme],
html.uak-liquid[data-ds-light-theme],
html.uak-liquid body,
html.uak-liquid body[data-ds-dark-theme],
html.uak-liquid body[data-ds-light-theme] {
  --dsw-alias-bg-base: transparent !important;
  --dsw-alias-bg-layer-1: transparent !important;
  --dsw-alias-bg-layer-2: transparent !important;
  --dsw-alias-bg-layer-3: transparent !important;
  --dsw-specific-sidebar-fill: transparent !important;
  --dsw-alias-bg-module-platform: transparent !important;
}
#uak-skin-root {
  position: fixed; inset: 0; z-index: -1; pointer-events: none; overflow: hidden;
  background: #0d1117;
}
#uak-skin-media { position: absolute; inset: 0; width: 100%; height: 100%; background-position: center; }
#uak-skin-blur { position: absolute; inset: 0; pointer-events: none; }
.uak-liquid-wash {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background: radial-gradient(circle at 15% 20%, rgb(96 165 250 / .15), transparent 40%),
              radial-gradient(circle at 85% 80%, rgb(168 85 247 / .12), transparent 45%);
  mix-blend-mode: overlay;
}

/* L2: frosted sidebar, composer card, and explicit overlay surfaces. */
html.uak-liquid [data-slot="sidebar"] {
  background-color: rgb(20 25 35 / var(--uak-surface-alpha, .6)) !important;
  backdrop-filter: blur(var(--uak-glass-blur, 18px)) saturate(1.2) !important;
  -webkit-backdrop-filter: blur(var(--uak-glass-blur, 18px)) saturate(1.2) !important;
  border-color: rgb(255 255 255 / .05) !important;
}
html.uak-liquid [data-composer-card],
html.uak-liquid [data-uak-glass-card] {
  background-color: rgb(30 41 59 / var(--uak-input-alpha, .7)) !important;
  backdrop-filter: blur(var(--uak-glass-blur, 18px)) saturate(1.15) !important;
  -webkit-backdrop-filter: blur(var(--uak-glass-blur, 18px)) saturate(1.15) !important;
  border: 1px solid rgb(255 255 255 / .08) !important;
  box-shadow: 0 8px 32px rgb(0 0 0 / .15) !important;
}
html.uak-liquid [data-shell-overlay="true"] [data-slot] > *,
html.uak-liquid [role="dialog"],
html.uak-liquid [role="menu"] {
  background-color: rgb(22 30 45 / var(--uak-popup-alpha, .85)) !important;
  backdrop-filter: blur(calc(var(--uak-glass-blur, 18px) * 1.5)) saturate(1.2) !important;
  -webkit-backdrop-filter: blur(calc(var(--uak-glass-blur, 18px) * 1.5)) saturate(1.2) !important;
  border: 1px solid rgb(255 255 255 / .1) !important;
  box-shadow: 0 20px 40px rgb(0 0 0 / .4) !important;
}

/* L3: native controls, typography, and list items keep their own styles. */

.uak-no-blur [data-slot="sidebar"],
.uak-no-blur [data-composer-card],
.uak-no-blur [data-uak-glass-card],
.uak-no-blur [data-shell-overlay="true"] [data-slot] > *,
.uak-no-blur [role="dialog"],
.uak-no-blur [role="menu"] {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
`;
        let uakLastAppearance = null;
        function uakApplyAppearance(settings) {
            if (typeof document === "undefined") return;
            const cfg = uakSanitizeSettings(settings);
            const signature = JSON.stringify(cfg);
            if (signature === uakLastAppearance) return;
            uakLastAppearance = signature;
            const root = document.documentElement;
            root.classList.add("uak-liquid");
            root.classList.toggle("uak-no-blur", cfg.glassBlur === 0 || cfg.opacity >= 98);
            if (!cfg.imageUrl) {
                document.getElementById("uak-skin-root")?.remove();
                document.querySelector(".uak-liquid-wash")?.remove();
                return;
            }
            let layer = document.getElementById("uak-skin-root");
            if (!layer) {
                layer = document.createElement("div"); layer.id = "uak-skin-root";
                const media = document.createElement("div"); media.id = "uak-skin-media";
                const blur = document.createElement("div"); blur.id = "uak-skin-blur";
                layer.append(media, blur); document.body.prepend(layer);
            }
            const media = layer.querySelector("#uak-skin-media");
            const blur = layer.querySelector("#uak-skin-blur");
            media.textContent = "";
            media.style.backgroundImage = cfg.imageUrl ? `url("${cfg.imageUrl.replace(/["\\]/g, "\\$&")}")` : "";
            media.style.backgroundSize = cfg.imageMode === "repeat" ? "auto" : cfg.imageMode;
            media.style.backgroundRepeat = cfg.imageMode === "repeat" ? "repeat" : "no-repeat";
            media.style.filter = `brightness(${cfg.brightness}%) contrast(${cfg.contrast}%) saturate(${cfg.saturate}%)`;
            media.style.transform = `scale(${Math.max(10, 100 + cfg.scale) / 100})`;
            blur.style.backdropFilter = cfg.blur > 0 ? `blur(${cfg.blur}px)` : "none";
            root.style.setProperty("--uak-surface-alpha", String(cfg.opacity / 100 || .6));
            root.style.setProperty("--uak-input-alpha", String(cfg.glassOpacity / 100));
            root.style.setProperty("--uak-glass-blur", `${cfg.glassBlur}px`);
            root.style.setProperty("--uak-popup-alpha", String(cfg.popupOpacity / 100));
            root.style.setProperty("--uak-stats-height", `${cfg.bodyHeight}px`);
            if (!document.querySelector(".uak-liquid-wash")) {
                const wash = document.createElement("div"); wash.className = "uak-liquid-wash";
                wash.setAttribute("aria-hidden", "true"); document.body.append(wash);
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
            uakApplyAppearance(uakSettingsStore.getState());
            uakMarkGlassSurfaces();
            let timer = null;
            const observer = typeof MutationObserver === "function" ? new MutationObserver((records) => {
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
            }) : null;
            observer?.observe(document.body, { childList: true, subtree: true });
            void uakLoadSettings().then(uakApplyAppearance);
            const unsubscribe = uakSettingsStore.subscribe(uakApplyAppearance);
            return () => { observer?.disconnect(); if (timer !== null) clearTimeout(timer); unsubscribe(); };
        }
        function uakIsSessionLogDialog(element) {
            if (!element || element.closest(".uak-settings")) return false;
            const text = String(element.textContent || "").replace(/\s+/g, " ").trim();
            const title = element.querySelector('[role="heading"],h1,h2,h3');
            const label = `${element.getAttribute("aria-label") || ""} ${title?.textContent || ""}`;
            if (!/(session\s*log|会话日志|session日志)/i.test(label) || !/(download|下载|export|导出)/i.test(label)) return false;
            return /(session\s*log|会话日志|session日志)/i.test(text) && /(download|下载|export|导出)/i.test(text);
        }
        function uakMountSessionLogDismissal() {
            if (typeof document === "undefined") return () => {};
            const timers = new Set();
            const inspect = (dialog) => {
                if (dialog.dataset.uakLogClosing || !uakIsSessionLogDialog(dialog)) return;
                dialog.dataset.uakLogClosing = "true";
                const timer = setTimeout(() => {
                    timers.delete(timer);
                    if (!dialog.isConnected) return;
                    const buttons = [...dialog.querySelectorAll("button")];
                    const close = buttons.find((button) => {
                        const label = `${button.getAttribute("aria-label") || ""} ${button.textContent || ""}`;
                        return /close|关闭|cancel|取消|dismiss|知道了/i.test(label) && !/download|下载|export|导出|confirm|确认/i.test(label);
                    });
                    if (close) close.click();
                    else dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
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
