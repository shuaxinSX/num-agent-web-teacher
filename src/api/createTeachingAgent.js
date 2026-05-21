import { MockTeachingAgentAdapter } from "./adapters/mockTeachingAgentAdapter";
import { OpenAICompatibleTeachingAgentAdapter } from "./adapters/openAICompatibleTeachingAgentAdapter";
import { VolcengineFlashSpeechRecognitionClient } from "./adapters/volcengineFlashSpeechRecognitionClient";
import { VolcengineStreamingSpeechRecognitionClient } from "./adapters/volcengineStreamingSpeechRecognitionClient";

function parseModelList(value) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getDefaultModels(baseUrl, model) {
  if (/minimax/i.test(baseUrl)) {
    return ["MiniMax-M2.7-highspeed", "MiniMax-M2.7"];
  }

  return [model];
}

export function getAgentRuntimeConfig() {
  const provider = import.meta.env.VITE_AGENT_API_PROVIDER || "local-proxy";
  const baseUrl = import.meta.env.VITE_AGENT_API_BASE_URL || "/api/agent";
  const model = import.meta.env.VITE_AGENT_API_MODEL || "gpt-4.1-mini";
  const configuredModels = parseModelList(import.meta.env.VITE_AGENT_MODELS || "");
  const models = Array.from(
    new Set(
      configuredModels.length > 0
        ? configuredModels
        : getDefaultModels(baseUrl, model)
    )
  );

  return {
    provider,
    baseUrl,
    apiKey: import.meta.env.VITE_AGENT_API_KEY || "",
    model,
    models,
    serverProxy: provider === "local-proxy"
  };
}

export function createTeachingAgent(overrides = {}) {
  const config = {
    ...getAgentRuntimeConfig(),
    ...overrides
  };

  if (config.provider === "openai-compatible") {
    return new OpenAICompatibleTeachingAgentAdapter(config);
  }

  if (config.provider === "local-proxy") {
    return new OpenAICompatibleTeachingAgentAdapter({
      ...config,
      serverProxy: true
    });
  }

  return new MockTeachingAgentAdapter(config);
}

export function getSpeechRecognitionRuntimeConfig() {
  const provider = import.meta.env.VITE_ASR_PROVIDER || "";

  return {
    provider,
    stsEndpoint:
      import.meta.env.VITE_VOLCENGINE_ASR_STS_ENDPOINT || "/api/volcengine/sts-token",
    websocketUrl:
      import.meta.env.VITE_VOLCENGINE_ASR_WS_URL ||
      "wss://openspeech.bytedance.com/api/v3/sauc/bigmodel",
    endpoint:
      import.meta.env.VITE_VOLCENGINE_ASR_ENDPOINT ||
      "https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash",
    appId: import.meta.env.VITE_VOLCENGINE_ASR_APP_ID || "",
    accessToken: import.meta.env.VITE_VOLCENGINE_ASR_ACCESS_TOKEN || "",
    resourceId:
      import.meta.env.VITE_VOLCENGINE_ASR_RESOURCE_ID ||
      (provider === "volcengine-flash"
        ? "volc.bigasr.auc_turbo"
        : "volc.bigasr.sauc.duration"),
    modelName: import.meta.env.VITE_VOLCENGINE_ASR_MODEL_NAME || "bigmodel"
  };
}

export function createSpeechRecognitionClient(overrides = {}) {
  const config = {
    ...getSpeechRecognitionRuntimeConfig(),
    ...overrides
  };

  if (config.provider === "volcengine-streaming-sdk") {
    return new VolcengineStreamingSpeechRecognitionClient(config);
  }

  if (config.provider === "volcengine-flash") {
    return new VolcengineFlashSpeechRecognitionClient(config);
  }

  return null;
}
