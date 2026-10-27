        const DEFAULT_OPTIONS = Object.freeze({ declarations: "auto", slider: true });

        function normalizeOptions(config) {
            if (config === undefined || config === null) return { value: { ...DEFAULT_OPTIONS } };
            if (typeof config !== "object" || Array.isArray(config)) {
                return { issues: [{ message: "plugin config must be an object" }] };
            }
            const declarations = config.declarations ?? "auto";
            const slider = config.slider ?? true;
            const issues = [];
            if (declarations !== "auto" && declarations !== "off") {
                issues.push({ message: 'declarations must be "auto" or "off"' });
            }
            if (typeof slider !== "boolean") issues.push({ message: "slider must be a boolean" });
            if (issues.length > 0) return { issues };
            return { value: { ...config, declarations, slider } };
        }
