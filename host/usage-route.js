import { aggregateUsage, emptyUsageSummary, hasPersistedUsageCache } from "./usage-store.js";

export const USAGE_PATH = "/utility-appearance-kit/usage";
export const MARKER_HEADER = "x-dsh-uak-usage";
export const MARKER_VALUE = "1";

const usageResponseCache = new WeakMap();

function sendJson(response, status, body) {
  let text = body !== null && typeof body === "object" ? usageResponseCache.get(body) : undefined;
  if (text === undefined) {
    text = JSON.stringify(body);
    if (body !== null && typeof body === "object") usageResponseCache.set(body, text);
  }
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(text),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(text);
}

function headerOf(request, name) {
  const headers = request?.headers;
  if (headers === null || typeof headers !== "object") return undefined;
  const value = headers[name];
  if (Array.isArray(value)) return value.length === 1 ? String(value[0]) : undefined;
  return typeof value === "string" ? value : undefined;
}

function authorityOf(text, scheme) {
  if (typeof text !== "string" || text === "") return null;
  const absolute = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(text);
  try {
    const url = new URL(absolute ? text : `${scheme || "http:"}//${text}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.host.toLowerCase();
  } catch {
    return null;
  }
}

function hostnameOf(authority) {
  const at = authority.lastIndexOf(":");
  return at === -1 ? authority : authority.slice(0, at);
}

function portOf(authority) {
  const at = authority.lastIndexOf(":");
  return at === -1 ? "" : authority.slice(at + 1);
}

function isLoopbackAuthority(authority) {
  const host = hostnameOf(authority);
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

/** All cheap trust checks happen before enumeration, parsing or refresh. */
export function refuseRequest(request, origin) {
  const host = headerOf(request, "host");
  if (host === undefined) return "no-host";
  const authority = authorityOf(host, "http:");
  if (authority === null) return "bad-host";

  const own = origin === null || origin === undefined ? null : authorityOf(String(origin), "http:");
  if (own === null) {
    if (!isLoopbackAuthority(authority)) return "foreign-host";
  } else if (authority !== own) {
    const sameLoopbackPeer = isLoopbackAuthority(authority)
      && isLoopbackAuthority(own)
      && portOf(authority) === portOf(own);
    if (!sameLoopbackPeer) return "foreign-host";
  }

  const site = headerOf(request, "sec-fetch-site");
  if (site !== undefined && site !== "same-origin" && site !== "none") return "cross-site";
  const requestOrigin = headerOf(request, "origin");
  if (requestOrigin !== undefined && authorityOf(requestOrigin, "http:") !== authority) return "foreign-origin";
  if (headerOf(request, MARKER_HEADER) !== MARKER_VALUE) return "missing-marker";
  return null;
}

export function createUsageRoute(aggregate = aggregateUsage, options = {}) {
  const originOf = typeof options.origin === "function" ? options.origin : () => null;
  function listenerOrigin() {
    try {
      const value = originOf();
      return typeof value === "string" && value !== "" ? value : null;
    } catch {
      return null;
    }
  }

  return {
    kind: "exact",
    path: USAGE_PATH,
    handler: async (request, response) => {
      // HEAD, like every other non-GET method, cannot trigger the expensive read.
      if (request.method !== "GET") {
        response.writeHead(405, { allow: "GET" });
        response.end();
        return;
      }
      const refused = refuseRequest(request, listenerOrigin());
      if (refused !== null) {
        sendJson(response, 403, { error: "refused", reason: refused });
        return;
      }
      let force = false;
      try {
        force = new URL(request.url ?? "/", "http://localhost").searchParams.get("refresh") === "1";
      } catch {
        // An invalid URL only disables refresh; it does not fail the summary.
      }
      if (force && refuseRequest(request, listenerOrigin()) !== null) {
        sendJson(response, 403, { error: "refused", reason: "refresh-without-fence" });
        return;
      }
      try {
        sendJson(response, 200, await aggregate({ force }));
      } catch (error) {
        sendJson(response, 500, {
          ...emptyUsageSummary(),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  };
}

/** Mount with the Host service lifecycle, and degrade cleanly when headless. */
export function installUsageStats(ctx, options = {}) {
  if (ctx === null || typeof ctx?.inject !== "function") {
    console.warn("utility-appearance-kit: webServer is unavailable; monthly usage statistics are disabled");
    return () => {};
  }
  let prewarm;
  try {
    prewarm = options.prewarm === undefined ? hasPersistedUsageCache() : options.prewarm === true;
  } catch {
    prewarm = false;
  }

  let dispose = () => {};
  try {
    ctx.inject(["webServer"], (hostCtx) => {
      const webServer = hostCtx?.webServer;
      if (webServer === null || webServer === undefined || typeof webServer.register !== "function") {
        console.warn("utility-appearance-kit: webServer is unavailable; monthly usage statistics are disabled");
        return;
      }
      if (typeof hostCtx.effect !== "function") {
        console.warn("utility-appearance-kit: Host effects are unavailable; monthly usage statistics are disabled");
        return;
      }
      hostCtx.effect(() => {
        const route = createUsageRoute(undefined, {
          origin: () => {
            try {
              return typeof webServer.getOrigin === "function" ? webServer.getOrigin() : null;
            } catch {
              return null;
            }
          },
        });
        const unregister = webServer.register(route);
        let timer = null;
        let disposed = false;
        if (prewarm) {
          // No persisted cache means a first run stays completely lazy.
          timer = setTimeout(() => {
            timer = null;
            if (!disposed) void aggregateUsage({ background: true }).catch(() => {});
          }, 60);
          if (typeof timer.unref === "function") timer.unref();
        }
        dispose = () => {
          disposed = true;
          if (timer !== null) clearTimeout(timer);
          if (typeof unregister === "function") unregister();
        };
        return dispose;
      }, "utility-appearance-kit: monthly usage route");
    });
  } catch (error) {
    console.warn(`utility-appearance-kit: usage route unavailable: ${error instanceof Error ? error.message : String(error)}`);
  }
  return () => dispose();
}
