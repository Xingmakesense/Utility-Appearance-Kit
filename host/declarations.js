/**
 * Host half of utility-appearance-kit.
 *
 * The client slider can only draw the levels the harness advertises, and the
 * harness only advertises them when the model's route declares
 * `reasoningEfforts`. A hand-written custom route declares nothing, so the
 * slider silently disappears even though the vendor API has a thinking switch.
 *
 * This half reads the profile's `llm-pi-ai` configuration through the official
 * config editor, matches model ids against `capabilities.json`, and adds the
 * missing `reasoningEfforts`. The edit is validated by the editor, applied
 * through the normal Loader path, and rolled back by it on refusal.
 *
 * Two rules keep the declaration honest:
 *
 * 1. Only routes that name their own `baseURL` are touched. A route without one
 *    is resolved entirely by pi-ai's installed catalog, which ships the
 *    endpoint and the exact per-model `thinkingLevelMap` — a finer answer than
 *    any vendor-wide table can be. Overwriting it would strictly remove
 *    choices: the catalog gives `openai/gpt-5.2` xhigh, `zai/glm-5.3` and
 *    `moonshotai/kimi-k3` their max level, and none of them the `off` this
 *    table used to add.
 *
 * 2. The plugin never synthesizes `compat`. A route's wire dialect belongs to
 *    pi-ai's endpoint/protocol detection and the user's explicit config; a
 *    vendor-name prefix or URL substring previously pinned the wrong dialect
 *    for mixed routes and made the result depend on model order.
 *
 * Per-model level sets come from explicit `levelsByModel` rules: official level
 * sets differ inside one family (`qwen3.8-max` offers low/medium/xhigh while
 * `qwen3.6-plus` offers off/minimal/low/medium/high). There is no vendor-wide
 * fallback, because the same prefix also matches non-reasoning text models.
 *
 * Scanning is event-driven, never polling: one pass at DSH startup and one
 * coalesced pass when catalog/settings/configuration changes. A committed model
 * selection is deliberately NOT a trigger: it used to schedule a scan on every
 * switch, and when that scan applied a config edit the Loader could repaint the
 * model selector / window. All configured routes are already covered by the
 * startup and config passes, so the per-selection trigger was redundant risk.
 * A pass reads the in-memory raw config, plans in O(models) and writes only
 * when the plan is non-empty. Content signatures are deliberately not used to
 * suppress scans: an adapter/catalog update can change the report while the raw
 * config stays identical. Unknown families are probed at most twice per scan,
 * with endpoint-scoped TTLs so a transient failure can recover.
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { cachePath, log, recordStatus } from "./status.js";

const TARGET = "@deepseek-ai/dsh-llm-pi-ai";
const BOOT_SCAN_MS = 2_000;          // let the profile finish composing
const CONFIG_SCAN_MS = 1_200;        // settings/catalog reload coalescing
const SCAN_MIN_GAP_MS = 1_500;       // hard floor between non-boot passes
const MODEL_INFO_TIMEOUT_MS = 5_000;
const EDIT_TIMEOUT_MS = 30_000;
const PROBE_TIMEOUT_MS = 15_000;
const NEGATIVE_PROBE_TTL_MS = 6 * 3600 * 1000;
const POSITIVE_PROBE_TTL_MS = 7 * 86400 * 1000;
const PROBE_LIMIT = 2;               // per scan; unknown model verdicts are cached
const PROBE_FILE_MAX = 64_000;       // bytes; pruned to configured routes/models

// A probe proves exactly one thing: this endpoint answered 2xx to a request
// that carried `reasoning_effort: "low"`. Declaring a whole default level set
// from that single 2xx was the source of the "model call failed" reports:
// DSH then sent `medium`/`high` (and `off`) to endpoints that never accepted
// them, so the next real call came back 400. Only the level that was actually
// exercised is ever declared; `off` sends no field at all, so no probe can
// prove it.
const PROBED_LEVELS = ["low"];

// ---------------------------------------------------------------------------
// Capability table
// ---------------------------------------------------------------------------

function loadTable() {
    try {
        return JSON.parse(readFileSync(new URL("../capabilities.json", import.meta.url), "utf8"));
    } catch {
        return { vendors: [] };
    }
}

function vendorFor(modelId, api, table) {
    for (const vendor of table.vendors ?? []) {
        if (vendor.api !== undefined && api !== undefined && vendor.api !== api) continue;
        if (vendor.match === undefined) continue;
        if (!new RegExp(vendor.match, "i").test(modelId)) continue;
        if (vendor.exclude !== undefined && new RegExp(vendor.exclude, "i").test(modelId)) continue;
        return vendor;
    }
    return undefined;
}

function effortsOf(levels, wire) {
    const efforts = {};
    for (const level of levels ?? []) {
        if (typeof level !== "string" || level.length === 0) continue;
        const mapped = wire !== null && typeof wire === "object" ? wire[level] : undefined;
        efforts[level] = typeof mapped === "string" ? mapped : level === "off" ? null : level;
    }
    return efforts;
}

/**
 * The explicit per-model levels one model offers. There is deliberately no
 * vendor-wide fallback: a family prefix such as `^gpt` also matches
 * non-reasoning models (`gpt-4o`, `gpt-4.1`), and declaring levels for those
 * turned a plain chat model into a reasoning model. A model that has no
 * explicit rule is left for DSH's report or the one-off probe.
 *
 * @param {object} vendor matched vendor entry.
 * @param {string} modelId configured model id.
 * @returns {{levels: string[], wire?: Record<string, string>}|undefined}
 */
function levelsRuleFor(vendor, modelId) {
    for (const rule of vendor.levelsByModel ?? []) {
        if (typeof rule?.match !== "string") continue;
        if (!new RegExp(rule.match, "i").test(modelId)) continue;
        if (!Array.isArray(rule.levels) || rule.levels.length === 0) return undefined;
        return { levels: rule.levels, wire: rule.wire };
    }
    return undefined;
}

function withTimeout(label, ms, operation) {
    const controller = new AbortController();
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
            controller.abort();
            reject(new Error(`${label} timed out after ${ms}ms`));
        }, ms);
    });
    return Promise.race([
        Promise.resolve().then(() => operation(controller.signal)),
        timeout
    ]).finally(() => clearTimeout(timer));
}

/**
 * Ask DSH what levels each configured model currently offers.
 *
 * `llm.resolveModelInfo(provider, model)` returns the exact model descriptor
 * the adapter serves, including `reasoning.efforts` — the same list the model
 * picker draws from. A reported model is already selectable without this
 * plugin writing anything, and the report intentionally carries no wire map:
 * copying its ids into `reasoningEfforts` would replace `off:"none"` with
 * `off:null`. Reports therefore mark a model as "already served" and are never
 * turned into declarations.
 *
 * Every failure is soft: a route whose adapter is not registered yet (boot
 * races against llm-pi-ai), or a model the adapter cannot describe, simply
 * contributes nothing and the table fallback decides. A per-call timeout keeps
 * one stuck adapter from freezing the whole engine forever.
 *
 * @param {object} ctx owning Cordis context.
 * @param {object} config current raw `llm-pi-ai` configuration.
 * @returns {Promise<Map<string, {levels: string[]}>>} keyed by `provider/model`.
 */
async function resolveReportedLevels(ctx, config) {
    const reported = new Map();
    const llm = typeof ctx.get === "function" ? ctx.get("llm") : undefined;
    if (llm === undefined || typeof llm.resolveModelInfo !== "function") return reported;

    for (const [routeId, profile] of Object.entries(config.providers ?? {})) {
        if (profile === null || typeof profile !== "object") continue;
        const models = Array.isArray(profile.models) ? profile.models : [];
        for (const model of models) {
            if (typeof model?.id !== "string" || model.id.length === 0) continue;
            // An existing declaration is the user's decision; do not collect it.
            if (model.reasoningEfforts !== undefined) continue;
            try {
                const info = await withTimeout(
                    `resolveModelInfo(${routeId}/${model.id})`,
                    MODEL_INFO_TIMEOUT_MS,
                    (signal) => llm.resolveModelInfo(routeId, model.id, signal)
                );
                const efforts = info?.reasoning?.efforts;
                if (!Array.isArray(efforts) || efforts.length === 0) continue;
                const levels = [];
                for (const effort of efforts) {
                    if (typeof effort?.id === "string" && effort.id.length > 0) levels.push(effort.id);
                }
                if (levels.length === 0) continue;
                reported.set(`${routeId}/${model.id}`, { levels });
            } catch {
                // Not registered yet, not describable, or timed out: the table decides.
            }
        }
    }
    return reported;
}

/**
 * Derive the next `llm-pi-ai` config with missing reasoning declarations added.
 * Pure: no I/O, no mutation of the input.
 *
 * Precedence for one model:
 *
 * 1. an existing `reasoningEfforts` — the user's own decision, never touched;
 * 2. a DSH report — the model is already selectable from the adapter catalog,
 *    so no declaration is written (and no wire mapping can be lost);
 * 3. an explicit per-model capability rule — only for endpoints pi-ai cannot
 *    describe. There is no vendor-wide fallback.
 *
 * Routes naming no `baseURL` are left untouched: pi-ai's installed catalog
 * resolves them from its own endpoint and per-model capability data.
 *
 * The route `compat` block is never synthesized here. The catalog's own
 * dialect follows the endpoint and protocol; guessing it from a model-family
 * prefix or a substring of the URL wrote a wrong switch for kimi-k3/glm and
 * made the result depend on model order. Unrelated compat fields are preserved
 * untouched.
 *
 * @param {unknown} config Current raw `llm-pi-ai` configuration.
 * @param {{vendors: object[]}} [table] Capability table, optionally extended
 *   with vendors confirmed by a probe.
 * @param {Map<string, {levels: string[]}>} [reported] Levels DSH reports, keyed
 *   by `provider/model`.
 * @returns {{ config: Record<string, unknown>, changes: string[], declarations: Array<{routeId: string, modelId: string, reasoningEfforts: Record<string, string|null>}> } | null}
 *   `null` when there is nothing to declare.
 */
export function planDeclarations(config, table = loadTable(), reported = new Map()) {
    if (config === null || typeof config !== "object") return null;
    const providers = config.providers;
    if (providers === null || typeof providers !== "object") return null;

    const next = structuredClone(config);
    const changes = [];
    const declarations = [];

    for (const [routeId, profile] of Object.entries(next.providers)) {
        if (profile === null || typeof profile !== "object") continue;
        // No baseURL: pi-ai's installed catalog owns this route end to end,
        // including a per-model thinkingLevelMap that is strictly richer than
        // this table. Declaring here would take levels away.
        if (profile.baseURL === undefined) continue;
        const models = profile.models;
        if (!Array.isArray(models) || models.length === 0) continue;

        for (const model of models) {
            if (model === null || typeof model !== "object" || typeof model.id !== "string") continue;
            // Any existing value — including `false` — is the user's decision.
            if (model.reasoningEfforts !== undefined) continue;
            // DSH already resolves this model: the picker can draw its levels
            // without an explicit declaration, and its report has no wire map.
            if (reported.has(`${routeId}/${model.id}`)) continue;
            const vendor = vendorFor(model.id, profile.api, table);
            if (vendor === undefined) continue;
            const rule = levelsRuleFor(vendor, model.id);
            if (rule === undefined) continue;
            const efforts = effortsOf(rule.levels, rule.wire);
            if (Object.keys(efforts).length === 0) continue;
            model.reasoningEfforts = efforts;
            changes.push(`${routeId}/${model.id}`);
            declarations.push({
                routeId,
                modelId: model.id,
                reasoningEfforts: structuredClone(efforts)
            });
        }
    }

    return changes.length === 0 ? null : { config: next, changes, declarations };
}

/**
 * Merge a plan into the config read at edit time.
 *
 * `configEditor.edit()` hands back the latest raw config because planning waits
 * on model reports and probes. Writing the stale plan snapshot would overwrite
 * changes made during that wait. Only the planned `reasoningEfforts` fields are
 * copied, and only onto models that still have no explicit declaration.
 *
 * @param {unknown} current latest raw config at edit time.
 * @param {ReturnType<typeof planDeclarations>} plan plan from an earlier pass.
 * @returns {{config: Record<string, unknown>, changes: string[]}|null}
 */
export function applyPlan(current, plan) {
    if (plan === null || typeof plan !== "object" || !Array.isArray(plan.declarations)) return null;
    if (current === null || typeof current !== "object") return null;
    if (current.providers === null || typeof current.providers !== "object") return null;
    const next = structuredClone(current);
    const changes = [];
    for (const declaration of plan.declarations) {
        const profile = next.providers[declaration.routeId];
        if (profile === null || typeof profile !== "object" || !Array.isArray(profile.models)) continue;
        const model = profile.models.find((candidate) => candidate !== null
            && typeof candidate === "object"
            && candidate.id === declaration.modelId);
        if (model === undefined || model.reasoningEfforts !== undefined) continue;
        model.reasoningEfforts = structuredClone(declaration.reasoningEfforts);
        changes.push(`${declaration.routeId}/${declaration.modelId}`);
    }
    return changes.length === 0 ? null : { config: next, changes };
}

// ---------------------------------------------------------------------------
// Probe cache: a tiny local file, pruned to the models this profile configures.
// ---------------------------------------------------------------------------

function readCache() {
    try {
        const parsed = JSON.parse(readFileSync(cachePath(), "utf8"));
        return parsed !== null && typeof parsed === "object" && parsed.entries !== null && typeof parsed.entries === "object"
            ? parsed.entries
            : {};
    } catch {
        return {};
    }
}

function writeCache(entries) {
    try {
        const path = cachePath();
        mkdirSync(dirname(path), { recursive: true });
        const tmp = `${path}.tmp`;
        const body = JSON.stringify({ version: 2, entries }, null, 0);
        writeFileSync(tmp, Buffer.byteLength(body, "utf8") > PROBE_FILE_MAX
            ? JSON.stringify({ version: 2, entries: {} })
            : body, "utf8");
        renameSync(tmp, path);
    } catch {
        // a cache write must never cost the scan
    }
}

/**
 * Cache identity includes the route, protocol, and endpoint. Keying by model id
 * alone let a verdict for one gateway suppress probing the same model id on a
 * different gateway with different capabilities.
 */
function probeKey(routeId, profile, modelId) {
    return JSON.stringify([
        routeId,
        typeof profile?.api === "string" ? profile.api : "",
        typeof profile?.baseURL === "string" ? profile.baseURL : "",
        modelId
    ]);
}

function normalizeProbeEntry(value) {
    if (typeof value === "boolean") return { supported: value, checkedAt: 0 };
    if (value === null || typeof value !== "object" || typeof value.supported !== "boolean") return undefined;
    return {
        supported: value.supported,
        checkedAt: Number.isFinite(value.checkedAt) ? value.checkedAt : 0
    };
}

function probeEntryFresh(entry, now = Date.now()) {
    if (entry === undefined || typeof entry.supported !== "boolean") return false;
    const age = now - entry.checkedAt;
    if (!Number.isFinite(age) || age < 0) return false;
    return age <= (entry.supported ? POSITIVE_PROBE_TTL_MS : NEGATIVE_PROBE_TTL_MS);
}

function configuredProbeKeys(config) {
    const keys = new Set();
    for (const [routeId, profile] of Object.entries(config.providers ?? {})) {
        if (profile === null || typeof profile !== "object") continue;
        for (const model of Array.isArray(profile.models) ? profile.models : []) {
            if (typeof model?.id === "string") keys.add(probeKey(routeId, profile, model.id));
        }
    }
    return keys;
}

// ---------------------------------------------------------------------------
// One-off capability probe: a single max_tokens:1 request per unknown model.
// ---------------------------------------------------------------------------

async function credentialFor(ctx, profile) {
    if (typeof profile?.apiKeyEnv !== "string" || profile.apiKeyEnv.length === 0) return undefined;
    try {
        const { credentialRef } = await import("@deepseek-ai/dsh-credentials");
        const credentials = typeof ctx.get === "function" ? ctx.get("credentials") : undefined;
        const hit = await credentials?.resolve(credentialRef(profile.apiKeyEnv));
        if (typeof hit?.value === "string" && hit.value.length > 0) return hit.value;
    } catch {
        // fall through to the environment
    }
    const fromEnv = process.env[profile.apiKeyEnv];
    return typeof fromEnv === "string" && fromEnv.length > 0 ? fromEnv : undefined;
}

async function probeThinking(profile, modelId, apiKey) {
    const base = typeof profile.baseURL === "string" ? profile.baseURL.replace(/\/+$/, "") : undefined;
    if (base === undefined) return false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
        const response = await fetch(`${base}/chat/completions`, {
            method: "POST",
            headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: modelId,
                messages: [{ role: "user", content: "hi" }],
                max_tokens: 1,
                reasoning_effort: "low"
            }),
            signal: controller.signal
        });
        // A gateway that ignores the field also answers 200; only a hard
        // rejection tells us the model cannot take an effort at all.
        return response.ok;
    } catch {
        return false;
    } finally {
        clearTimeout(timer);
    }
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Cordis activates a plugin (and the timers it schedules) inside the HMR
 * transaction that loaded or reloaded it. `configEditor.edit()` calls
 * `hmr.runExclusive()` and refuses a nested transaction, so a timer created in
 * that context would fail forever with "HMR transactions cannot be nested".
 *
 * The HMR service exposes its AsyncLocalStorage instance, whose `exit()` runs
 * a callback with no active store; use it to detach the scan. Access is
 * defensive because it is not part of the public service signature.
 *
 * @param {object} ctx plugin context
 * @returns {(fn: () => unknown) => unknown} runner that detaches when possible
 */
function detachHmrContext(ctx) {
    try {
        const hmr = typeof ctx.get === "function" ? ctx.get("hmr") : undefined;
        const storage = hmr?.executing;
        if (storage !== undefined && typeof storage.exit === "function") {
            return (fn) => storage.exit(fn);
        }
    } catch {
        // fall through: the edit itself is still wrapped in try/catch
    }
    return (fn) => fn();
}

// ---------------------------------------------------------------------------
// Declaration engine: startup + model switch + config changes, no polling.
// ---------------------------------------------------------------------------

function startDeclarationEngine(ctx, scope, editor) {
    const detached = detachHmrContext(ctx);
    let timer = null;
    let queued = null;
    let running = false;
    let rerun = false;
    let lastScanAt = 0;
    let editRetries = 0;
    let closed = false;

    const run = async (reason) => {
        if (closed) return;
        if (running) {
            rerun = true;
            return;
        }
        running = true;
        lastScanAt = Date.now();
        recordStatus("engine", { phase: "scan", reason });
        try {
            const entry = editor.entries().find((candidate) => candidate?.options?.name === TARGET);
            if (entry === undefined) {
                recordStatus("engine", { phase: "no-entry", reason });
                return;
            }
            const config = entry.options?.config ?? {};

            const table = loadTable();
            const rawCache = readCache();
            const cache = {};
            for (const [key, value] of Object.entries(rawCache)) {
                const normalized = normalizeProbeEntry(value);
                if (normalized !== undefined && probeEntryFresh(normalized)) cache[key] = normalized;
            }
            const kept = {};

            // Ask DSH first. Reported models are already served by the adapter
            // catalog; they are not declarations and carry no wire map.
            const reported = await resolveReportedLevels(ctx, config);

            // Probes cost a (tiny) request. Fresh cache verdicts suppress them;
            // expired negative verdicts are retried on a later scan rather than
            // being pinned for the lifetime of this process. Routes without an
            // endpoint, or with a manually pinned thinking dialect, are never
            // probed with the openai body.
            let probes = 0;
            let probesUsed = 0;
            const extraVendors = [];
            for (const [routeId, profile] of Object.entries(config.providers ?? {})) {
                if (profile === null || typeof profile !== "object") continue;
                if (typeof profile.baseURL !== "string" || profile.baseURL.length === 0) continue;
                if (profile.compat !== null && typeof profile.compat === "object"
                    && typeof profile.compat.thinkingFormat === "string") continue;
                for (const model of Array.isArray(profile.models) ? profile.models : []) {
                    if (typeof model?.id !== "string") continue;
                    if (model.reasoningEfforts !== undefined) continue;
                    if (reported.has(`${routeId}/${model.id}`)) continue;
                    // A known vendor without an explicit rule is either a
                    // non-reasoning model or a model whose levels are not
                    // verified; do not guess, and do not probe it with an
                    // effort field it may simply ignore.
                    if (vendorFor(model.id, profile.api, table) !== undefined) continue;
                    const key = probeKey(routeId, profile, model.id);
                    const cached = cache[key];
                    if (cached !== undefined) {
                        kept[key] = cached;
                        if (cached.supported) {
                            const match = `^${escapeRegExp(model.id)}$`;
                            extraVendors.push({
                                match,
                                levelsByModel: [{ match, levels: PROBED_LEVELS }]
                            });
                        }
                        continue;
                    }
                    if (probesUsed >= PROBE_LIMIT) continue;
                    const apiKey = await credentialFor(ctx, profile);
                    if (apiKey === undefined) continue;
                    probes += 1;
                    probesUsed += 1;
                    const supported = await probeThinking(profile, model.id, apiKey);
                    const verdict = { supported, checkedAt: Date.now() };
                    cache[key] = verdict;
                    kept[key] = verdict;
                    if (supported) {
                        const match = `^${escapeRegExp(model.id)}$`;
                        extraVendors.push({
                            match,
                            levelsByModel: [{ match, levels: PROBED_LEVELS }]
                        });
                    }
                }
            }

            // Keep verdicts for routes/models still configured; drop the rest.
            const stillConfigured = configuredProbeKeys(config);
            const pruned = {};
            for (const [key, value] of Object.entries({ ...cache, ...kept })) {
                if (stillConfigured.has(key)) pruned[key] = value;
            }
            if (JSON.stringify(pruned) !== JSON.stringify(rawCache)) writeCache(pruned);
            if (probes > 0) log(ctx, "info", `probed ${probes} unknown model(s) with a single max_tokens:1 request`);

            const plan = planDeclarations(
                config,
                { vendors: [...(table.vendors ?? []), ...extraVendors] },
                reported
            );
            if (plan === null) {
                editRetries = 0;
                recordStatus("engine", { phase: "clean", reason, reported: reported.size });
                return;
            }
            if (closed) return;

            // Merge into the config as it is at edit time, not into the stale
            // snapshot planning started from.
            const initial = applyPlan(config, plan);
            if (initial === null) {
                recordStatus("engine", { phase: "clean", reason, reported: reported.size });
                return;
            }
            let appliedChanges = [];
            await withTimeout("configEditor.edit", EDIT_TIMEOUT_MS, () => editor.edit(entry, (current) => {
                const merged = applyPlan(current, plan);
                if (merged === null) return current;
                appliedChanges = merged.changes;
                return merged.config;
            }));
            editRetries = 0;
            if (appliedChanges.length === 0) {
                recordStatus("engine", { phase: "clean", reason, reported: reported.size });
                return;
            }
            recordStatus("engine", { phase: "declared", reason, changes: appliedChanges, reported: reported.size });
            log(ctx, "info", `declared reasoning levels for ${appliedChanges.join(", ")} (applied live; refresh the page, no DSH restart needed)`);
        } catch (error) {
            const message = `${error?.message ?? String(error)}`;
            // Installing/updating the plugin performs the edit while the
            // Loader's HMR transaction is still open; configEditor refuses a
            // nested transaction. That is transient, so back off and retry
            // instead of leaving the profile undeclared until a restart.
            if (/HMR transactions cannot be nested/i.test(message) && editRetries < 4) {
                editRetries += 1;
                const retryInMs = 1_500 * editRetries;
                recordStatus("engine", { phase: "hmr-busy", reason, retry: editRetries, retryInMs });
                schedule("retry", retryInMs);
                return;
            }
            recordStatus("engine", { phase: "error", reason, error: message.slice(0, 500) });
            log(ctx, "warn", `reasoning declaration skipped: ${message}`);
        } finally {
            running = false;
            if (rerun && !closed) {
                rerun = false;
                schedule("retry", CONFIG_SCAN_MS);
            }
        }
    };

    function schedule(reason, delay) {
        if (closed) return;
        if (timer !== null) {
            // A pending startup pass must never lose its boot reason just
            // because a config/catalog event arrived first.
            queued = queued === "boot" || reason === "boot" ? "boot" : reason;
            return;
        }
        queued = reason;
        const sinceLast = Date.now() - lastScanAt;
        const wait = reason === "boot" ? delay : Math.max(delay, SCAN_MIN_GAP_MS - sinceLast);
        timer = setTimeout(() => {
            timer = null;
            const next = queued ?? reason;
            queued = null;
            void detached(() => run(next));
        }, wait);
        if (typeof timer.unref === "function") timer.unref();
    }

    const dispose = () => {
        closed = true;
        if (timer !== null) {
            clearTimeout(timer);
            timer = null;
        }
    };
    try {
        if (typeof scope.effect === "function") scope.effect(() => dispose);
        else if (typeof ctx.effect === "function") ctx.effect(() => dispose);
    } catch {
        // dispose is defensive; listeners still belong to the scope
    }

    // Startup pass. `configEditor` is already active here (this scope waited
    // for it), so the two seconds only let the profile finish composing.
    recordStatus("engine", { phase: "scheduled", bootInMs: BOOT_SCAN_MS });
    schedule("boot", BOOT_SCAN_MS);

    // Catalog / settings / configuration changes can add models or routes.
    // There is deliberately no signature short-circuit: an adapter/catalog
    // update can change what DSH reports while the raw profile stays identical.
    scope.on("llm/adapters-updated", () => schedule("adapters", CONFIG_SCAN_MS));
    scope.on("settings/document-updated", () => schedule("config", CONFIG_SCAN_MS));
    scope.on("app-boot/config-reload", () => schedule("config", CONFIG_SCAN_MS));
}

export function installDeclarationEngine(ctx) {
    try {
        recordStatus("engine", { phase: "inject-wait" });
        ctx.inject(["configEditor"], (scope) => {
            try {
                recordStatus("engine", { phase: "injected" });
                startDeclarationEngine(ctx, scope, scope.configEditor);
            } catch (error) {
                recordStatus("engine", { phase: "inject-error", error: `${error?.message ?? String(error)}`.slice(0, 500) });
                log(ctx, "warn", `reasoning declaration disabled: ${error?.message ?? String(error)}`);
            }
        });
    } catch (error) {
        recordStatus("engine", { phase: "inject-error", error: `${error?.message ?? String(error)}`.slice(0, 500) });
        log(ctx, "warn", `reasoning declaration unavailable: ${error?.message ?? String(error)}`);
    }
}

export const declarationTest = Object.freeze({
    withTimeout,
    probeKey,
    normalizeProbeEntry,
    probeEntryFresh,
    configuredProbeKeys
});
