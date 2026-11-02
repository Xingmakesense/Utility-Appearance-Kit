import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { installAppearance } from "./host/appearance.js";

const home = mkdtempSync(join(tmpdir(), "uak-routes-"));
const routes = [];
const disposers = [];
const effects = [];
const scope = {
    webServer: {
        register(route) {
            routes.push(route);
            return () => {};
        },
        getOrigin: () => "http://127.0.0.1:49223",
    },
    effect(fn) {
        const dispose = fn();
        effects.push(dispose);
        return dispose;
    },
};
installAppearance({
    baseUrl: pathToFileURL(join(home, "profiles", "desktop")).href,
    inject(services, callback) {
        assert.deepEqual(services, ["webServer"]);
        callback(scope);
        return { dispose() {} };
    },
});

assert.deepEqual(routes.map((route) => [route.kind, route.path]), [
    ["exact", "/utility-appearance-kit/settings"],
    ["exact", "/utility-appearance-kit/asset"],
    ["prefix", "/utility-appearance-kit/asset/"],
]);
assert.equal(routes.some((route) => route.kind === "prefix" && route.path === "/utility-appearance-kit"), false,
    "a broad prefix must never intercept the subscription management auth channel");
for (const path of ["/utility-appearance-kit/auth/login/start", "/utility-appearance-kit/usage", "/utility-appearance-kit/account"]) {
    assert.equal(routes.some((route) => route.kind === "exact" && route.path === path), false, `${path} must stay owned by the subscription plugin`);
    assert.equal(routes.some((route) => route.kind === "prefix" && (path + "/").startsWith(route.path)), false, `${path} must not match appearance assets`);
}

function respond() {
    return {
        status: 0,
        headers: {},
        body: "",
        writeHead(status, headers) { this.status = status; this.headers = headers; return this; },
        end(body = "") { this.body += body; return this; },
    };
}
const settingsRoute = routes.find((route) => route.path === "/utility-appearance-kit/settings");
const trusted = { host: "127.0.0.1:49223", origin: "http://127.0.0.1:49223", "sec-fetch-site": "same-origin", "x-dsh-uak-settings": "1" };
let response = respond();
await settingsRoute.handler({ method: "GET", url: "/utility-appearance-kit/settings", headers: trusted }, response);
assert.equal(response.status, 200, "trusted appearance settings request succeeds");
response = respond();
await settingsRoute.handler({ method: "GET", url: "/utility-appearance-kit/settings", headers: { host: "evil.example", "x-dsh-uak-settings": "1" } }, response);
assert.equal(response.status, 403, "foreign settings requests are rejected");
response = respond();
await settingsRoute.handler({ method: "POST", url: "/utility-appearance-kit/settings", headers: { host: "127.0.0.1:49223", "sec-fetch-site": "same-origin" } }, response);
assert.equal(response.status, 403, "writes still require the private request marker");
const assetRoute = routes.find((route) => route.path === "/utility-appearance-kit/asset/");
response = respond();
await assetRoute.handler({ method: "GET", url: "/utility-appearance-kit/asset/missing.png", headers: { host: "127.0.0.1:49223", "sec-fetch-site": "same-origin" } }, response);
assert.equal(response.status, 404, "image reads are same-origin but need no custom marker");

for (const dispose of effects) if (typeof dispose === "function") dispose();
rmSync(home, { recursive: true, force: true });
console.log("routes: appearance remains exact-only and cannot intercept subscription auth");
