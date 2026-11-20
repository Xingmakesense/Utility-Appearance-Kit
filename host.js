import { installAppearance } from "./host/appearance.js";
import { installUsageStats } from "./host/usage-route.js";
import { installHolidayCalendar } from "./host/holiday.js";
import { Config, normalizeOptions } from "./host/options.js";
import { recordStatus } from "./host/status.js";

export const name = "utility-appearance-kit";
export const inject = [];
export { Config, normalizeOptions };

export const __test = Object.freeze({
    normalizeOptions
});

export function apply(ctx, config) {
    const normalized = normalizeOptions(config);
    recordStatus("plugin", { phase: "apply" });
    if (normalized.issues !== undefined) {
        recordStatus("plugin", {
            phase: "config-error",
            error: normalized.issues.map((issue) => issue.message).join("; ")
        });
    }
    installHolidayCalendar(ctx);
    installAppearance(ctx);
    installUsageStats(ctx);
}
