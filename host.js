import { installDeclarationEngine } from "./host/declarations.js";
import { installHolidayCalendar } from "./host/holiday.js";
import { Config, normalizeOptions } from "./host/options.js";
import { declarationTest } from "./host/declarations.js";
import { recordStatus } from "./host/status.js";

export const name = "utility-appearance-kit";
export const inject = [];
export { Config, normalizeOptions };
export { planDeclarations, applyPlan } from "./host/declarations.js";

export const __test = Object.freeze({
    ...declarationTest,
    normalizeOptions
});

export function apply(ctx, config) {
    const normalized = normalizeOptions(config);
    recordStatus("plugin", { phase: "apply" });
    if (normalized.issues !== undefined) {
        recordStatus("engine", {
            phase: "config-error",
            error: normalized.issues.map((issue) => issue.message).join("; ")
        });
    } else if (normalized.value.declarations === "off") {
        recordStatus("engine", { phase: "declarations-disabled" });
    } else {
        installDeclarationEngine(ctx);
    }
    installHolidayCalendar(ctx);
}
