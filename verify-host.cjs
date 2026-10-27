// Host-half checks: the declaration planner must be pure, additive, and must
// never synthesize wire semantics it cannot know. Run with `node verify-host.cjs`.
const assert = (condition, message) => {
    if (!condition) throw new Error(message);
};
const same = (actual, expected, message) => {
    const a = JSON.stringify(actual);
    const b = JSON.stringify(expected);
    if (a !== b) throw new Error(`${message}
  actual:   ${a}
  expected: ${b}`);
};

const realConfig = () => ({
    providers: {
        "qwen-k3": {
            displayName: "Kimi K3",
            apiKeyEnv: "QWEN_K3_API_KEY",
            api: "openai-completions",
            baseURL: "https://example.com/v1",
            models: [{ id: "kimi-k3", name: "kimi-k3", input: ["text", "image"] }]
        },
        qwen: {
            displayName: "qwen-3.8",
            apiKeyEnv: "QWEN_API_KEY",
            api: "openai-completions",
            baseURL: "https://example.com/v1",
            models: [
                { id: "qwen3.8-max-0902", name: "qwen3.8-max-0902" },
                { id: "qwen3.8-flash", name: "qwen3.8-flash" },
                { id: "qwen-image-3.0-pro", name: "qwen-image-3.0-pro" },
                { id: "qwen3.8-max", name: "qwen3.8-max" }
            ]
        }
    }
});

async function main() {
    const { planDeclarations, applyPlan, __test } = await import("./host.js");

    // A. Explicit per-model rules fill the custom routes; unrelated models and
    //    image models are untouched; the input is never mutated.
    {
        const before = realConfig();
        const plan = planDeclarations(before);
        assert(plan !== null, "the planner must find work");
        assert(JSON.stringify(before) === JSON.stringify(realConfig()), "the planner must not mutate its input");

        const qwen = plan.config.providers.qwen;
        assert(qwen.compat === undefined, "the planner must not synthesize a route dialect");
        for (const id of ["qwen3.8-max", "qwen3.8-max-0902", "qwen3.8-flash"]) {
            const model = qwen.models.find((candidate) => candidate.id === id);
            same(model.reasoningEfforts,
                { low: "low", medium: "medium", xhigh: "xhigh" },
                `${id} must offer the catalog's qwen3.8 levels`);
        }
        assert(qwen.models.find((candidate) => candidate.id === "qwen-image-3.0-pro").reasoningEfforts === undefined,
            "image models must not be declared");
        same(plan.config.providers["qwen-k3"].models[0].reasoningEfforts,
            { low: "low", high: "high", max: "max" },
            "kimi-k3 offers low/high/max");
        assert(plan.changes.length === 4, `expected 4 declarations, got ${plan.changes.length}`);
        assert(plan.declarations.length === 4, "every change must carry structured data for applyPlan");

        assert(planDeclarations(plan.config) === null, "a planned config must be a fixed point");
        assert(planDeclarations(realConfig()) !== null, "a fresh copy must plan again");
    }

    // B. Existing declarations and unrelated compat are user state.
    {
        const optedOut = realConfig();
        optedOut.providers.qwen.models[0].reasoningEfforts = false;
        optedOut.providers.qwen.compat = { supportsStore: false, thinkingFormat: "qwen" };
        const plan = planDeclarations(optedOut);
        assert(plan !== null, "the other models still need declarations");
        assert(plan.config.providers.qwen.models[0].reasoningEfforts === false,
            "an explicit reasoningEfforts:false must survive");
        assert(!plan.changes.includes("qwen/qwen3.8-max-0902"), "an opted-out model must not be rewritten");
        same(plan.config.providers.qwen.compat, { supportsStore: false, thinkingFormat: "qwen" },
            "route compat must survive byte for byte, even when levels are added");
        assert(plan.changes.includes("qwen/qwen3.8-max"),
            "an unrelated compat switch must not block declarations for other models");
    }

    // C. Route shapes: catalog routes, mixed families, unknown models, and
    //    non-reasoning text models must not be guessed.
    {
        assert(planDeclarations({ providers: { google: { apiKeyEnv: "X" } } }) === null,
            "a catalog route has no model list to edit");
        const mixed = planDeclarations({ providers: { mixed: {
            api: "openai-completions",
            baseURL: "https://example.com/v1",
            models: [{ id: "qwen3.8-max" }, { id: "kimi-k3" }]
        } } });
        assert(mixed !== null && mixed.changes.length === 2, "mixed families may share a route");
        assert(mixed.config.providers.mixed.compat === undefined, "no route dialect may be inferred");
        assert(planDeclarations({ providers: { custom: {
            api: "openai-completions",
            baseURL: "https://example.com/v1",
            models: [{ id: "acme-think-1" }]
        } } }) === null, "unknown model families must not be guessed");
        for (const id of ["gpt-4o", "gpt-4.1", "qwen2.5-72b-instruct"]) {
            assert(planDeclarations({ providers: { gw: {
                api: "openai-completions",
                baseURL: "https://example.com/v1",
                models: [{ id }]
            } } }) === null, `${id} must not become a reasoning model`);
        }
        assert(planDeclarations(undefined) === null && planDeclarations({}) === null,
            "empty configs must be safe");
    }

    // D. Per-model level sets and wire values.
    {
        const cfg = { providers: { gw: {
            api: "openai-completions",
            baseURL: "https://example.com/v1",
            models: [{ id: "glm-5.2" }, { id: "glm-5.3" }, { id: "kimi-k3" }, { id: "qwen3.8-max" }, { id: "gpt-5.6-sol" }]
        } } };
        const plan = planDeclarations(cfg);
        const of = (id) => plan.config.providers.gw.models.find((model) => model.id === id).reasoningEfforts;
        same(of("glm-5.2"), { off: "none", high: "high", max: "max" },
            "glm-5.2 off must carry its real wire value");
        same(of("glm-5.3"), { low: "low", high: "high", max: "max" });
        same(of("kimi-k3"), { low: "low", high: "high", max: "max" });
        same(of("qwen3.8-max"), { low: "low", medium: "medium", xhigh: "xhigh" });
        same(of("gpt-5.6-sol"),
            { off: "none", low: "low", medium: "medium", high: "high", xhigh: "xhigh", max: "max" });
    }

    // E. DSH reports mean "already served", not "copy these ids as wire
    //    values". A report carries no thinkingLevelMap, so writing it would
    //    change off:"none" into off:null and shrink/adjust levels.
    {
        const cfg = () => ({ providers: { gw: {
            api: "openai-completions",
            baseURL: "https://example.com/v1",
            models: [{ id: "qwen3.8-max" }, { id: "glm-5.2" }, { id: "acme-think-1" }]
        } } });
        const reported = new Map([
            ["gw/qwen3.8-max", { levels: ["minimal", "high"] }],
            ["gw/acme-think-1", { levels: ["low", "medium", "high", "max"] }]
        ]);
        const plan = planDeclarations(cfg(), undefined, reported);
        assert(plan !== null, "the unreported glm model still needs a table declaration");
        assert(!plan.changes.includes("gw/qwen3.8-max"), "a reported model must not be rewritten");
        assert(!plan.changes.includes("gw/acme-think-1"), "a reported unknown model is already served");
        assert(plan.config.providers.gw.models.find((model) => model.id === "qwen3.8-max").reasoningEfforts === undefined,
            "the report must never become an explicit wire map");
        same(plan.config.providers.gw.models.find((model) => model.id === "glm-5.2").reasoningEfforts,
            { off: "none", high: "high", max: "max" },
            "an unreported model keeps its table wire value");
    }

    // F. A probe-confirmed unknown model can be planned with an extended table.
    {
        const cfg = () => ({ providers: { gw: {
            api: "openai-completions",
            baseURL: "https://example.com/v1",
            models: [{ id: "acme-think-1" }]
        } } });
        assert(planDeclarations(cfg()) === null, "unknown families must not be guessed");
        const plan = planDeclarations(cfg(), {
            vendors: [{
                match: "^acme-think-1$",
                levelsByModel: [{ match: "^acme-think-1$", levels: ["low"] }]
            }]
        });
        assert(plan !== null && plan.changes[0] === "gw/acme-think-1", "a probe-confirmed model must be declared");
        same(plan.config.providers.gw.models[0].reasoningEfforts, { low: "low" });
        assert(plan.config.providers.gw.compat === undefined, "a probe must not invent a dialect");
    }

    // G. A custom route with the catalog's own host keeps user compat and gets
    //    no synthesized thinkingFormat. A lookalike host does not change that.
    {
        const official = { providers: {
            zhipu: { api: "openai-completions", baseURL: "https://api.z.ai/api/coding/paas/v4", models: [{ id: "glm-5.3" }] },
            kimi: { api: "openai-completions", baseURL: "https://api.moonshot.ai/v1", models: [{ id: "kimi-k3" }] },
            lookalike: { api: "openai-completions", baseURL: "https://api.z.ai.example.com/v1", models: [{ id: "glm-5.3" }] }
        } };
        const plan = planDeclarations(official);
        for (const route of ["zhipu", "kimi", "lookalike"]) {
            assert(plan.config.providers[route].compat === undefined, `${route} must not gain a synthesized dialect`);
        }
        const userCompat = planDeclarations({ providers: { custom: {
            api: "openai-completions",
            baseURL: "https://example.com/v1",
            compat: { thinkingFormat: "deepseek", supportsReasoningEffort: false },
            models: [{ id: "glm-5.3" }]
        } } });
        same(userCompat.config.providers.custom.compat,
            { thinkingFormat: "deepseek", supportsReasoningEffort: false },
            "user-declared compat must survive");
    }

    // H. Model order cannot change the planned output.
    {
        const base = (ids) => ({ providers: { gw: {
            api: "openai-completions",
            baseURL: "https://api.z.ai/api/coding/paas/v4",
            models: ids.map((id) => ({ id }))
        } } });
        const forward = planDeclarations(base(["qwen3.8-max", "glm-5.3"]));
        const reverse = planDeclarations(base(["glm-5.3", "qwen3.8-max"]));
        assert(forward.config.providers.gw.compat === undefined && reverse.config.providers.gw.compat === undefined,
            "neither order may synthesize a route dialect");
        same(forward.config.providers.gw.models.find((model) => model.id === "glm-5.3").reasoningEfforts,
            reverse.config.providers.gw.models.find((model) => model.id === "glm-5.3").reasoningEfforts,
            "the same model must get the same levels in either order");
    }

    // I. applyPlan merges into the config at edit time, never overwrites a
    //    declaration the user added while the scan was awaiting the adapter.
    {
        const cfg = realConfig();
        const plan = planDeclarations(cfg);
        assert(plan !== null);
        const edited = realConfig();
        edited.providers.qwen.models.find((model) => model.id === "qwen3.8-max").reasoningEfforts =
            { low: "low", high: "high" };
        edited.providers.extra = { apiKeyEnv: "EXTRA" };
        const applied = applyPlan(edited, plan);
        assert(applied !== null, "the untouched models still need declarations");
        same(applied.config.providers.qwen.models.find((model) => model.id === "qwen3.8-max").reasoningEfforts,
            { low: "low", high: "high" }, "the concurrent user declaration must win");
        assert(applied.config.providers.extra !== undefined, "unrelated concurrent changes must survive");
        assert(!applied.changes.includes("qwen/qwen3.8-max"), "the overwritten model must not be reported as written");

        const allDone = structuredClone(edited);
        allDone.providers.qwen.models.find((model) => model.id === "qwen3.8-max-0902").reasoningEfforts = true;
        assert(applyPlan(allDone, plan) !== null, "other models may still be pending");
        const none = structuredClone(plan.config);
        assert(applyPlan(none, plan) === null, "a fully declared config is a no-op");
        assert(applyPlan(undefined, plan) === null, "missing current config must be safe");
    }

    // J. Probe cache identity/TTL and the model-report timeout.
    {
        const profile = { api: "openai-completions", baseURL: "https://a.example/v1" };
        const sameIdOtherRoute = { api: "openai-completions", baseURL: "https://b.example/v1" };
        assert(__test.probeKey("a", profile, "m") !== __test.probeKey("b", profile, "m"),
            "different routes must not share a probe verdict");
        assert(__test.probeKey("a", profile, "m") !== __test.probeKey("a", sameIdOtherRoute, "m"),
            "different endpoints on one route name must not share a verdict");
        assert(__test.probeKey("a", profile, "m") === __test.probeKey("a", { ...profile }, "m"),
            "the same route/api/endpoint/model must be a stable key");

        const now = Date.now();
        assert(__test.probeEntryFresh({ supported: false, checkedAt: now - 60_000 }) === true,
            "a fresh negative verdict suppresses redundant probes");
        assert(__test.probeEntryFresh({ supported: false, checkedAt: now - 7 * 3600_000 }) === false,
            "a negative verdict must expire");
        assert(__test.probeEntryFresh({ supported: true, checkedAt: now - 24 * 3600_000 }) === true,
            "a positive verdict stays usable for a week");
        assert(__test.probeEntryFresh({ supported: true, checkedAt: now - 8 * 86400_000 }) === false,
            "a positive verdict must eventually be revalidated");
        assert(__test.probeEntryFresh(__test.normalizeProbeEntry(false)) === false,
            "legacy boolean cache entries must be reprobed");

        let settled = false;
        const started = Date.now();
        try {
            await __test.withTimeout("stuck adapter", 20, () => new Promise(() => {}));
        } catch (error) {
            settled = true;
            assert(/timed out/.test(String(error.message)), "the timeout error must be descriptive");
        }
        assert(settled === true, "an unresolved model report must time out");
        assert(Date.now() - started < 1_000, "the timeout must fire promptly");
    }

    // K. Public compatibility options: native DSH can opt out of all writes,
    //    while malformed values are rejected instead of silently enabling work.
    {
        same(__test.normalizeOptions(undefined).value,
            { declarations: "auto", slider: true }, "default options must preserve current behavior");
        same(__test.normalizeOptions({ declarations: "off", slider: false }).value,
            { declarations: "off", slider: false }, "native-only options must round-trip");
        same(__test.normalizeOptions({ declarations: "auto", slider: true, future: 1 }).value,
            { declarations: "auto", slider: true, future: 1 }, "unknown future fields must survive");
        assert(Array.isArray(__test.normalizeOptions({ declarations: "write" }).issues),
            "an invalid declarations mode must be rejected");
        assert(Array.isArray(__test.normalizeOptions({ slider: "yes" }).issues),
            "a non-boolean slider option must be rejected");
        assert(Array.isArray(__test.normalizeOptions([]).issues),
            "a non-object plugin config must be rejected");
    }

    console.log("all slider host checks passed");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
