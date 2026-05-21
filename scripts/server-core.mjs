import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const JSON_CONTENT_TYPE = "application/json; charset=utf-8";

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function normalizeRoutePath(value, fallback) {
  if (!value) {
    return fallback;
  }

  if (!value.startsWith("/")) {
    return `/${value}`;
  }

  return value;
}

export function getServerRuntimeConfig(env) {
  const agentProxyBasePath = normalizeRoutePath(
    env.VITE_AGENT_API_BASE_URL && env.VITE_AGENT_API_BASE_URL.startsWith("/")
      ? env.VITE_AGENT_API_BASE_URL
      : env.AGENT_PROXY_BASE_PATH,
    "/api/agent"
  );

  const agentBaseUrlCandidate =
    env.AGENT_API_BASE_URL ||
    (env.VITE_AGENT_API_BASE_URL && /^https?:\/\//i.test(env.VITE_AGENT_API_BASE_URL)
      ? env.VITE_AGENT_API_BASE_URL
      : "");

  const agentBaseUrl = agentBaseUrlCandidate ? stripTrailingSlash(agentBaseUrlCandidate) : "";
  const agentApiKey = env.AGENT_API_KEY || env.VITE_AGENT_API_KEY || "";

  const volcengineStsPath = normalizeRoutePath(
    env.VITE_VOLCENGINE_ASR_STS_ENDPOINT || env.VOLCENGINE_ASR_STS_ENDPOINT,
    "/api/volcengine/sts-token"
  );

  return {
    host: env.AGENT_HOST || "127.0.0.1",
    port: Number(env.AGENT_PORT || env.VITE_AGENT_PORT || 4173),
    agentProxyBasePath,
    agentChatPath: `${agentProxyBasePath}/chat/completions`,
    agentBaseUrl,
    agentApiKey,
    volcengineStsPath,
    volcengineAppId: env.VOLCENGINE_ASR_APP_ID || env.VITE_VOLCENGINE_ASR_APP_ID || "",
    volcengineAccessToken:
      env.VOLCENGINE_ASR_ACCESS_TOKEN || env.VITE_VOLCENGINE_ASR_ACCESS_TOKEN || "",
    volcengineResourceId:
      env.VOLCENGINE_ASR_RESOURCE_ID || env.VITE_VOLCENGINE_ASR_RESOURCE_ID || "",
    volcengineModelName:
      env.VOLCENGINE_ASR_MODEL_NAME || env.VITE_VOLCENGINE_ASR_MODEL_NAME || "bigmodel",
    volcengineWsUrl:
      env.VOLCENGINE_ASR_WS_URL ||
      env.VITE_VOLCENGINE_ASR_WS_URL ||
      "wss://openspeech.bytedance.com/api/v3/sauc/bigmodel"
  };
}

export function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", JSON_CONTENT_TYPE);
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

export async function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function safeParseJson(text) {
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (_error) {
    return {
      raw: text
    };
  }
}

function buildErrorMessage(payload, fallback) {
  return payload?.message || payload?.msg || payload?.error || payload?.detail || fallback;
}

function copyResponseHeaders(source, target) {
  const passthroughHeaders = [
    "content-type",
    "cache-control",
    "x-request-id",
    "x-ratelimit-limit-requests",
    "x-ratelimit-remaining-requests",
    "x-ratelimit-limit-tokens",
    "x-ratelimit-remaining-tokens"
  ];

  passthroughHeaders.forEach((headerName) => {
    const value = source.headers.get(headerName);
    if (value) {
      target.setHeader(headerName, value);
    }
  });
}

async function handleChatProxy(req, res, config) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, {
      message: "Method Not Allowed"
    });
    return true;
  }

  if (!config.agentBaseUrl) {
    sendJson(res, 503, {
      message: "服务端未配置 AGENT_API_BASE_URL"
    });
    return true;
  }

  const rawBody = await readRequestBody(req);
  const upstreamController = new AbortController();
  const abortUpstream = () => {
    if (!upstreamController.signal.aborted) {
      upstreamController.abort();
    }
  };

  req.on("aborted", abortUpstream);
  req.on("close", abortUpstream);
  res.on("close", abortUpstream);

  try {
    const upstream = await fetch(`${config.agentBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.agentApiKey
          ? {
              Authorization: `Bearer ${config.agentApiKey}`
            }
          : {})
      },
      body: rawBody,
      signal: upstreamController.signal
    });

    copyResponseHeaders(upstream, res);
    res.statusCode = upstream.status;

    if (!upstream.body) {
      res.end(await upstream.text());
      return true;
    }

    try {
      await pipeline(Readable.fromWeb(upstream.body), res);
    } catch (_error) {
      if (req.destroyed || res.destroyed) {
        return true;
      }

      if (!res.headersSent) {
        sendJson(res, 502, {
          message: "模型代理流式转发失败"
        });
      } else if (!res.writableEnded) {
        res.end();
      }
    }
  } catch (_error) {
    if (req.destroyed || res.destroyed) {
      return true;
    }

    if (!res.headersSent) {
      sendJson(res, 502, {
        message: "模型代理请求失败"
      });
    } else if (!res.writableEnded) {
      res.end();
    }
  } finally {
    req.off("aborted", abortUpstream);
    req.off("close", abortUpstream);
    res.off("close", abortUpstream);
  }

  return true;
}

async function handleVolcengineSts(req, res, config) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, {
      message: "Method Not Allowed"
    });
    return true;
  }

  if (!config.volcengineAppId || !config.volcengineAccessToken) {
    sendJson(res, 503, {
      message: "火山语音识别服务端凭据未配置"
    });
    return true;
  }

  let duration = 300;

  try {
    const rawBody = await readRequestBody(req);
    if (rawBody) {
      const parsed = JSON.parse(rawBody);
      if (Number.isFinite(parsed.duration)) {
        duration = Math.max(60, Math.min(3600, Number(parsed.duration)));
      }
    }
  } catch (_error) {
    sendJson(res, 400, {
      message: "无效的请求体"
    });
    return true;
  }

  try {
    const upstream = await fetch("https://openspeech.bytedance.com/api/v1/sts/token", {
      method: "POST",
      headers: {
        Authorization: `Bearer; ${config.volcengineAccessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        appid: config.volcengineAppId,
        duration
      })
    });

    const rawText = await upstream.text();
    const payload = safeParseJson(rawText);

    if (!upstream.ok || !payload?.jwt_token) {
      sendJson(res, 502, {
        message: buildErrorMessage(payload, "获取语音临时凭证失败")
      });
      return true;
    }

    sendJson(res, 200, {
      jwtToken: payload.jwt_token,
      appId: config.volcengineAppId,
      resourceId: config.volcengineResourceId || "volc.bigasr.sauc.duration",
      modelName: config.volcengineModelName,
      websocketUrl: config.volcengineWsUrl,
      duration
    });
  } catch (_error) {
    sendJson(res, 502, {
      message: "获取语音临时凭证失败"
    });
  }

  return true;
}

export function createApiRequestHandler(config) {
  return async function handleApiRequest(req, res) {
    const requestUrl = new URL(req.url || "/", "http://127.0.0.1");

    if (requestUrl.pathname === config.agentChatPath) {
      return handleChatProxy(req, res, config);
    }

    if (requestUrl.pathname === config.volcengineStsPath) {
      return handleVolcengineSts(req, res, config);
    }

    return false;
  };
}
