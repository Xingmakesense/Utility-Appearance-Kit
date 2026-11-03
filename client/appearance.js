        // Reference: skin-master cssText and applySkin token/background rules.
        const UAK_GLASS_CSS = `
html.uak-liquid, html.uak-liquid body { background: transparent !important; }
html.uak-liquid body #root, html.uak-liquid body #app { background: transparent !important; }
html.uak-liquid,
html.uak-liquid body,
html.uak-liquid[data-ds-dark-theme],
html.uak-liquid[data-ds-light-theme],
html.uak-liquid body[data-ds-dark-theme],
html.uak-liquid body[data-ds-light-theme] {
  --dsw-alias-bg-base: rgba(18,18,20,var(--uak-bg-alpha,0)) !important;
  --dsw-alias-bg-layer-1: rgba(24,24,27,var(--uak-bg-alpha,0)) !important;
  --dsw-alias-bg-layer-2: rgba(30,30,34,var(--uak-bg-alpha,0)) !important;
  --dsw-alias-bg-layer-3: rgba(36,36,40,var(--uak-bg-alpha,0)) !important;
  --dsw-specific-sidebar-fill: rgba(22,22,24,var(--uak-bg-alpha,0)) !important;
  --dsw-alias-bg-module-platform: rgba(40,40,44,var(--uak-bg-alpha,0)) !important;
}
#uak-skin-root { position: fixed; inset: 0; z-index: -1; pointer-events: none; overflow: hidden; background: #0d1117; }
#uak-skin-media { position: absolute; inset: 0; width: 100%; height: 100%; background-position: center; }
#uak-skin-blur { position: absolute; inset: 0; pointer-events: none; }
.uak-liquid-wash { position: fixed; inset: 0; z-index: 0; pointer-events: none; background: radial-gradient(circle at 15% 20%, rgb(96 165 250 / .15), transparent 40%), radial-gradient(circle at 85% 80%, rgb(168 85 247 / .12), transparent 45%); mix-blend-mode: overlay; }
html.uak-liquid:not(.uak-no-blur) body > div > div { backdrop-filter: blur(var(--uak-glass-blur,18px)) saturate(1.1); -webkit-backdrop-filter: blur(var(--uak-glass-blur,18px)) saturate(1.1); }
html.uak-liquid [data-slot="sidebar"] { background-color: rgb(20 25 35 / var(--uak-bg-alpha, .6)) !important; backdrop-filter: blur(var(--uak-glass-blur,18px)) saturate(1.2) !important; -webkit-backdrop-filter: blur(var(--uak-glass-blur,18px)) saturate(1.2) !important; border-color: rgb(255 255 255 / .05) !important; }
html.uak-liquid [data-composer-card], html.uak-liquid [data-uak-glass-card] { background-color: rgb(30 41 59 / var(--uak-input-alpha, .7)) !important; backdrop-filter: blur(var(--uak-glass-blur,18px)) saturate(1.15) !important; -webkit-backdrop-filter: blur(var(--uak-glass-blur,18px)) saturate(1.15) !important; border: 1px solid rgb(255 255 255 / .08) !important; box-shadow: 0 8px 32px rgb(0 0 0 / .15) !important; }
/* Reference: applyPopBg and its opaque token restoration. */
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
/* Reference: applyInputBg / applyInputOpacity pseudo layers. */
.uak-input-bg { position: relative !important; }
.uak-input-bg::before { content: ""; position: absolute; inset: var(--uak-input-inset,0); background-image: var(--uak-input-img); background-size: var(--uak-input-size,cover); background-repeat: var(--uak-input-repeat,no-repeat); background-position: var(--uak-input-pos,50% 50%); filter: blur(var(--uak-input-blur,0px)); opacity: var(--uak-input-opacity,1); transform: scale(var(--uak-input-scale,1)); z-index: 0; pointer-events: none; border-radius: inherit; mask-image: var(--uak-input-mask,none); -webkit-mask-image: var(--uak-input-mask,none); }
.uak-input-bg.uak-input-cross { overflow: visible !important; }
.uak-input-bg.uak-input-cross::before { inset: -60%; }
.uak-input-bg::after { content: ""; position: absolute; inset: 0; background-image: var(--uak-input-grad); z-index: 1; pointer-events: none; border-radius: inherit; }
.uak-input-bg > * { position: relative; z-index: 2; }
.uak-inputCard { position: relative !important; background-color: rgba(44,44,46,var(--uak-input-bg-alpha,1)) !important; backdrop-filter: blur(10px) !important; }
/* Reference: applyInputBox / applyChatColor / applyChatFont CSS. */
html.uak-liquid [class*='P5DUYG_bubble'], html.uak-liquid [class*='cJsG2q_bubble'] { background-color: var(--uak-inputbox-bg-rgba,rgba(44,44,46,1)) !important; color: var(--uak-inputbox-text,inherit) !important; backdrop-filter: blur(var(--uak-inputbox-blur,0px)) !important; font-weight: var(--uak-user-weight,inherit) !important; text-shadow: var(--uak-user-shadow,none) !important; }
html.uak-liquid [class*='P5DUYG_bubble'] *, html.uak-liquid [class*='cJsG2q_bubble'] * { color: var(--uak-inputbox-text,inherit) !important; }
html.uak-liquid [class*='kBm9Yq_body'], html.uak-liquid [class*='v5IAXa_body'], html.uak-liquid [class*='kBm9Yq_body'] *, html.uak-liquid [class*='v5IAXa_body'] * { color: var(--uak-chat-color,inherit) !important; }
html.uak-liquid [class*='kBm9Yq_body'], html.uak-liquid [class*='v5IAXa_body'] { font-weight: var(--uak-chat-weight,inherit) !important; text-shadow: var(--uak-chat-shadow,none) !important; }
.uak-no-blur [data-slot="sidebar"], .uak-no-blur [data-composer-card], .uak-no-blur [data-uak-glass-card], .uak-no-blur [role="dialog"], .uak-no-blur [role="menu"] { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
`;
        let uakLastAppearance = null;
        const uakCssUrlEscape = (value) => String(value).replace(/["\\]/g, "\\$&");
        const uakHexToRgba = (hex, alpha) => {
            if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
            const number = parseInt(hex.slice(1), 16);
            return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
        };
        let uakVideoLastTick = { time: -1, at: 0 };
        // Reference: findInputCard, including both app generations.
        function uakFindInputCard() {
            const solidBg = (element) => {
                const bg = getComputedStyle(element).backgroundColor;
                return Boolean(bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent");
            };
            const walkUp = (from) => {
                let element = from.parentElement;
                while (element && element !== document.body) {
                    if (solidBg(element)) return element;
                    element = element.parentElement;
                }
                return null;
            };
            for (const editor of document.querySelectorAll('[data-lexical-editor="true"]')) {
                const card = walkUp(editor);
                if (card && /card/i.test(String(card.className))) return card;
            }
            const textarea = document.querySelector("textarea");
            if (textarea) {
                const card = walkUp(textarea) || textarea.parentElement;
                if (card) return card;
            }
            for (const editor of document.querySelectorAll('[data-lexical-editor="true"]')) {
                const card = walkUp(editor);
                if (card) return card;
            }
            return document.querySelector("[class*='RlGAzG_card']");
        }
        // Reference: applyInputBg, with UAK-owned classes and CSS variables.
        function uakApplyInputBg(inputBg) {
            const active = Boolean(inputBg?.enabled && inputBg.imageUrl);
            const card = uakFindInputCard();
            if (!card) return;
            if (!active) {
                card.classList.remove("uak-input-bg", "uak-input-cross");
                card.style.removeProperty("--uak-input-img");
                card.style.removeProperty("--uak-input-grad");
                card.style.removeProperty("--uak-input-mask");
                return;
            }
            const mid = Math.min(Math.max(Number(inputBg.transition) || 55, 10), 90);
            const solid = Math.max(mid - 12, 0);
            const fade = Math.min(mid + 22, 100);
            const mode = inputBg.mode || "fill";
            const width = 100 + Math.min(Math.max(Number(inputBg.scale) || 0, -100), 100);
            const size = mode === "stretch" ? `${width}% ${width}%` : mode === "fit" ? "contain" : `${width}% auto`;
            card.classList.add("uak-input-bg");
            card.classList.toggle("uak-input-cross", mode === "cross");
            card.style.setProperty("--uak-input-img", `url("${uakCssUrlEscape(inputBg.imageUrl)}")`);
            card.style.setProperty("--uak-input-size", size);
            card.style.setProperty("--uak-input-repeat", mode === "repeat" ? "repeat" : "no-repeat");
            card.style.setProperty("--uak-input-pos", mode === "center" ? "center" : `${inputBg.posX}% ${inputBg.posY}%`);
            card.style.setProperty("--uak-input-grad", `linear-gradient(to right, rgba(44,44,46,var(--uak-input-bg-alpha,1)) 0%, rgba(44,44,46,var(--uak-input-bg-alpha,1)) ${solid}%, rgba(44,44,46,0) ${fade}%, rgba(44,44,46,0) 100%)`);
            card.style.setProperty("--uak-input-blur", `${Math.min(Math.max(Number(inputBg.blur) || 0, 0), 40)}px`);
            card.style.setProperty("--uak-input-opacity", String(Math.min(Math.max(Number(inputBg.opacity) ?? 100, 0), 100) / 100));
            card.style.setProperty("--uak-input-mask", mode === "cross" ? "none" : `linear-gradient(to right, transparent 0%, transparent ${solid}%, #000 ${fade}%, #000 100%)`);
        }
        // Reference: applyInputOpacity.
        function uakApplyInputOpacity(inputBg) {
            const alpha = Math.min(Math.max(Number(inputBg?.inputOpacity) ?? 100, 0), 100) / 100;
            const card = uakFindInputCard();
            if (!card) return;
            card.style.setProperty("--uak-input-bg-alpha", String(alpha));
            card.classList.toggle("uak-inputCard", alpha < 1);
        }
        // Reference: applyPopBg.
        function uakApplyPopBg(popBg) {
            const root = document.documentElement;
            root.style.setProperty("--uak-pop-alpha", String(popBg.alpha / 100));
            root.style.setProperty("--uak-pop-blur", `${popBg.blur}px`);
            root.style.setProperty("--uak-pop-grain", String(popBg.grain * .35 / 100));
        }
        // Reference: applyChatColor.
        function uakApplyChatColor(color) { document.documentElement.style.setProperty("--uak-chat-color", color || ""); }
        // Reference: applyChatFont and chatFontPreviewStyle use the same shadow recipe.
        function uakApplyChatFont(font) {
            const px = (value, min, max) => `${Math.min(Math.max(Number(value) || 0, min), max)}px`;
            const color = /^#[0-9a-fA-F]{6}$/.test(font.shadowColor) ? font.shadowColor : "#000000";
            const shadow = `${px(font.shadowX, -10, 10)} ${px(font.shadowY, -10, 10)} ${px(font.shadowBlur, 0, 20)} ${uakHexToRgba(color, font.shadowStrength / 100) || color}`;
            const root = document.documentElement;
            root.style.setProperty("--uak-chat-weight", font.aiBold ? String(font.weight) : "");
            root.style.setProperty("--uak-user-weight", font.userBold ? String(font.weight) : "");
            root.style.setProperty("--uak-chat-shadow", font.aiShadow ? shadow : "");
            root.style.setProperty("--uak-user-shadow", font.userShadow ? shadow : "");
        }
        // Reference: applyInputBox.
        function uakApplyInputBox(box) {
            const root = document.documentElement;
            const alpha = box.opacity / 100;
            root.style.setProperty("--uak-inputbox-bg-rgba", uakHexToRgba(box.bgColor, alpha) || `rgba(44,44,46,${alpha})`);
            root.style.setProperty("--uak-inputbox-text", box.textColor || "");
            root.style.setProperty("--uak-inputbox-blur", `${box.blur}px`);
        }
        // Reference: kickVideo and ensureVideoWatchdog.
        function uakKickVideo(video) {
            try { video.play()?.catch(() => {}); } catch { /* retry on the next watchdog tick */ }
        }
        function uakWatchVideo() {
            const media = document.getElementById("uak-skin-media");
            const video = media?.querySelector("video");
            if (!video || !uakSettingsStore.getState().videoUrl) return;
            const now = Date.now();
            if (video.paused) {
                uakKickVideo(video);
                uakVideoLastTick = { time: video.currentTime, at: now };
                return;
            }
            if (Math.abs(video.currentTime - uakVideoLastTick.time) > .01) {
                uakVideoLastTick = { time: video.currentTime, at: now };
                return;
            }
            if (now - uakVideoLastTick.at > 6000) {
                uakVideoLastTick = { time: -1, at: now };
                try { video.load(); } catch { /* best effort */ }
                uakKickVideo(video);
            }
        }
        function uakClearAppearance(root) {
            root.classList.remove("uak-liquid", "uak-no-blur");
            for (const name of ["--uak-bg-alpha", "--uak-input-alpha", "--uak-glass-blur", "--uak-pop-alpha", "--uak-pop-blur", "--uak-pop-grain", "--uak-chat-color", "--uak-chat-weight", "--uak-user-weight", "--uak-chat-shadow", "--uak-user-shadow", "--uak-inputbox-bg-rgba", "--uak-inputbox-text", "--uak-inputbox-blur"]) root.style.removeProperty(name);
            document.getElementById("uak-skin-root")?.remove();
            document.querySelector(".uak-liquid-wash")?.remove();
            const card = uakFindInputCard();
            card?.classList.remove("uak-input-bg", "uak-input-cross", "uak-inputCard");
            if (card) {
                for (const name of ["--uak-input-img", "--uak-input-size", "--uak-input-repeat", "--uak-input-pos", "--uak-input-grad", "--uak-input-blur", "--uak-input-opacity", "--uak-input-mask", "--uak-input-bg-alpha"]) card.style.removeProperty(name);
            }
        }
        function uakApplyAppearance(settings) {
            if (typeof document === "undefined" || !document.body) return;
            const cfg = uakSanitizeSettings(settings);
            const signature = JSON.stringify(cfg);
            if (signature === uakLastAppearance) return;
            uakLastAppearance = signature;
            const root = document.documentElement;
            if (!cfg.imageUrl && !cfg.videoUrl) {
                // No wallpaper means opaque native surfaces; independent text and
                // composer settings still use their own switches.
                uakClearAppearance(root);
                root.classList.add("uak-liquid", "uak-no-blur");
                root.style.setProperty("--uak-bg-alpha", "1");
                uakApplyChatColor(cfg.chatColor);
                uakApplyChatFont(cfg.chatFont);
                uakApplyInputBox(cfg.inputBox);
                uakApplyInputBg(cfg.inputBg);
                uakApplyInputOpacity(cfg.inputBg);
                return;
            }
            root.classList.add("uak-liquid");
            root.classList.toggle("uak-no-blur", cfg.glassBlur === 0 || cfg.opacity >= 98);
            root.style.setProperty("--uak-bg-alpha", String(cfg.opacity / 100));
            root.style.setProperty("--uak-input-alpha", String(cfg.glassOpacity / 100));
            root.style.setProperty("--uak-glass-blur", `${cfg.glassBlur}px`);
            root.style.setProperty("--uak-stats-height", `${cfg.bodyHeight}px`);
            let layer = document.getElementById("uak-skin-root");
            if (!layer) {
                layer = document.createElement("div"); layer.id = "uak-skin-root";
                const media = document.createElement("div"); media.id = "uak-skin-media";
                const blur = document.createElement("div"); blur.id = "uak-skin-blur";
                layer.append(media, blur); document.body.prepend(layer);
            }
            const media = layer.querySelector("#uak-skin-media");
            const blur = layer.querySelector("#uak-skin-blur");
            const filter = `brightness(${cfg.brightness}%) contrast(${cfg.contrast}%) saturate(${cfg.saturate}%)`;
            const scale = Math.max(10, 100 + cfg.scale) / 100;
            // Reference: applySkin mediaChanged; video and image are exclusive.
            if (cfg.videoUrl) {
                let video = media.querySelector("video");
                if (!video || video.dataset.uakSrc !== cfg.videoUrl) {
                    media.textContent = "";
                    video = document.createElement("video");
                    video.dataset.uakSrc = cfg.videoUrl;
                    video.preload = "auto"; video.src = cfg.videoUrl; video.autoplay = true; video.loop = true; video.playsInline = true;
                    video.addEventListener("ended", () => { try { video.currentTime = 0; } catch { /* best effort */ } uakKickVideo(video); });
                    video.addEventListener("pause", () => { setTimeout(() => { if (video.paused && video.isConnected) uakKickVideo(video); }, 120); });
                    video.addEventListener("error", () => { try { video.load(); } catch { /* best effort */ } uakKickVideo(video); });
                    media.append(video);
                    uakVideoLastTick = { time: -1, at: Date.now() };
                }
                media.style.backgroundImage = "";
                video.muted = cfg.videoMuted; video.volume = cfg.videoVolume / 100;
                video.style.cssText = `width:100%;height:100%;object-fit:cover;filter:${filter};transform:scale(${scale})`;
                uakKickVideo(video);
            } else {
                media.textContent = "";
                media.style.backgroundImage = `url("${uakCssUrlEscape(cfg.imageUrl)}")`;
                media.style.backgroundSize = cfg.imageMode === "repeat" ? "auto" : cfg.imageMode;
                media.style.backgroundRepeat = cfg.imageMode === "repeat" ? "repeat" : "no-repeat";
                media.style.filter = filter;
                media.style.transform = `scale(${scale})`;
            }
            blur.style.backdropFilter = cfg.blur > 0 ? `blur(${cfg.blur}px)` : "none";
            uakApplyPopBg(cfg.popBg);
            uakApplyChatColor(cfg.chatColor);
            uakApplyChatFont(cfg.chatFont);
            uakApplyInputBox(cfg.inputBox);
            uakApplyInputBg(cfg.inputBg);
            uakApplyInputOpacity(cfg.inputBg);
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
            if (typeof document === "undefined" || !document.body) return () => {};
            uakApplyAppearance(uakSettingsStore.getState());
            uakMarkGlassSurfaces();
            let timer = null;
            const observer = typeof MutationObserver === "function" ? new MutationObserver((records) => {
                const added = records.some((record) => record.addedNodes.length > 0);
                if (!added || timer !== null) return;
                timer = setTimeout(() => {
                    timer = null;
                    uakMarkGlassSurfaces();
                    // Reference: watchInputCard; React may recreate the composer on navigation.
                    const cfg = uakSettingsStore.getState();
                    const card = uakFindInputCard();
                    if (card) {
                        if (cfg.inputBg.enabled && !card.classList.contains("uak-input-bg")) uakApplyInputBg(cfg.inputBg);
                        if (cfg.inputBg.inputOpacity < 100 && !card.classList.contains("uak-inputCard")) uakApplyInputOpacity(cfg.inputBg);
                    }
                }, 80);
            }) : null;
            observer.observe(document.body, { childList: true, subtree: true });
            void uakLoadSettings().then(uakApplyAppearance);
            const unsubscribe = uakSettingsStore.subscribe(uakApplyAppearance);
            const videoTimer = setInterval(uakWatchVideo, 2000);
            return () => { observer.disconnect(); if (timer !== null) clearTimeout(timer); clearInterval(videoTimer); unsubscribe(); };
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
