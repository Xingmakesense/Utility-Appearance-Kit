import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/** Absolute path of the per-profile diagnostic breadcrumb. */
export function statusPath() {
    const base = process.env.DSH_PROFILE_DIR ?? join(homedir(), ".dsh", "profiles", process.env.DSH_PROFILE ?? "desktop");
    return join(base, ".utility-appearance-kit", "status.json");
}

/**
 * Tiny diagnostic breadcrumb in the profile (`<profile>/.utility-appearance-kit/status.json`).
 * Plugin and calendar diagnostics live under separate keys so a later holiday
 * refresh cannot erase the plugin's last phase.
 *
 * @param {"plugin"|"holiday"} scope diagnostic producer.
 * @param {Record<string, unknown>} patch fields to merge into that scope.
 */
export function recordStatus(scope, patch) {
    try {
        const path = statusPath();
        mkdirSync(dirname(path), { recursive: true });
        let previous = {};
        try {
            const parsed = JSON.parse(readFileSync(path, "utf8"));
            if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) previous = parsed;
        } catch {
            // first write
        }
        const at = Date.now();
        // The declaration engine is gone; a profile upgraded from 2.6.x still
        // carries its last engine scope. Drop it instead of publishing a stale
        // phase forever.
        delete previous.engine;
        const body = JSON.stringify({
            ...previous,
            ...patch,
            [scope]: { ...patch, at, pid: process.pid },
            at,
            pid: process.pid
        });
        const tmp = `${path}.tmp`;
        writeFileSync(tmp, body, "utf8");
        renameSync(tmp, path);
    } catch {
        // diagnostics must never cost the plugin
    }
}

export function log(ctx, level, message) {
    const logger = ctx.logger;
    const write = logger?.[level];
    if (typeof write === "function") {
        try {
            write.call(logger, `utility-appearance-kit: ${message}`);
            return;
        } catch {
            // fall through to silence
        }
    }
    if (level === "warn") console.warn(`utility-appearance-kit: ${message}`);
}
