        const STYLE_TAG_ID = "utility-appearance-kit/inline.css";
        /**
         * Install or refresh the plugin stylesheet. The old factory inserted a
         * tag at module-evaluation time, which both violated the slot factory's
         * side-effect contract and kept stale CSS after an in-place HMR update.
         */
        function installStyle() {
            if (typeof document === "undefined") return () => {};
            let tag = document.querySelector(`style[data-plugin-css=${JSON.stringify(STYLE_TAG_ID)}]`);
            if (tag === null) {
                tag = document.createElement("style");
                tag.dataset.plugin = "utility-appearance-kit";
                tag.dataset.pluginCss = STYLE_TAG_ID;
                document.head.appendChild(tag);
            }
            const css = [sliderCss, pricingCss].join("\n");
            if (tag.textContent !== css) tag.textContent = css;
            return () => {
                if (tag.isConnected) tag.remove();
            };
        }

