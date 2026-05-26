import express from "express";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { authenticateToken } from "./auth.js";

const router = express.Router();

function stripTrailingSlash(value) {
  return value ? value.replace(/\/+$/, "") : "";
}

// Config loader
function getAgentConfig() {
  const agentBaseUrlCandidate =
    process.env.AGENT_API_BASE_URL ||
    (process.env.VITE_AGENT_API_BASE_URL && /^https?:\/\//i.test(process.env.VITE_AGENT_API_BASE_URL)
      ? process.env.VITE_AGENT_API_BASE_URL
      : "");

  return {
    agentBaseUrl: stripTrailingSlash(agentBaseUrlCandidate),
    agentApiKey: process.env.AGENT_API_KEY || process.env.VITE_AGENT_API_KEY || "",
    volcengineAppId: process.env.VOLCENGINE_ASR_APP_ID || process.env.VITE_VOLCENGINE_ASR_APP_ID || "",
    volcengineAccessToken:
      process.env.VOLCENGINE_ASR_ACCESS_TOKEN || process.env.VITE_VOLCENGINE_ASR_ACCESS_TOKEN || "",
    volcengineResourceId:
      process.env.VOLCENGINE_ASR_RESOURCE_ID || process.env.VITE_VOLCENGINE_ASR_RESOURCE_ID || "",
    volcengineModelName:
      process.env.VOLCENGINE_ASR_MODEL_NAME || process.env.VITE_VOLCENGINE_ASR_MODEL_NAME || "bigmodel",
    volcengineWsUrl:
      process.env.VOLCENGINE_ASR_WS_URL ||
      process.env.VITE_VOLCENGINE_ASR_WS_URL ||
      "wss://openspeech.bytedance.com/api/v3/sauc/bigmodel"
  };
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

function safeParseJson(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (_err) {
    return { raw: text };
  }
}

// Protected LLM chat completion proxy endpoint
router.post("/agent/chat/completions", authenticateToken, async (req, res) => {
  const config = getAgentConfig();

  if (!config.agentBaseUrl) {
    return res.status(503).json({ message: "服务端未配置 AGENT_API_BASE_URL" });
  }

  try {
    const upstream = await fetch(`${config.agentBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.agentApiKey ? { Authorization: `Bearer ${config.agentApiKey}` } : {})
      },
      body: JSON.stringify(req.body)
    });

    copyResponseHeaders(upstream, res);
    res.statusCode = upstream.status;

    if (!upstream.body) {
      res.end(await upstream.text());
      return;
    }

    try {
      await pipeline(Readable.fromWeb(upstream.body), res);
    } catch (err) {
      if (req.destroyed || res.destroyed) {
        return;
      }
      if (!res.headersSent) {
        res.status(502).json({ message: "模型代理流式转发失败" });
      } else if (!res.writableEnded) {
        res.end();
      }
    }
  } catch (err) {
    if (req.destroyed || res.destroyed) {
      return;
    }
    if (!res.headersSent) {
      res.status(502).json({ message: "模型代理请求失败" });
    } else if (!res.writableEnded) {
      res.end();
    }
  }
});

// Protected Volcengine ASR STS token generation endpoint
router.post("/volcengine/sts-token", authenticateToken, async (req, res) => {
  const config = getAgentConfig();

  if (!config.volcengineAppId || !config.volcengineAccessToken) {
    return res.status(503).json({ message: "火山语音识别服务端凭据未配置" });
  }

  let duration = 300;
  if (req.body && Number.isFinite(req.body.duration)) {
    duration = Math.max(60, Math.min(3600, Number(req.body.duration)));
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
      const errMsg = payload?.message || payload?.msg || payload?.error || payload?.detail || "获取语音临时凭证失败";
      return res.status(502).json({ message: errMsg });
    }

    res.json({
      jwtToken: payload.jwt_token,
      appId: config.volcengineAppId,
      resourceId: config.volcengineResourceId || "volc.bigasr.sauc.duration",
      modelName: config.volcengineModelName,
      websocketUrl: config.volcengineWsUrl,
      duration
    });
  } catch (err) {
    res.status(502).json({ message: "获取语音临时凭证失败" });
  }
});

export default router;
