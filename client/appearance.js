        const UAK_GLASS_CSS = `
html.uak-liquid, html.uak-liquid body { background: transparent !important; }
html.uak-liquid body #root, html.uak-liquid body #app { background: transparent !important; }
html.uak-liquid,
html.uak-liquid[data-ds-dark-theme],
html.uak-liquid[data-ds-light-theme],
html.uak-liquid body,
html.uak-liquid body[data-ds-dark-theme],
html.uak-liquid body[data-ds-light-theme] {
  --dsw-alias-bg-base: rgb(248 251 255 / var(--uak-surface-alpha, .12)) !important;
  --dsw-alias-bg-layer-1: rgb(255 255 255 / var(--uak-surface-alpha, .12)) !important;
  --dsw-alias-bg-layer-2: rgb(247 251 255 / var(--uak-surface-alpha, .12)) !important;
  --dsw-alias-bg-layer-3: rgb(255 255 255 / var(--uak-popup-alpha, .86)) !important;
  --dsw-specific-sidebar-fill: rgb(248 251 255 / var(--uak-surface-alpha, .12)) !important;
  --dsw-alias-bg-module-platform: rgb(219 234 254 / .48) !important;
  --dsw-specific-input-major: rgb(255 255 255 / var(--uak-input-alpha, .4)) !important;
}
html.uak-liquid[data-ds-dark-theme],
html.uak-liquid body[data-ds-dark-theme] {
  --dsw-alias-bg-base: rgb(16 23 36 / var(--uak-surface-alpha, .12)) !important;
  --dsw-alias-bg-layer-1: rgb(31 40 57 / var(--uak-surface-alpha, .12)) !important;
  --dsw-alias-bg-layer-2: rgb(37 48 68 / var(--uak-surface-alpha, .12)) !important;
  --dsw-alias-bg-layer-3: rgb(45 58 80 / var(--uak-popup-alpha, .86)) !important;
  --dsw-specific-sidebar-fill: rgb(24 33 49 / var(--uak-surface-alpha, .12)) !important;
  --dsw-alias-bg-module-platform: rgb(59 79 111 / .48) !important;
  --dsw-specific-input-major: rgb(27 38 56 / var(--uak-input-alpha, .4)) !important;
}
#uak-skin-root { position: fixed; inset: 0; z-index: -2; pointer-events: none; overflow: hidden; background: #101724; }
#uak-skin-media { position: absolute; inset: 0; width: 100%; height: 100%; background-position: center; }
#uak-skin-blur { position: absolute; inset: 0; pointer-events: none; }
.uak-liquid-wash { position: fixed; inset: 0; z-index: -1; pointer-events: none;
  background: radial-gradient(ellipse at 18% 0%, rgb(113 153 220 / .08), transparent 48%),
              radial-gradient(ellipse at 88% 100%, rgb(92 93 164 / .07), transparent 50%);
  box-shadow: inset 0 1px rgb(255 255 255 / .05); }
.uak-liquid [data-composer-card], .uak-liquid [data-uak-glass-card], .uak-liquid [data-taskboard],
.uak-liquid [data-dsh-taskboard], .uak-liquid [data-context-panel],
.uak-liquid [data-shell-overlay="true"] [data-slot] > * {
  backdrop-filter: blur(var(--uak-glass-blur, 18px)) saturate(1.12);
  -webkit-backdrop-filter: blur(var(--uak-glass-blur, 18px)) saturate(1.12);
  border-color: rgb(213 229 255 / .13);
  box-shadow: inset 0 1px rgb(255 255 255 / .06), 0 12px 40px rgb(0 0 0 / .12);
}
.uak-liquid [data-composer-card], .uak-liquid [data-uak-glass-card] { background-color: rgb(27 38 56 / var(--uak-input-alpha, .4)); }
.uak-liquid [data-shell-overlay="true"] [data-slot] > *,
.uak-liquid [role="dialog"], .uak-liquid [role="menu"] {
  background-color: rgb(32 43 62 / var(--uak-popup-alpha, .86));
  backdrop-filter: blur(var(--uak-glass-blur, 18px)) saturate(1.12);
  -webkit-backdrop-filter: blur(var(--uak-glass-blur, 18px)) saturate(1.12);
}
@media (prefers-reduced-transparency: reduce), (prefers-reduced-motion: reduce) {
  .uak-liquid [data-composer-card], .uak-liquid [data-uak-glass-card],
  .uak-liquid [data-taskboard], .uak-liquid [data-dsh-taskboard], .uak-liquid [data-context-panel],
  .uak-liquid [data-shell-overlay="true"] [data-slot] > *,
  .uak-liquid [role="dialog"], .uak-liquid [role="menu"] { backdrop-filter: none; -webkit-backdrop-filter: none; }
}
.uak-no-blur [data-composer-card], .uak-no-blur [data-uak-glass-card],
.uak-no-blur [data-taskboard], .uak-no-blur [data-dsh-taskboard], .uak-no-blur [data-context-panel],
.uak-no-blur [data-shell-overlay="true"] [data-slot] > *, .uak-no-blur [role="dialog"], .uak-no-blur [role="menu"],
.uak-no-blur .uak-statsFrame, .uak-no-blur .uak-statsBook { backdrop-filter: none; -webkit-backdrop-filter: none; }
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
            root.style.setProperty("--uak-surface-alpha", String(cfg.opacity / 100));
            root.style.setProperty("--uak-input-alpha", ".4");
            root.style.setProperty("--uak-glass-blur", `${cfg.glassBlur}px`);
            root.style.setProperty("--uak-popup-alpha", String(cfg.popupOpacity / 100));
            root.style.setProperty("--uak-card-alpha", String(cfg.glassOpacity / 100));
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
                    if (/card/i.test(String(node.className))) {
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
