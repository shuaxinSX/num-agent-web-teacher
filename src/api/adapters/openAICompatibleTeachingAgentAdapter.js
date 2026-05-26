export class OpenAICompatibleTeachingAgentAdapter {
  constructor(config) {
    this.config = config;
  }

  isMiniMaxEndpoint() {
    return this.config.serverProxy
      ? /minimax/i.test(this.config.model || "")
      : /minimax/i.test(this.config.baseUrl);
  }

  ensureConfigured() {
    if (!this.config.serverProxy && !this.config.apiKey) {
      throw new Error("未配置 VITE_AGENT_API_KEY，无法调用真实 API。");
    }
  }

  buildHeaders() {
    const headers = {
      "Content-Type": "application/json"
    };

    if (this.config.serverProxy) {
      const token = localStorage.getItem("token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    } else if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  getContextBudget() {
    return {
      maxMessages: 18,
      maxChars: 18000
    };
  }

  delay(ms) {
    return new Promise((resolve) => {
      globalThis.setTimeout(resolve, ms);
    });
  }

  shouldFallbackToNonStream(error) {
    const message = String(error?.message || error || "");

    return (
      /failed to fetch/i.test(message) ||
      /networkerror/i.test(message) ||
      /terminated/i.test(message) ||
      /body stream/i.test(message) ||
      /load failed/i.test(message)
    );
  }

  buildConnectionError() {
    const baseUrl = this.config.baseUrl.replace(/\/$/, "");

    if (this.config.serverProxy) {
      return new Error(
        `无法连接本地助教代理：${baseUrl}/chat/completions。请确认开发服务仍在运行，然后重试。`
      );
    }

    return new Error(
      `无法连接模型接口：${baseUrl}/chat/completions。请检查网络或接口地址配置。`
    );
  }

  normalizeRequestError(error) {
    if (error instanceof Error) {
      if (
        /^API 请求失败：/.test(error.message) ||
        error.message === "API 没有返回可用内容。" ||
        error.message === "流式响应未返回可用内容。" ||
        error.message === "当前环境不支持流式响应读取。" ||
        /未配置/.test(error.message)
      ) {
        return error;
      }
    }

    if (this.shouldFallbackToNonStream(error)) {
      return this.buildConnectionError();
    }

    return error instanceof Error ? error : new Error(String(error || "请求失败"));
  }

  async fetchWithRetry(url, init, { retries = 0, retryDelayMs = 250 } = {}) {
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await fetch(url, init);
      } catch (error) {
        lastError = error;

        if (attempt === retries || !this.shouldFallbackToNonStream(error)) {
          break;
        }

        await this.delay(retryDelayMs * (attempt + 1));
      }
    }

    throw lastError;
  }

  stripThinkTags(content) {
    return content.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim();
  }

  async parseEventStream(response, handlers = {}) {
    if (!response.body) {
      throw new Error("当前环境不支持流式响应读取。");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    const processLine = (line) => {
      const trimmed = line.trim();

      if (!trimmed.startsWith("data:")) {
        return;
      }

      const payloadText = trimmed.slice(5).trim();

      if (!payloadText || payloadText === "[DONE]") {
        return;
      }

      let payload;
      try {
        payload = JSON.parse(payloadText);
      } catch (_error) {
        return;
      }

      const delta = payload.choices?.[0]?.delta;
      const finishReason = payload.choices?.[0]?.finish_reason;

      if (delta?.reasoning_content) {
        handlers.onReasoning?.(delta.reasoning_content);
      }

      if (delta?.content) {
        handlers.onToken?.(delta.content);
      }

      if (finishReason) {
        handlers.onFinish?.(finishReason);
      }
    };

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";

      for (const line of lines) {
        processLine(line);
      }
    }

    if (buffer.trim()) {
      processLine(buffer);
    }
  }

  async requestCompletion(messages, options = {}) {
    this.ensureConfigured();

    const baseUrl = this.config.baseUrl.replace(/\/$/, "");
    const requestBody = {
      model: options.model || this.config.model,
      temperature: options.temperature ?? 0.7,
      messages
    };

    // MiniMax 官方文档建议开启 reasoning_split，避免把思考内容混入 content。
    if (this.isMiniMaxEndpoint()) {
      requestBody.reasoning_split = true;
    }

    try {
      const response = await this.fetchWithRetry(
        `${baseUrl}/chat/completions`,
        {
          method: "POST",
          headers: this.buildHeaders(),
          body: JSON.stringify(requestBody)
        },
        {
          retries: 1
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API 请求失败：${response.status} ${errorText.slice(0, 180)}`);
      }

      const payload = await response.json();
      const message = payload.choices?.[0]?.message ?? {};
      const rawContent = message.content;
      const content = typeof rawContent === "string" ? this.stripThinkTags(rawContent) : rawContent;
      const reasoning = typeof message.reasoning_content === "string" ? message.reasoning_content.trim() : "";

      if (!content) {
        throw new Error("API 没有返回可用内容。");
      }

      return { content: content.trim(), reasoning };
    } catch (error) {
      throw this.normalizeRequestError(error);
    }
  }

  buildSystemPrompt() {
    return "你是一个有帮助、准确、简洁的 AI 助手。";
  }

  trimMessagesForRequest(messages) {
    const normalizedMessages = Array.isArray(messages)
      ? messages.filter(
          (message) =>
            message &&
            typeof message.role === "string" &&
            typeof message.content === "string"
        )
      : [];

    const { maxMessages, maxChars } = this.getContextBudget();
    const selected = [];
    let totalChars = 0;

    for (let index = normalizedMessages.length - 1; index >= 0; index -= 1) {
      const message = normalizedMessages[index];
      const estimatedChars = message.content.length + 80;
      const exceedsMessageLimit = selected.length >= maxMessages;
      const exceedsCharLimit = totalChars + estimatedChars > maxChars;

      if (selected.length > 0 && (exceedsMessageLimit || exceedsCharLimit)) {
        break;
      }

      selected.push(message);
      totalChars += estimatedChars;
    }

    return selected.reverse();
  }

  buildRequestMessages(messages, systemPrompt) {
    const trimmedMessages = this.trimMessagesForRequest(messages);
    const baseSystemPrompt = systemPrompt || this.buildSystemPrompt();
    const effectiveSystemPrompt =
      trimmedMessages.length < messages.length
        ? `${baseSystemPrompt}\n当前只提供最近几轮对话作为上下文；如果缺少更早信息，请直接说明，不要自行补造。`
        : baseSystemPrompt;

    return effectiveSystemPrompt
      ? [
          {
            role: "system",
            content: effectiveSystemPrompt
          },
          ...trimmedMessages
        ]
      : trimmedMessages;
  }

  async chat({ messages, model, systemPrompt }) {
    const nextMessages = this.buildRequestMessages(messages, systemPrompt);
    const result = await this.requestCompletion(nextMessages, { model });
    return result.content;
  }

  async chatStream({ messages, model, systemPrompt, onToken, onReasoning }) {
    this.ensureConfigured();

    const nextMessages = this.buildRequestMessages(messages, systemPrompt);
    const baseUrl = this.config.baseUrl.replace(/\/$/, "");
    const requestBody = {
      model: model || this.config.model,
      temperature: 0.7,
      stream: true,
      messages: nextMessages
    };

    if (this.isMiniMaxEndpoint()) {
      requestBody.reasoning_split = true;
    }

    try {
      const response = await this.fetchWithRetry(
        `${baseUrl}/chat/completions`,
        {
          method: "POST",
          headers: this.buildHeaders(),
          body: JSON.stringify(requestBody)
        },
        {
          retries: 1
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API 请求失败：${response.status} ${errorText.slice(0, 180)}`);
      }

      let aggregated = "";
      let aggregatedReasoning = "";
      await this.parseEventStream(response, {
        onToken: (token) => {
          aggregated += token;
          onToken?.(token, aggregated);
        },
        onReasoning: (token) => {
          aggregatedReasoning += token;
          onReasoning?.(token, aggregatedReasoning);
        }
      });

      const cleaned = this.stripThinkTags(aggregated);
      if (!cleaned) {
        throw new Error("流式响应未返回可用内容。");
      }

      return { content: cleaned, reasoning: aggregatedReasoning.trim() };
    } catch (error) {
      if (!this.shouldFallbackToNonStream(error)) {
        throw this.normalizeRequestError(error);
      }

      return this.requestCompletion(nextMessages, {
        model: model || this.config.model,
        temperature: 0.7
      });
    }
  }

  async explainTopic(topic, context = "") {
    return this.chat({
      systemPrompt: this.buildSystemPrompt(),
      messages: [
        {
          role: "user",
          content: `请讲解主题：${topic}。当前页面上下文：${context}。`
        }
      ]
    });
  }

  async solveExample(input) {
    return this.chat({
      systemPrompt: this.buildSystemPrompt(),
      messages: [
        {
          role: "user",
          content: `请一步步讲解这个例题：${JSON.stringify(input)}`
        }
      ]
    });
  }

  async answerQuestion(question, chapter = "课程导览") {
    return this.chat({
      systemPrompt: this.buildSystemPrompt(),
      messages: [
        {
          role: "user",
          content: `当前章节：${chapter}。请回答：${question}`
        }
      ]
    });
  }
}
