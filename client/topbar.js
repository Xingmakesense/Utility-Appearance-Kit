        // -------------------------------------------------------------------
        // Desktop caption-menu additions.
        //
        // On Windows the "应用 / 编辑" bar is a preload-owned shadow root
        // (`[data-windows-menu]`), not a web-client slot. The settings and
        // feedback entries otherwise live behind the sidebar avatar menu, so
        // append them as text into that open shadow root, right of 编辑.
        // The code is deliberately defensive: a future shell without the host
        // or with a closed shadow root simply skips this enhancement.
        // -------------------------------------------------------------------
        const CONTACT_FORM_URL = "https://trtgsjkv6r.feishu.cn/share/base/form/shrcnlCoGElW7MQznGy9r3YYXcg?hide_uid=1&hide_device_info=1&hide_harness_version=1";
        let settingsOpenedAt = 0;

        function findSettingsTrigger() {
            const dialogs = Array.from(document.querySelectorAll('button[aria-haspopup="dialog"][aria-expanded]'));
            const exact = dialogs.find((button) => /^(设置|Settings)$/i.test((button.getAttribute("aria-label") ?? "").trim()));
            if (exact !== undefined) return exact;
            const byClass = dialogs.find((button) => /(^|\s)\S*_trigger(\s|$)/.test(button.className));
            if (byClass !== undefined) return byClass;
            return document.querySelector('button[class*="wCInkW_trigger"]');
        }

        function pressSettingsShortcut() {
            for (const target of [document, window]) {
                try {
                    target.dispatchEvent(new KeyboardEvent("keydown", {
                        key: ",",
                        code: "Comma",
                        ctrlKey: true,
                        bubbles: true,
                        cancelable: true
                    }));
                } catch {
                    // ignore
                }
            }
        }

        function openSettingsFromTopBar() {
            const now = Date.now();
            if (now - settingsOpenedAt < 900) return true;
            settingsOpenedAt = now;
            try {
                // Reuse the exact avatar menu entry: it is the same
                // `openSettings()` action as the secondary menu, so the panel
                // cannot diverge from the sidebar path.
                const avatar = Array.from(document.querySelectorAll('button[aria-haspopup="menu"][aria-expanded]'))
                    .find((button) => /^(账号菜单|Account menu)$/i.test((button.getAttribute("aria-label") ?? "").trim())
                        || /AccountMenu/i.test(button.className));
                if (avatar !== undefined) {
                    if (avatar.getAttribute("aria-expanded") !== "true") avatar.click();
                    setTimeout(() => {
                        try {
                            const item = Array.from(document.querySelectorAll('[role="menuitem"]'))
                                .find((element) => {
                                    const text = (element.textContent ?? "").trim();
                                    return text.startsWith("设置") || text.startsWith("Settings");
                                });
                            if (item !== undefined) {
                                item.click();
                                return;
                            }
                            document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
                            const trigger = findSettingsTrigger();
                            if (trigger !== null) trigger.click();
                            else pressSettingsShortcut();
                        } catch {
                            // ignore
                        }
                    }, 120);
                    return true;
                }
                const trigger = findSettingsTrigger();
                if (trigger !== null) {
                    trigger.click();
                    return true;
                }
                pressSettingsShortcut();
                return true;
            } catch {
                // fall through
            }
            return false;
        }

        function openFeedbackFromTopBar() {
            try {
                const url = new URL(CONTACT_FORM_URL);
                const ratio = Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio : 1;
                const width = Math.round((window.screen?.width ?? 0) * ratio);
                const height = Math.round((window.screen?.height ?? 0) * ratio);
                const info = [navigator.userAgent];
                if (width > 0 && height > 0) info.push(`screen_resolution=${width}x${height}`);
                url.searchParams.set("hide_device_info", "1");
                url.searchParams.set("prefill_device_info", info.join("; "));
                window.open(url.href, "_blank", "noopener,noreferrer");
                return true;
            } catch {
                return false;
            }
        }

        function installTopBarActions() {
            if (typeof document === "undefined") return () => {};
            if (typeof globalThis.dshDesktop === "undefined") return () => {};
            const timers = [];
            let mounted;
            const cleanup = () => {
                for (const timer of timers) clearTimeout(timer);
                timers.length = 0;
                if (mounted !== undefined) {
                    mounted.tools.remove();
                    mounted.style.remove();
                    mounted = undefined;
                }
            };
            const mount = () => {
                if (mounted !== undefined) return true;
                const host = document.querySelector("[data-windows-menu]");
                const root = host?.shadowRoot;
                if (root === null || root === undefined) return false;
                if (root.querySelector("[data-dsh-uak-topbar]") !== null) return true;
                const style = document.createElement("style");
                style.textContent = `
                    .dsh-uak-topbar { display: flex; align-items: center; gap: 2px; height: 28px;
                        margin-left: 10px; padding-left: 10px; border-left: 1px solid var(--dsw-alias-border-l2); }
                    .dsh-uak-topbar button { box-sizing: border-box; height: 28px; padding: 0 10px;
                        border: 0; border-radius: 6px; background: transparent;
                        color: var(--dsw-alias-label-secondary); font: inherit; font-size: 14px; cursor: pointer; }
                    .dsh-uak-topbar button:hover { background: var(--dsw-alias-interactive-bg-hover);
                        color: var(--dsw-alias-label-primary); }
                    .dsh-uak-topbar button:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary);
                        outline-offset: -2px; }
                `;
                const tools = document.createElement("div");
                tools.className = "dsh-uak-topbar";
                tools.dataset.dshEslTopbar = "1";
                const zh = (document.documentElement.lang || "").toLowerCase().startsWith("zh");
                const button = (label, action) => {
                    const element = document.createElement("button");
                    element.type = "button";
                    element.textContent = label;
                    element.addEventListener("click", action);
                    return element;
                };
                tools.append(
                    button(zh ? "设置" : "Settings", openSettingsFromTopBar),
                    button(zh ? "意见反馈" : "Feedback", openFeedbackFromTopBar)
                );
                root.append(style, tools);
                mounted = { style, tools };
                return true;
            };
            if (mount()) return cleanup;
            // Two bounded retries replace the old body MutationObserver: the
            // preload host is already present in practice, and a long-lived
            // observer is unnecessary task-time work.
            for (const delay of [120, 700]) {
                timers.push(setTimeout(() => {
                    if (mounted === undefined) mount();
                }, delay));
            }
            return cleanup;
        }

