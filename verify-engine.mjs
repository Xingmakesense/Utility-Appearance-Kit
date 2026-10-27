// Local end-to-end check of the declaration engine with a fake Cordis scope.
// It also proves that a config change made while the adapter is being queried
// is merged into the edit instead of being overwritten by the stale snapshot.
// Run with `node verify-engine.mjs`.
import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const profile = join(process.cwd(), "tmp", "engine-profile");
rmSync(profile, { recursive: true, force: true });
process.env.DSH_PROFILE_DIR = profile;

let hmrExits = 0;
let latestConfig = {
    providers: {
        qwen: {
            api: "openai-completions",
            // A custom route: the engine only declares routes that name their
            // own endpoint. Catalog routes are left to pi-ai on purpose.
            baseURL: "https://example.com/v1",
            models: [{ id: "qwen3.8-max" }, { id: "qwen-image-3.0-pro" }]
        }
    }
};
const entry = { options: { name: "@deepseek-ai/dsh-llm-pi-ai", config: latestConfig } };
let resolveEdit;
const edited = new Promise((resolve) => {
    resolveEdit = resolve;
});
let entryReads = 0;
let editCalls = 0;

const editor = {
    entries: () => {
        entryReads += 1;
        return [entry];
    },
    async edit(target, change) {
        editCalls += 1;
        if (hmrExits < 1) throw new Error("the edit must run outside the HMR transaction");
        const next = change(target.options.config);
        assert.ok(next !== undefined, "change() must return a config");
        target.options.config = next;
        const compat = next.providers.qwen.compat;
        const efforts = next.providers.qwen.models[0].reasoningEfforts;
        assert.equal(compat?.thinkingFormat, undefined, "a plain gateway must not gain a dialect");
        assert.deepEqual(efforts, { low: "low", medium: "medium", xhigh: "xhigh" });
        assert.equal(next.providers.concurrent?.apiKeyEnv, "CONCURRENT",
            "a route added while the model report was pending must survive the edit");
        assert.equal(next.providers.qwen.models.find((model) => model.id === "qwen-image-3.0-pro").reasoningEfforts,
            undefined, "an image model must stay untouched");
        resolveEdit(next);
    }
};

const listeners = new Map();
const on = (name, fn) => {
    if (!listeners.has(name)) listeners.set(name, []);
    listeners.get(name).push(fn);
    return () => {};
};
const child = { configEditor: editor, on, effect: (fn) => fn() };
const web = {
    register(route) {
        if (route.path !== "/utility-appearance-kit/holidays.json") throw new Error("unexpected holiday route");
        return () => {};
    }
};
let mutated = false;
const llm = {
    async resolveModelInfo() {
        // A user/config reload while the adapter is being queried. The engine
        // must plan against its old snapshot but apply into this new object.
        if (!mutated) {
            mutated = true;
            await new Promise((resolve) => setTimeout(resolve, 150));
            const concurrent = {
                ...structuredClone(latestConfig),
                providers: {
                    ...structuredClone(latestConfig.providers),
                    concurrent: { apiKeyEnv: "CONCURRENT", models: [] }
                }
            };
            latestConfig = concurrent;
            entry.options.config = concurrent;
        }
        return { reasoning: undefined };
    }
};
const ctx = {
    logger: console,
    on,
    effect: (fn) => fn(),
    get: (name) => {
        if (name === "llm") return llm;
        if (name === "hmr") {
            return {
                executing: {
                    exit(fn) {
                        hmrExits += 1;
                        return fn();
                    }
                }
            };
        }
        return undefined;
    },
    inject: (services, callback) => {
        if (services.includes("webServer")) {
            callback({ ...child, webServer: web, effect: (fn) => fn() });
            return { dispose: () => {} };
        }
        assert.ok(services.includes("configEditor"), "engine must wait for configEditor");
        callback(child);
        return { dispose: () => {} };
    }
};

const failureTimer = setTimeout(() => {
    console.error("declaration engine did not complete within 6s");
    process.exit(1);
}, 6_000);

const { apply } = await import("./host.js");
apply(ctx, {});

await Promise.race([
    edited,
    new Promise((_, reject) => setTimeout(() => reject(new Error("engine edit timed out")), 5_000))
]);
await new Promise((resolve) => setTimeout(resolve, 100));
const status = JSON.parse(readFileSync(join(profile, ".utility-appearance-kit", "status.json"), "utf8"));
assert.equal(status.engine?.phase, "declared", "the scoped status must record a completed declaration");
assert.equal(status.engine?.reported, 0, "this fake adapter reports no levels");
assert.equal(status.holiday?.phase, "route-ready", "holiday status must not erase the engine status");

// Native DSH owns custom efforts in off mode. The Host must stop before even
// reading configEditor entries, while the holiday route remains available.
const readsBeforeOff = entryReads;
const editsBeforeOff = editCalls;
apply(ctx, { declarations: "off" });
const disabledStatus = JSON.parse(readFileSync(join(profile, ".utility-appearance-kit", "status.json"), "utf8"));
assert.equal(disabledStatus.engine?.phase, "declarations-disabled");
assert.equal(entryReads, readsBeforeOff, "off mode must not read configEditor entries");
assert.equal(editCalls, editsBeforeOff, "off mode must not edit the profile");
assert.equal(disabledStatus.holiday?.phase, "route-ready", "off mode must keep the holiday route");
clearTimeout(failureTimer);
console.log("engine edit ok", JSON.stringify({
    efforts: entry.options.config.providers.qwen.models[0].reasoningEfforts,
    concurrent: entry.options.config.providers.concurrent.apiKeyEnv,
    status: { engine: status.engine.phase, holiday: status.holiday.phase },
    off: { entryReads, editCalls, phase: disabledStatus.engine.phase }
}));
process.exit(0);
