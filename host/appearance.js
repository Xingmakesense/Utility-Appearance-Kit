import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SETTINGS_PATH = "/utility-appearance-kit/settings";
const ASSET_PREFIX = "/utility-appearance-kit/asset/";
const ASSET_ROUTE = "/utility-appearance-kit/asset";
const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
const IMAGE_TYPES = Object.freeze({ ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp" });
const IMAGE_MIMES = new Set(Object.values(IMAGE_TYPES));
function homeOf(ctx) {
    if (process.env.DSH_HOME?.trim()) return resolve(process.env.DSH_HOME.trim());
    try {
        const profile = fileURLToPath(ctx.baseUrl);
        if (profile.endsWith(`${join("profiles", "desktop")}`) || profile.endsWith(`${join("profiles", "web")}`)) return dirname(dirname(profile));
    } catch { /* standard home */ }
    return join(homedir(), ".dsh");
}
function clamp(value, min, max, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}
const mediaUrl = (value) => typeof value === "string" && (/^https?:\/\//i.test(value) || /^\/(skin-master|utility-appearance-kit)\/asset\/[\w.-]+$/.test(value)) ? value.slice(0, 2048) : "";
export function sanitizeAppearance(raw) {
    const value = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const pop = value.popBg && typeof value.popBg === "object" ? value.popBg : {};
    return {
        imageUrl: mediaUrl(value.imageUrl),
        imageMode: ["cover", "contain", "repeat"].includes(value.imageMode) ? value.imageMode : "cover",
        opacity: clamp(value.opacity, 0, 100, 0),
        brightness: clamp(value.brightness, 50, 150, 100),
        glassOpacity: clamp(value.glassOpacity, 20, 95, 70), glassBlur: clamp(value.glassBlur, 0, 40, 18),
        popBg: { alpha: clamp(pop.alpha, 0, 100, 40), blur: clamp(pop.blur, 0, 40, 10) },
        bodyHeight: Math.round(clamp(value.bodyHeight, 300, 560, 360) / 4) * 4,
        bookMode: value.bookMode === "selected" ? "selected" : "random",
        bookTitle: typeof value.bookTitle === "string" ? value.bookTitle.slice(0, 100) : "活着",
        units: ["auto", "short", "myriad"].includes(value.units) ? value.units : "auto"
    };
}
// Desktop windows load the page from the `dsh-app://app` custom protocol and
// forward every other path to this web server. That forwarder strips `host`,
// `origin`, and `sec-fetch-site` before proxying, so the previous host-based
// check rejected every request coming from the real app window (the HTTP port
// still answered 200, which hid the bug). Keep the same-origin intent without
// depending on a header the desktop forwarder removes.
function trusted(request, origin, requireMarker = true) {
    if (requireMarker && request.headers["x-dsh-uak-settings"] !== "1") return false;
    const site = request.headers["sec-fetch-site"];
    if (site && !["same-origin", "none"].includes(site)) return false;
    const requestOrigin = request.headers.origin;
    if (!requestOrigin) return true;
    if (requestOrigin === "dsh-app://app" || requestOrigin === "null") return true;
    try {
        const own = new URL(origin());
        const supplied = new URL(requestOrigin);
        if (supplied.protocol === "dsh-app:") return true;
        if (supplied.host === own.host) return true;
        return ["localhost", "127.0.0.1"].includes(supplied.hostname)
            && ["localhost", "127.0.0.1"].includes(own.hostname);
    } catch {
        return false;
    }
}
function json(response, status, value) {
    const body = Buffer.from(JSON.stringify(value));
    response.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": body.length, "cache-control": "no-store", "x-content-type-options": "nosniff" });
    response.end(body);
}
async function bodyOf(request) {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
        size += chunk.length;
        if (size > MAX_IMAGE_BYTES) throw new Error("Images must be smaller than 50 MB");
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}
function saveAtomic(path, value) {
    mkdirSync(dirname(path), { recursive: true });
    const temporary = `${path}.${process.pid}.tmp`;
    writeFileSync(temporary, JSON.stringify(value, null, 2), "utf8");
    renameSync(temporary, path);
}
export function installAppearance(ctx) {
    const directory = join(homeOf(ctx), "utility-appearance-kit");
    const assets = join(directory, "assets");
    const settingsPath = join(directory, "settings.json");
    const legacyAssets = join(homeOf(ctx), "dsh-skin-master", "assets");
    let cachedSettings;
    const read = () => {
        if (cachedSettings !== undefined) return cachedSettings;
        try { cachedSettings = sanitizeAppearance(JSON.parse(readFileSync(settingsPath, "utf8"))); }
        catch { cachedSettings = sanitizeAppearance(null); }
        return cachedSettings;
    };
    ctx.inject(["webServer"], (scope) => {
        if (typeof scope.webServer?.register !== "function") return;
        const handle = async (request, response) => {
            const url = new URL(request.url || "/", "http://localhost");
            try {
                if (!trusted(request, () => scope.webServer.getOrigin?.() || "http://localhost", request.method !== "GET" && request.method !== "HEAD")) return json(response, 403, { ok: false, message: "Request origin is not trusted" });
                if (url.pathname === SETTINGS_PATH && request.method === "GET") return json(response, 200, { ok: true, value: read() });
                if (url.pathname === SETTINGS_PATH && request.method === "POST") {
                    const body = JSON.parse((await bodyOf(request)).toString("utf8") || "{}");
                    const value = sanitizeAppearance(body);
                    try { if (readFileSync(settingsPath, "utf8") === JSON.stringify(value, null, 2)) return json(response, 200, { ok: true, value }); } catch { /* first save */ }
                    saveAtomic(settingsPath, value);
                    cachedSettings = value;
                    return json(response, 200, { ok: true, value });
                }
                if (url.pathname === ASSET_ROUTE && request.method === "POST") {
                    const mime = String(request.headers["content-type"] || "").toLowerCase().split(";")[0];
                    if (!IMAGE_MIMES.has(mime)) return json(response, 415, { ok: false, message: "Only PNG, JPEG, GIF, or WebP images are supported" });
                    const data = await bodyOf(request);
                    if (data.length === 0) return json(response, 400, { ok: false, message: "The image is empty" });
                    const extension = Object.entries(IMAGE_TYPES).find(([, type]) => type === mime)[0];
                    const name = `${String(url.searchParams.get("name") || "wallpaper").replace(/[^A-Za-z0-9._-]/g, "_").replace(/\.[^.]+$/, "").slice(0, 100)}${extension}`;
                    mkdirSync(assets, { recursive: true });
                    writeFileSync(join(assets, name), data);
                    return json(response, 200, { ok: true, url: ASSET_PREFIX + encodeURIComponent(name) });
                }
                if (url.pathname.startsWith(ASSET_PREFIX) && (request.method === "GET" || request.method === "HEAD")) {
                    const name = decodeURIComponent(url.pathname.slice(ASSET_PREFIX.length));
                    if (!/^[\w.-]+$/.test(name)) return json(response, 400, { ok: false, message: "Invalid image name" });
                    const file = existsSync(join(assets, name)) ? join(assets, name) : join(legacyAssets, name);
                    const mime = IMAGE_TYPES[extname(name).toLowerCase()];
                    if (!mime || !existsSync(file)) return json(response, 404, { ok: false, message: "Image not found" });
                    const size = statSync(file).size;
                    const match = /^bytes=(\d+)-(\d*)$/.exec(String(request.headers.range || ""));
                    let start = 0, end = size - 1, status = 200;
                    if (match) {
                        start = Number(match[1]); end = match[2] ? Math.min(Number(match[2]), end) : end;
                        if (start > end || start >= size) { response.writeHead(416, { "content-range": `bytes */${size}` }); return response.end(); }
                        status = 206;
                    }
                    response.writeHead(status, { "content-type": mime, "accept-ranges": "bytes", "content-length": end - start + 1, ...(status === 206 ? { "content-range": `bytes ${start}-${end}/${size}` } : {}) });
                    if (request.method === "HEAD") return response.end();
                    const stream = createReadStream(file, { start, end });
                    stream.on("error", () => response.destroy());
                    return stream.pipe(response);
                }
                return json(response, 404, { ok: false, message: "Resource not found" });
            } catch {
                return json(response, 400, { ok: false, message: "Invalid or unwritable appearance data" });
            }
        };
        scope.effect(() => {
            const disposers = [
                scope.webServer.register({ kind: "exact", path: SETTINGS_PATH, handler: handle }),
                scope.webServer.register({ kind: "exact", path: ASSET_ROUTE, handler: handle }),
                scope.webServer.register({ kind: "prefix", path: ASSET_ROUTE, handler: handle })
            ].filter((dispose) => typeof dispose === "function");
            return () => { for (const dispose of disposers) dispose(); };
        }, "utility-appearance-kit: appearance routes");
    });
}
