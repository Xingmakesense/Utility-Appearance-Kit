import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { installAppearance } from "./host/appearance.js";

const home = mkdtempSync(join(tmpdir(), "uak-routes-"));
const previousHome = process.env.DSH_HOME;
process.env.DSH_HOME = home;
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
    ["prefix", "/utility-appearance-kit/asset"],
]);
assert.equal(routes.some((route) => route.kind === "prefix" && route.path === "/utility-appearance-kit/asset/"), false,
    "a trailing slash in a prefix route doubles the separator and can never match");
assert.equal(routes.some((route) => route.kind === "prefix" && route.path === "/utility-appearance-kit/asset"), true,
    "asset reads must match nested file paths under one exact prefix");
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
// The desktop forwarder strips `host`/`origin`/`sec-fetch-site` before proxying,
// so the guard keys off what survives: the private request marker and any
// cross-site signals that are present. A foreign `Host` alone is not a signal.
response = respond();
await settingsRoute.handler({ method: "GET", url: "/utility-appearance-kit/settings", headers: { host: "evil.example", "x-dsh-uak-settings": "1" } }, response);
assert.equal(response.status, 200, "host alone is not trusted evidence either way");
response = respond();
await settingsRoute.handler({ method: "GET", url: "/utility-appearance-kit/settings", headers: { ...trusted, origin: "https://evil.example" } }, response);
assert.equal(response.status, 403, "foreign origins are rejected");
response = respond();
await settingsRoute.handler({ method: "GET", url: "/utility-appearance-kit/settings", headers: { ...trusted, "sec-fetch-site": "cross-site" } }, response);
assert.equal(response.status, 403, "cross-site requests are rejected");
response = respond();
await settingsRoute.handler({ method: "POST", url: "/utility-appearance-kit/settings", headers: { host: "127.0.0.1:49223", "sec-fetch-site": "same-origin" } }, response);
assert.equal(response.status, 403, "writes still require the private request marker");
const assetRoute = routes.find((route) => route.path === "/utility-appearance-kit/asset" && route.kind === "prefix");
mkdirSync(join(home, "utility-appearance-kit", "assets"), { recursive: true });
writeFileSync(join(home, "utility-appearance-kit", "assets", "wallpaper.jpg"), Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
response = respond();
await assetRoute.handler({ method: "HEAD", url: "/utility-appearance-kit/asset/wallpaper.jpg", headers: { host: "127.0.0.1:49223", "sec-fetch-site": "same-origin" } }, response);
assert.equal(response.status, 200, "the real wallpaper path resolves inside the asset prefix");
assert.equal(response.headers["content-type"], "image/jpeg");
response = respond();
await assetRoute.handler({ method: "GET", url: "/utility-appearance-kit/asset/missing.png", headers: { host: "127.0.0.1:49223", "sec-fetch-site": "same-origin" } }, response);
assert.equal(response.status, 404, "image reads are same-origin but need no custom marker");

for (const dispose of effects) if (typeof dispose === "function") dispose();
if (previousHome === undefined) delete process.env.DSH_HOME;
else process.env.DSH_HOME = previousHome;
rmSync(home, { recursive: true, force: true });
console.log("routes: appearance remains exact-only and cannot intercept subscription auth");
