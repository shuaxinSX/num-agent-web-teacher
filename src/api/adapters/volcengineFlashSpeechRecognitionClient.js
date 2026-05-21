function createRequestId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeTextSegments(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (typeof item?.text === "string") {
        return item.text;
      }

      if (typeof item?.utterance === "string") {
        return item.utterance;
      }

      if (typeof item?.content === "string") {
        return item.content;
      }

      return "";
    })
    .filter(Boolean);
}

function extractTranscription(payload) {
  const candidates = [
    payload?.result?.text,
    payload?.text,
    payload?.result?.utterances,
    payload?.result?.segments,
    payload?.utterances,
    payload?.segments
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }

    const parts = normalizeTextSegments(candidate);
    if (parts.length > 0) {
      return parts.join(" ").trim();
    }
  }

  return "";
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

function buildErrorMessage(response, payload) {
  const headerMessage = response.headers.get("X-Api-Message");
  const statusCode = response.headers.get("X-Api-Status-Code");
  const bodyMessage =
    payload?.message || payload?.msg || payload?.error || payload?.detail || payload?.status_text;

  const message = bodyMessage || headerMessage || "语音识别失败";

  if (statusCode && statusCode !== "0") {
    return `${message}（状态码 ${statusCode}）`;
  }

  return message;
}

export class VolcengineFlashSpeechRecognitionClient {
  constructor(config) {
    this.config = config;
  }

  get isConfigured() {
    return Boolean(this.config.appId && this.config.accessToken && this.config.endpoint);
  }

  async transcribe({
    audioBase64,
    format = "wav",
    codec = "raw",
    sampleRate = 16000,
    bits = 16,
    channel = 1,
    uid = "web-user"
  }) {
    if (!this.isConfigured) {
      throw new Error("豆包语音识别尚未配置");
    }

    if (!audioBase64) {
      throw new Error("缺少音频数据");
    }

    const response = await fetch(this.config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-App-Key": this.config.appId,
        "X-Api-Access-Key": this.config.accessToken,
        "X-Api-Resource-Id": this.config.resourceId,
        "X-Api-Request-Id": createRequestId(),
        "X-Api-Sequence": "-1"
      },
      body: JSON.stringify({
        user: {
          uid
        },
        audio: {
          data: audioBase64,
          format,
          codec,
          rate: sampleRate,
          bits,
          channel
        },
        request: {
          model_name: this.config.modelName
        }
      })
    });

    const rawText = await response.text();
    const payload = safeParseJson(rawText);

    if (!response.ok) {
      throw new Error(buildErrorMessage(response, payload));
    }

    const apiStatusCode = response.headers.get("X-Api-Status-Code");
    if (apiStatusCode && apiStatusCode !== "0") {
      throw new Error(buildErrorMessage(response, payload));
    }

    const transcription = extractTranscription(payload);

    if (!transcription) {
      throw new Error("语音识别成功，但未返回文本");
    }

    return {
      text: transcription,
      raw: payload
    };
  }
}
