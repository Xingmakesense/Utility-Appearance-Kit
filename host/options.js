const DEFAULT_OPTIONS = Object.freeze({ slider: true });

/**
 * Normalize the plugin's bundle-row config.
 *
 * The old `declarations` switch controlled the removed declaration engine.
 * It is dropped instead of rejected so an upgraded profile that still carries
 * it keeps loading; the remaining switch is `slider`.
 *
 * @param {unknown} config raw bundle-row config.
 * @returns {{ value?: { slider: boolean }, issues?: Array<{ message: string }> }}
 */
export function normalizeOptions(config) {
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

export const Config = {
    "~standard": {
        version: 1,
        vendor: "utility-appearance-kit",
        validate: normalizeOptions
    }
};
