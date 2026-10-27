import { holidayPayload, loadHolidayStore, refreshHolidays } from "../holiday-calendar.js";
import { log, recordStatus } from "./status.js";

function sendHolidayJson(req, res) {
    if (req.method !== "GET" && req.method !== "HEAD") {
        res.writeHead(405, { allow: "GET, HEAD" });
        res.end();
        return;
    }
    let body;
    try {
        body = Buffer.from(JSON.stringify(holidayPayload(loadHolidayStore())), "utf8");
    } catch {
        res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        res.end("holiday calendar unavailable");
        return;
    }
    res.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "content-length": body.length
    });
    res.end(req.method === "HEAD" ? undefined : body);
}

export function installHolidayCalendar(ctx) {
    const route = {
        kind: "exact",
        path: "/utility-appearance-kit/holidays.json",
        handler: sendHolidayJson
    };
    try {
        ctx.inject(["webServer"], (scope) => {
            try {
                if (typeof scope.effect === "function") {
                    scope.effect(() => scope.webServer.register(route));
                } else {
                    scope.webServer.register(route);
                }
                recordStatus("holiday", { phase: "route-ready" });
            } catch (error) {
                recordStatus("holiday", { phase: "route-error", error: `${error?.message ?? String(error)}`.slice(0, 500) });
                log(ctx, "warn", `holiday calendar route unavailable: ${error?.message ?? String(error)}`);
            }
        });
    } catch (error) {
        recordStatus("holiday", { phase: "route-error", error: `${error?.message ?? String(error)}`.slice(0, 500) });
        log(ctx, "warn", `holiday calendar route disabled: ${error?.message ?? String(error)}`);
    }

    // A long-running Harness crosses month boundaries without restarting, and
    // an offline attempt must be retried after the 20h cooldown. One cheap
    // check every six hours calls refreshHolidays(), whose own month/attempt
    // guards decide whether any network request is needed.
    let timer = null;
    let running = false;
    let closed = false;
    const CHECK_MS = 6 * 3600 * 1000;
    const arm = (delay) => {
        if (closed) return;
        timer = setTimeout(() => {
            timer = null;
            if (closed || running) return arm(CHECK_MS);
            running = true;
            void refreshHolidays({ log: (message) => log(ctx, "info", message) })
                .then(({ changed, skipped, failedYears }) => recordStatus("holiday", {
                    phase: "calendar",
                    changed,
                    skipped,
                    ...(Array.isArray(failedYears) && failedYears.length > 0 ? { failedYears } : {})
                }))
                .catch((error) => recordStatus("holiday", {
                    phase: "calendar-error",
                    error: `${error?.message ?? String(error)}`.slice(0, 500)
                }))
                .finally(() => {
                    running = false;
                    arm(CHECK_MS);
                });
        }, delay);
        if (typeof timer.unref === "function") timer.unref();
    };
    const dispose = () => {
        closed = true;
        if (timer !== null) {
            clearTimeout(timer);
            timer = null;
        }
    };
    try {
        if (typeof ctx.effect === "function") ctx.effect(() => dispose);
    } catch {
        // cleanup remains best-effort for a plain mock context
    }
    arm(2_500);
}
