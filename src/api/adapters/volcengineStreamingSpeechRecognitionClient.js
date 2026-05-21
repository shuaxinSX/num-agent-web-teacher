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

function buildAuthUrl(url, auth) {
  const target = new URL(url);

  Object.entries(auth).forEach(([key, value]) => {
    if (value) {
      target.searchParams.set(key, value);
    }
  });

  return target.toString();
}

function normalizeStreamingText(text, payload) {
  if (typeof text === "string" && text.trim()) {
    return text.trim();
  }

  const candidates = [
    payload?.result?.text,
    payload?.result?.utterances,
    payload?.utterances,
    payload?.text
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }

    if (Array.isArray(candidate)) {
      const parts = candidate
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

          return "";
        })
        .filter(Boolean);

      if (parts.length > 0) {
        return parts.join(" ").trim();
      }
    }
  }

  return "";
}

function buildErrorMessage(payload, fallback) {
  return (
    payload?.message ||
    payload?.msg ||
    payload?.error ||
    payload?.detail ||
    fallback
  );
}

export class VolcengineStreamingSpeechRecognitionClient {
  constructor(config) {
    this.config = config;
    this.currentSession = null;
  }

  get mode() {
    return "streaming";
  }

  get isConfigured() {
    return Boolean(this.config.stsEndpoint);
  }

  async fetchSessionConfig(durationSeconds = 300) {
    const response = await fetch(this.config.stsEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(localStorage.getItem("token")
          ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
          : {})
      },
      body: JSON.stringify({
        duration: durationSeconds
      })
    });

    const rawText = await response.text();
    const payload = safeParseJson(rawText);

    if (!response.ok) {
      throw new Error(buildErrorMessage(payload, "获取语音临时凭证失败"));
    }

    const jwtToken = payload?.jwtToken || payload?.jwt_token;
    const appId = payload?.appId || this.config.appId;
    const resourceId = payload?.resourceId || this.config.resourceId;
    const websocketUrl = payload?.websocketUrl || this.config.websocketUrl;
    const modelName = payload?.modelName || this.config.modelName;

    if (!jwtToken) {
      throw new Error("获取语音临时凭证失败，未返回 token");
    }

    if (!appId || !resourceId || !websocketUrl) {
      throw new Error("语音识别配置不完整");
    }

    return {
      jwtToken,
      appId,
      resourceId,
      websocketUrl,
      modelName
    };
  }

  async startStreaming({
    uid = "web-user",
    onStart,
    onPartial,
    onClose,
    onError
  }) {
    await this.stopStreaming({
      silent: true
    });

    const sessionConfig = await this.fetchSessionConfig();
    const { LabASR } = await import("byted-ailab-speech-sdk");
    const connectTimeoutMs = this.config.connectTimeoutMs || 10000;

    return new Promise((resolve, reject) => {
      const self = this;
      let settled = false;
      let latestText = "";
      let timeoutId = window.setTimeout(() => {
        fail(new Error("语音识别连接超时"));
      }, connectTimeoutMs);

      function clearTimeoutGuard() {
        if (!timeoutId) {
          return;
        }

        window.clearTimeout(timeoutId);
        timeoutId = 0;
      }

      function rejectOrNotify(error) {
        if (!settled) {
          settled = true;
          reject(error);
          return;
        }

        onError?.(error);
      }

      function fail(rawError) {
        clearTimeoutGuard();

        if (self.currentSession?.client === client) {
          self.currentSession = null;
        }

        const error =
          rawError instanceof Error ? rawError : new Error("语音识别连接失败");

        rejectOrNotify(error);
      }

      const client = LabASR({
        onMessage(text, payload) {
          latestText = normalizeStreamingText(text, payload);
          onPartial?.(latestText, payload);
        },
        onStart: async () => {
          clearTimeoutGuard();

          if (!settled) {
            settled = true;
            resolve();
          }

          try {
            await client.startRecord({}, () => {});
            onStart?.();
          } catch (_error) {
            fail(new Error("麦克风不可用，请检查浏览器权限"));
          }
        },
        onClose: () => {
          clearTimeoutGuard();

          if (self.currentSession?.client === client) {
            self.currentSession = null;
          }

          onClose?.(latestText);
        },
        onError: () => {
          fail(new Error("语音识别连接异常"));
        }
      });

      self.currentSession = {
        client
      };

      client.connect({
        url: buildAuthUrl(sessionConfig.websocketUrl, {
          api_resource_id: sessionConfig.resourceId,
          api_app_key: sessionConfig.appId,
          api_access_key: `Jwt; ${sessionConfig.jwtToken}`
        }),
        config: {
          user: {
            uid
          },
          audio: {
            format: "pcm",
            rate: 16000,
            bits: 16,
            channel: 1
          },
          request: {
            model_name: sessionConfig.modelName,
            show_utterances: true
          }
        }
      });
    });
  }

  async stopStreaming({ silent = false } = {}) {
    const session = this.currentSession;
    this.currentSession = null;

    if (!session?.client) {
      return;
    }

    try {
      session.client.stopRecord();
    } catch (error) {
      if (!silent) {
        throw error;
      }
    }
  }
}
