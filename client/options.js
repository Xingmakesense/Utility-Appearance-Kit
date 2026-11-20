        const DEFAULT_OPTIONS = Object.freeze({ slider: true });

        /**
         * Normalize the browser half's config. The removed `declarations`
         * switch is dropped for compatibility with profiles that still carry
         * it; `slider` is the only remaining option.
         */
        function normalizeOptions(config) {
            if (config === undefined || config === null) return { value: { ...DEFAULT_OPTIONS } };
            if (typeof config !== "object" || Array.isArray(config)) {
                return { issues: [{ message: "plugin config must be an object" }] };
            }
            const slider = config.slider ?? true;
            const issues = [];
            if (typeof slider !== "boolean") issues.push({ message: "slider must be a boolean" });
            if (issues.length > 0) return { issues };
            const value = { ...config, slider };
            delete value.declarations;
            return { value };
        }
