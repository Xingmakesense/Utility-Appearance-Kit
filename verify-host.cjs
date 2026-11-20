// Host-half checks: bundle-row config, fixed service wiring, and the removed
// reasoning-declaration engine. Run with `node verify-host.cjs`.
const assert = (condition, message) => {
    if (!condition) throw new Error(message);
};
assert.equal = (actual, expected, message) => {
    if (actual !== expected) throw new Error(`${message}
  actual:   ${JSON.stringify(actual)}
  expected: ${JSON.stringify(expected)}`);
};
const same = (actual, expected, message) => {
    const a = JSON.stringify(actual);
    const b = JSON.stringify(expected);
    if (a !== b) throw new Error(`${message}
  actual:   ${a}
  expected: ${b}`);
};

const { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

async function main() {
    const home = mkdtempSync(join(tmpdir(), "uak-host-"));
    process.env.DSH_HOME = home;
    process.env.DSH_PROFILE_DIR = join(home, "profiles", "desktop");
    try {
        const host = await import("./host.js");
        const { normalizeOptions, Config, apply, __test } = host;

        // A. Options: one boolean switch; the removed declaration mode is
        //    dropped instead of rejecting an upgraded profile.
        {
            same(normalizeOptions(undefined).value, { slider: true }, "defaults must enable the slider");
            same(normalizeOptions({ slider: false }).value, { slider: false }, "the slider switch must round-trip");
            same(normalizeOptions({ declarations: "off", slider: true }).value, { slider: true },
                "the obsolete declarations switch must be dropped");
            same(normalizeOptions({ slider: true, future: 1 }).value, { slider: true, future: 1 },
                "unknown future fields must survive");
            assert(Array.isArray(normalizeOptions({ slider: "yes" }).issues), "a non-boolean slider must be rejected");
            assert(Array.isArray(normalizeOptions({ declarations: "off", slider: "yes" }).issues),
                "a broken slider must stay invalid even with an obsolete mode present");
            assert(Array.isArray(normalizeOptions([]).issues), "a non-object plugin config must be rejected");
            assert.equal(typeof Config["~standard"].validate, "function", "the plugin must publish its Config schema");
            assert.equal(__test.normalizeOptions, normalizeOptions, "the test face must expose normalizeOptions");
        }

        // B. The declaration engine is gone: no public entry point, no
        //    capability table, no configEditor dependency.
        {
            assert.equal("planDeclarations" in host, false, "planDeclarations must stay removed");
            assert.equal("applyPlan" in host, false, "applyPlan must stay removed");
            assert.equal(__test.declarationTest, undefined, "declaration test helpers must stay removed");
        }

        // C. Fixed host wiring: settings, assets, usage and holidays only.
        const services = [];
        const routes = [];
        const effects = [];
        const makeScope = () => ({
            webServer: {
                register(route) { routes.push(route); return () => {}; },
                getOrigin: () => "http://127.0.0.1:49223"
            },
            effect(fn) {
                const dispose = fn();
                effects.push(dispose);
                return dispose;
            }
        });
        const ctx = {
            logger: { info() {}, warn() {}, error() {} },
            get: () => undefined,
            inject(names, callback) {
                services.push(names);
                callback(makeScope());
                return { dispose() {} };
            },
            effect(fn) {
                const dispose = fn();
                effects.push(dispose);
                return dispose;
            }
        };
        apply(ctx, { slider: true, declarations: "auto" });
        assert.equal(services.some((names) => names.includes("configEditor")), false,
            "the host must never request configEditor after the engine removal");
        same([...new Set(services.map((names) => names.join(",")))], ["webServer"],
            "the host only needs the web server service");
        const paths = routes.map((route) => route.path);
        for (const path of [
            "/utility-appearance-kit/settings",
            "/utility-appearance-kit/asset",
            "/utility-appearance-kit/usage",
            "/utility-appearance-kit/holidays.json"
        ]) {
            assert(paths.includes(path), `${path} must be registered`);
        }
        assert.equal(routes.filter((route) => route.path === "/utility-appearance-kit/asset").length, 2,
            "assets keep one exact POST route and one prefix GET route");

        const statusFile = join(process.env.DSH_PROFILE_DIR, ".utility-appearance-kit", "status.json");
        const status = JSON.parse(readFileSync(statusFile, "utf8"));
        assert.equal(status.plugin?.phase, "apply", "the plugin status scope must be recorded");
        assert.equal(status.engine, undefined, "the removed declaration engine must not write engine status");

        // A profile upgraded from 2.6.x still carries an engine scope; the
        // first status write must clear it rather than publish a stale phase.
        mkdirSync(join(process.env.DSH_PROFILE_DIR, ".utility-appearance-kit"), { recursive: true });
        writeFileSync(statusFile, JSON.stringify({ phase: "declared", engine: { phase: "declared" } }), "utf8");
        apply(ctx, { slider: true });
        const cleaned = JSON.parse(readFileSync(statusFile, "utf8"));
        assert.equal(cleaned.engine, undefined, "the legacy engine status must be cleared on upgrade");

        apply(ctx, { slider: "no" });
        const invalid = JSON.parse(readFileSync(join(process.env.DSH_PROFILE_DIR, ".utility-appearance-kit", "status.json"), "utf8"));
        assert.equal(invalid.plugin?.phase, "config-error", "an invalid config must be reported on the plugin scope");

        for (const dispose of effects) if (typeof dispose === "function") dispose();
        console.log("host: options, fixed wiring and removed declaration engine passed");
    } finally {
        rmSync(home, { recursive: true, force: true });
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
