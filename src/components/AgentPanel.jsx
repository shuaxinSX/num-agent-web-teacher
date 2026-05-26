import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  createSpeechRecognitionClient,
  createTeachingAgent,
  getAgentRuntimeConfig
} from "../api/createTeachingAgent";
import { methods as courseMethods } from "../content/courseContent";
import { createAudioRecorder } from "../lib/audioRecorder";
import { HermiteClassicPage } from "./HermiteClassicPage";
import { HermitePCHIPPage } from "./HermitePCHIPPage";
import { LagrangeInteractivePage } from "./LagrangeInteractivePage";
import { MethodLearningPage } from "./MethodLearningPage";
import { NewtonInteractivePage } from "./NewtonInteractivePage";
import { NewtonCotesInteractivePage } from "./NewtonCotesInteractivePage";
import { NumericalIntegrationVisualizer } from "./NumericalIntegrationVisualizer";
import { RichTextMessage } from "./RichTextMessage";
import { SimpsonInteractivePage } from "./SimpsonInteractivePage";
import { TrapezoidInteractivePage } from "./TrapezoidInteractivePage";
import { GroupingPage } from "./GroupingPage";
import { CollectionPage } from "./CollectionPage";
import { LagrangeFeedbackPage } from "./LagrangeFeedbackPage";
import { TeacherFeedbackDashboard } from "./TeacherFeedbackDashboard";
import { EvaluationPage } from "./EvaluationPage";

const runtimeConfig = getAgentRuntimeConfig();
const STORAGE_KEY = "num-agent-chat-state-v2";

const starterPrompts = [
  "解释一下辛普森法为什么通常比梯形法精度更高。",
  "帮我写一个 Python 函数，计算复化梯形积分。",
  "把牛顿-科特斯公式族讲得通俗一点。",
  "随便问一个通用问题，测试模型切换是否正常。"
];

const featureGroups = [
  {
    title: "功能",
    items: [
      {
        id: "chat",
        title: "AI 助教",
        description: "多轮对话与模型问答"
      }
    ]
  },
  {
    title: "教学工具",
    items: [
      {
        id: "collection",
        title: "课前数据收集",
        description: "学生填写、自评与课前练习"
      },
      {
        id: "grouping",
        title: "课前弹性分组",
        description: "基于学情诊断的智能分组"
      },
      {
        id: "lagrange-feedback",
        title: "课后数据收集",
        description: "拉格朗日插值的反馈采集与诊断"
      },
      {
        id: "teacher-feedback-dashboard",
        title: "教师课后统计反馈系统",
        description: "教师端数据分析与课后统计"
      },
      {
        id: "evaluation",
        title: "智能评价系统",
        description: "全链路数字画像 · 动态评价 · 成长轨迹"
      }
    ]
  },
  {
    title: "内容页",
    items: [
      {
        id: "integration-visualizer",
        title: "图像实验",
        description: "交互观察分割、面积与误差"
      },
      {
        id: "trapezoid",
        title: "梯形法",
        description: "线性插值与几何直观"
      },
      {
        id: "simpson",
        title: "辛普森法",
        description: "抛物线逼近与精度提升"
      },
      {
        id: "newton-cotes",
        title: "牛顿-科特斯",
        description: "公式族框架与高阶反转"
      },
      {
        id: "lagrange",
        title: "拉格朗日插值",
        description: "交互式插值演示与龙格现象"
      },
      {
        id: "newton",
        title: "牛顿均差插值",
        description: "均差表、基函数与逐步构建"
      },
      {
        id: "hermite-classic",
        title: "经典埃尔米特插值",
        description: "重节点均差表与导数条件"
      },
      {
        id: "hermite-pchip",
        title: "分段三次 Hermite (PCHIP)",
        description: "保形插值与方法对比"
      }
    ]
  }
];

const COMPACT_VIEWPORT_BREAKPOINT = 980;
const featureMetaById = new Map(
  featureGroups.flatMap((group) =>
    group.items.map((item) => [item.id, { ...item, groupTitle: group.title }])
  )
);

function getFeatureGroupTitle(featureId) {
  if (featureId === "chat") {
    return "功能";
  }

  return featureMetaById.get(featureId)?.groupTitle || featureGroups[0].title;
}

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createMessage(role, content, reasoning = "") {
  return {
    id: createId(),
    role,
    content,
    reasoning
  };
}

function buildConversationTitle(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "新对话";
  }

  return normalized.length > 24 ? `${normalized.slice(0, 24)}...` : normalized;
}

function createConversation(model) {
  return {
    id: createId(),
    title: "新对话",
    model,
    messages: [],
    isCustomTitle: false
  };
}

function getInitialFeatureId() {
  if (typeof window === "undefined") {
    return "chat";
  }

  try {
    const url = new URL(window.location.href);
    const requestedFeatureId = url.searchParams.get("feature");
    const allFeatureIds = new Set(["chat", ...featureGroups.flatMap((group) => group.items.map((item) => item.id))]);
    return allFeatureIds.has(requestedFeatureId) ? requestedFeatureId : "chat";
  } catch (_) {
    return "chat";
  }
}

function getInitialState(defaultModel) {
  const fallbackConversation = createConversation(defaultModel);

  if (typeof window === "undefined") {
    return {
      conversations: [fallbackConversation],
      activeConversationId: fallbackConversation.id
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        conversations: [fallbackConversation],
        activeConversationId: fallbackConversation.id
      };
    }

    const parsed = JSON.parse(raw);
    const conversations = Array.isArray(parsed.conversations)
      ? parsed.conversations
          .filter(
            (conversation) =>
              conversation &&
              typeof conversation.id === "string" &&
              typeof conversation.title === "string" &&
              typeof conversation.model === "string" &&
              Array.isArray(conversation.messages)
          )
          .map((conversation) => ({
            ...conversation,
            isCustomTitle: Boolean(conversation.isCustomTitle),
            messages: conversation.messages
              .filter(
                (message) =>
                  message &&
                  (message.role === "user" || message.role === "assistant") &&
                  typeof message.content === "string"
              )
              .map((message) => ({
                id: typeof message.id === "string" ? message.id : createId(),
                role: message.role,
                content: message.content
              }))
          }))
      : [];

    if (conversations.length === 0) {
      return {
        conversations: [fallbackConversation],
        activeConversationId: fallbackConversation.id
      };
    }

    const activeConversationId = conversations.some(
      (conversation) => conversation.id === parsed.activeConversationId
    )
      ? parsed.activeConversationId
      : conversations[0].id;

    return {
      conversations,
      activeConversationId
    };
  } catch (_error) {
    return {
      conversations: [fallbackConversation],
      activeConversationId: fallbackConversation.id
    };
  }
}

export function AgentPanel() {
  const defaultModel = runtimeConfig.models[0] || runtimeConfig.model;
  const [speechClient] = useState(() => createSpeechRecognitionClient());
  const initialState = getInitialState(defaultModel);
  const [conversations, setConversations] = useState(() => initialState.conversations);
  const [activeConversationId, setActiveConversationId] = useState(
    () => initialState.activeConversationId
  );
  const [input, setInput] = useState("");
  const [pendingConversationId, setPendingConversationId] = useState("");
  const [error, setError] = useState("");
  const [activeFeatureId, setActiveFeatureId] = useState(() => getInitialFeatureId());
  const [speechStatus, setSpeechStatus] = useState("idle");
  const [isCompactViewport, setIsCompactViewport] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.innerWidth <= COMPACT_VIEWPORT_BREAKPOINT;
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.innerWidth <= COMPACT_VIEWPORT_BREAKPOINT || getInitialFeatureId() !== "chat";
  });
  const [expandedGroupTitle, setExpandedGroupTitle] = useState(() =>
    getFeatureGroupTitle(getInitialFeatureId())
  );
  const [showRuntimeMeta, setShowRuntimeMeta] = useState(false);
  const [globalExpr, setGlobalExpr] = useState("sin(x)");
  const [globalA, setGlobalA] = useState("0");
  const [globalB, setGlobalB] = useState("pi");
  const [lessonJumpTarget, setLessonJumpTarget] = useState(null);
  const feedRef = useRef(null);
  const textareaRef = useRef(null);
  const recorderRef = useRef(null);
  const sidebarItemRefs = useRef(new Map());
  const isSpacePressedRef = useRef(false);
  const speechSeedInputRef = useRef("");
  const speechRunIdRef = useRef("");
  const speechStopPendingRef = useRef(false);

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeConversationId) ||
    conversations[0];
  const activeFeatureMeta = featureMetaById.get(activeFeatureId) || null;
  const activeFeatureGroupTitle = getFeatureGroupTitle(activeFeatureId);
  const activeFeatureGroup =
    featureGroups.find((group) => group.title === activeFeatureGroupTitle) || null;
  const siblingFeatureItems = activeFeatureId === "chat" ? [] : activeFeatureGroup?.items || [];
  const usesFloatingSidebar = !isCompactViewport && activeFeatureId !== "chat";

  useEffect(() => {
    if (!feedRef.current) {
      return;
    }

    feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [activeConversation?.messages, pendingConversationId, error]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          conversations,
          activeConversationId
        })
      );
    } catch (_error) {
      // Ignore storage quota failures so chat does not break during long sessions.
    }
  }, [conversations, activeConversationId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    if (activeFeatureId === "chat") {
      url.searchParams.delete("feature");
    } else {
      url.searchParams.set("feature", activeFeatureId);
    }
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [activeFeatureId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(`(max-width: ${COMPACT_VIEWPORT_BREAKPOINT}px)`);
    const syncViewportState = (matches) => {
      setIsCompactViewport(matches);
    };

    syncViewportState(mediaQuery.matches);

    const handleChange = (event) => {
      syncViewportState(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    setExpandedGroupTitle(getFeatureGroupTitle(activeFeatureId));
  }, [activeFeatureId]);

  useEffect(() => {
    if (isCompactViewport) {
      setSidebarCollapsed(true);
      return;
    }

    setSidebarCollapsed(activeFeatureId !== "chat");
  }, [activeFeatureId, isCompactViewport]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    if (sidebarCollapsed || (!isCompactViewport && !usesFloatingSidebar)) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSidebarCollapsed(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCompactViewport, sidebarCollapsed, usesFloatingSidebar]);

  useEffect(() => {
    const activeItem = sidebarItemRefs.current.get(activeFeatureId);
    if (!activeItem) {
      return;
    }

    activeItem.scrollIntoView({
      block: "nearest"
    });
  }, [activeFeatureId, expandedGroupTitle]);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  useEffect(() => {
    return () => {
      if (speechClient?.mode === "streaming") {
        speechClient.stopStreaming({
          silent: true
        }).catch(() => {});
      }

      if (!recorderRef.current) {
        return;
      }

      recorderRef.current.stop().catch(() => {});
      recorderRef.current = null;
    };
  }, [speechClient]);

  useEffect(() => {
    if (activeFeatureId === "chat") {
      return;
    }

    if (speechClient?.mode === "streaming") {
      speechClient.stopStreaming({
        silent: true
      }).catch(() => {});
    }

    if (recorderRef.current) {
      recorderRef.current.stop().catch(() => {});
      recorderRef.current = null;
    }

    speechStopPendingRef.current = false;
    speechRunIdRef.current = "";
    setSpeechStatus("idle");
  }, [activeFeatureId, speechClient]);

  function handleNewChat() {
    const nextConversation = createConversation(activeConversation?.model || defaultModel);
    setConversations((current) => [nextConversation, ...current]);
    setActiveConversationId(nextConversation.id);
    setActiveFeatureId("chat");
    setInput("");
    setError("");
  }

  function handleModelChange(event) {
    const nextModel = event.target.value;
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === activeConversationId
          ? {
              ...conversation,
              model: nextModel
            }
          : conversation
      )
    );
  }

  function handleRenameConversation(conversationId) {
    const conversation = conversations.find((item) => item.id === conversationId);
    if (!conversation) {
      return;
    }

    const nextTitle = window.prompt("输入新的会话名称", conversation.title);
    if (!nextTitle || !nextTitle.trim()) {
      return;
    }

    setConversations((current) =>
      current.map((item) =>
        item.id === conversationId
          ? {
              ...item,
              title: nextTitle.trim(),
              isCustomTitle: true
            }
          : item
      )
    );
  }

  function handleDeleteConversation(conversationId) {
    const conversation = conversations.find((item) => item.id === conversationId);
    if (!conversation) {
      return;
    }

    const confirmed = window.confirm(`确定删除对话“${conversation.title}”？`);
    if (!confirmed) {
      return;
    }

    const remaining = conversations.filter((item) => item.id !== conversationId);
    const nextConversations =
      remaining.length > 0 ? remaining : [createConversation(defaultModel)];

    setConversations(nextConversations);

    if (activeConversationId === conversationId) {
      setActiveConversationId(nextConversations[0].id);
    }

    setError("");
  }

  async function streamAssistantResponse({
    conversationId,
    model,
    requestMessages,
    assistantMessageId
  }) {
    const agent = createTeachingAgent({
      model
    });

    const patchAssistant = (patch) => {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages: conversation.messages.map((message) =>
                  message.id === assistantMessageId ? { ...message, ...patch } : message
                )
              }
            : conversation
        )
      );
    };

    const { content, reasoning } = await agent.chatStream({
      model,
      messages: requestMessages.map((message) => ({
        role: message.role,
        content: message.content
      })),
      onToken: (_token, aggregated) => {
        patchAssistant({ content: aggregated });
      },
      onReasoning: (_token, aggregated) => {
        patchAssistant({ reasoning: aggregated });
      }
    });

    patchAssistant({ content, reasoning });
  }

  async function handleRegenerate(conversationId) {
    const conversation = conversations.find((item) => item.id === conversationId);
    if (!conversation || pendingConversationId) {
      return;
    }

    const lastUserIndex = [...conversation.messages]
      .map((message, index) => ({ message, index }))
      .reverse()
      .find((entry) => entry.message.role === "user")?.index;

    if (typeof lastUserIndex !== "number") {
      return;
    }

    const preservedMessages = conversation.messages.slice(0, lastUserIndex + 1);
    const assistantMessage = createMessage("assistant", "");

    setConversations((current) =>
      current.map((item) =>
        item.id === conversationId
          ? {
              ...item,
              messages: [...preservedMessages, assistantMessage]
            }
          : item
      )
    );
    setError("");
    setPendingConversationId(conversationId);

    try {
      await streamAssistantResponse({
        conversationId,
        model: conversation.model,
        requestMessages: preservedMessages,
        assistantMessageId: assistantMessage.id
      });
    } catch (caughtError) {
      setConversations((current) =>
        current.map((item) =>
          item.id === conversationId
            ? {
                ...item,
                messages: item.messages.filter((message) => message.id !== assistantMessage.id)
              }
            : item
        )
      );
      setError(caughtError.message);
    } finally {
      setPendingConversationId("");
    }
  }

  async function sendPrompt(rawPrompt) {
    const prompt = rawPrompt.trim();

    if (!prompt || !activeConversation || pendingConversationId) {
      return;
    }

    const conversationId = activeConversation.id;
    const userMessage = createMessage("user", prompt);
    const assistantMessage = createMessage("assistant", "");
    const currentModel = activeConversation.model;
    const nextMessages = [...activeConversation.messages, userMessage];

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              title:
                conversation.messages.length === 0 && !conversation.isCustomTitle
                  ? buildConversationTitle(prompt)
                  : conversation.title,
              messages: [...nextMessages, assistantMessage]
            }
          : conversation
      )
    );
    setInput("");
    setError("");
    setPendingConversationId(conversationId);

    try {
      await streamAssistantResponse({
        conversationId,
        model: currentModel,
        requestMessages: nextMessages,
        assistantMessageId: assistantMessage.id
      });
    } catch (caughtError) {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages: conversation.messages.filter(
                  (message) => message.id !== assistantMessage.id
                )
              }
            : conversation
        )
      );
      setError(caughtError.message);
    } finally {
      setPendingConversationId("");
    }
  }

  const isPending = pendingConversationId === activeConversation?.id;
  const activeMethodPage =
    courseMethods.find((method) => method.id === activeFeatureId) || null;
  const isSpeechConfigured = Boolean(speechClient?.isConfigured);
  const isVoiceHoldActive =
    speechStatus === "connecting" || speechStatus === "recording";
  const canStartVoiceInput =
    activeFeatureId === "chat" &&
    isSpeechConfigured &&
    speechStatus === "idle" &&
    !isPending &&
    textareaRef.current === document.activeElement &&
    !input.trim();

  function appendRecognizedText(text) {
    const normalized = text.trim();
    if (!normalized) {
      return;
    }

    setInput((current) => {
      const prefix = current.trimEnd();
      return prefix ? `${prefix} ${normalized}` : normalized;
    });
  }

  function replaceRecognizedText(text) {
    const normalized = text.trim();
    const prefix = speechSeedInputRef.current.trimEnd();

    if (!normalized) {
      setInput(prefix);
      return;
    }

    setInput(prefix ? `${prefix} ${normalized}` : normalized);
  }

  async function startVoiceInput() {
    if (!canStartVoiceInput || !speechClient) {
      return;
    }

    setError("");

    if (speechClient.mode === "streaming") {
      const runId = createId();
      speechSeedInputRef.current = input;
      speechRunIdRef.current = runId;
      speechStopPendingRef.current = false;
      setSpeechStatus("connecting");

      try {
        await speechClient.startStreaming({
          uid: `web-${Date.now()}`,
          onStart: () => {
            if (speechRunIdRef.current !== runId || speechStopPendingRef.current) {
              return;
            }

            setSpeechStatus("recording");
          },
          onPartial: (text) => {
            if (speechRunIdRef.current !== runId) {
              return;
            }

            replaceRecognizedText(text);
          },
          onClose: () => {
            if (speechRunIdRef.current === runId) {
              speechRunIdRef.current = "";
            }

            speechStopPendingRef.current = false;
            setSpeechStatus("idle");
            textareaRef.current?.focus();
          },
          onError: (caughtError) => {
            if (speechRunIdRef.current === runId) {
              speechRunIdRef.current = "";
            }

            speechStopPendingRef.current = false;
            setSpeechStatus("idle");
            setError(caughtError.message);
          }
        });

        if (speechRunIdRef.current === runId && speechStopPendingRef.current) {
          await speechClient.stopStreaming({
            silent: true
          });
        }
      } catch (caughtError) {
        if (speechRunIdRef.current === runId) {
          speechRunIdRef.current = "";
        }

        speechStopPendingRef.current = false;
        setSpeechStatus("idle");
        setError(caughtError.message);
      }

      return;
    }

    setSpeechStatus("recording");

    try {
      recorderRef.current = await createAudioRecorder();
    } catch (_error) {
      recorderRef.current = null;
      setSpeechStatus("idle");
      setError("麦克风不可用，请检查浏览器权限");
    }
  }

  async function stopVoiceInput() {
    if (speechClient?.mode === "streaming") {
      speechStopPendingRef.current = true;

      try {
        await speechClient.stopStreaming({
          silent: true
        });
      } catch (caughtError) {
        setError(caughtError.message);
      }

      setSpeechStatus("idle");
      textareaRef.current?.focus();
      return;
    }

    if (!recorderRef.current) {
      return;
    }

    const recorder = recorderRef.current;
    recorderRef.current = null;
    setSpeechStatus("transcribing");

    try {
      const audio = await recorder.stop();
      if (audio.durationMs < 250) {
        setSpeechStatus("idle");
        return;
      }

      const result = await speechClient.transcribe({
        audioBase64: audio.audioBase64,
        format: audio.format,
        codec: audio.codec,
        sampleRate: audio.sampleRate,
        bits: audio.bits,
        channel: audio.channel,
        uid: `web-${Date.now()}`
      });

      appendRecognizedText(result.text);
      setSpeechStatus("idle");
      textareaRef.current?.focus();
    } catch (caughtError) {
      setSpeechStatus("idle");
      setError(caughtError.message);
    }
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.code !== "Space") {
        return;
      }

      if (isSpacePressedRef.current) {
        event.preventDefault();
        return;
      }

      if (
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      ) {
        return;
      }

      if (!canStartVoiceInput) {
        return;
      }

      isSpacePressedRef.current = true;
      event.preventDefault();
      startVoiceInput();
    }

    function handleKeyUp(event) {
      if (event.code !== "Space" || !isSpacePressedRef.current) {
        return;
      }

      isSpacePressedRef.current = false;
      event.preventDefault();
      stopVoiceInput();
    }

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
    };
  }, [canStartVoiceInput, input, isVoiceHoldActive, speechClient]);

  function getSpeechHint() {
    if (!isSpeechConfigured) {
      return "语音识别未配置";
    }

    if (speechStatus === "connecting") {
      return speechClient?.mode === "streaming"
        ? "正在连接语音识别，可能在等待麦克风权限..."
        : "正在连接语音识别...";
    }

    if (speechStatus === "recording") {
      return speechClient?.mode === "streaming"
        ? "正在实时识别，松开空格结束"
        : "正在录音，松开空格转写";
    }

    if (speechStatus === "transcribing") {
      return "正在识别语音...";
    }

    return speechClient?.mode === "streaming"
      ? "文本框聚焦且为空时，按住空格实时说话"
      : "文本框聚焦且为空时，按住空格录音";
  }

  function getToolSidebarCopy() {
    if (activeMethodPage) {
      return {
        title: activeMethodPage.title,
        body: activeMethodPage.summary
      };
    }

    if (activeFeatureMeta) {
      return {
        title: activeFeatureMeta.title,
        body: activeFeatureMeta.description
      };
    }

    return {
      title: "交互提示",
      body: "点击图像区间可添加分割点，拖动滑块会恢复标准等分。"
    };
  }

  const toolSidebarCopy = getToolSidebarCopy();
  const toolTopbarCopy = activeMethodPage
    ? {
        label: "内容页",
        title: activeMethodPage.title,
        body: activeMethodPage.summary
      }
    : activeFeatureMeta
      ? {
          label: activeFeatureMeta.groupTitle,
          title: activeFeatureMeta.title,
          body: activeFeatureMeta.description
        }
      : {
          label: "功能实验区",
          title: "数值积分图像实验",
          body: "点击左侧内容页，可以在图像实验与三种积分方法之间切换。"
        };
  const collapsedSidebarLabel = activeFeatureId === "chat" ? "AI 助教" : toolTopbarCopy.title;

  function activateFeature(featureId) {
    setActiveFeatureId(featureId);
    setError("");

    if (isCompactViewport) {
      setSidebarCollapsed(true);
    }
  }

  function navigateLesson(featureId, stageId) {
    setActiveFeatureId(featureId);
    setLessonJumpTarget({ featureId, stageId });
    setError("");

    if (isCompactViewport) {
      setSidebarCollapsed(true);
    }
  }

  const shellClassName = [
    "chat-shell",
    sidebarCollapsed ? "is-collapsed" : "",
    isCompactViewport ? "is-compact" : "",
    usesFloatingSidebar ? "has-floating-sidebar" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClassName}>
      <aside className="chat-sidebar">
        {!sidebarCollapsed ? (
          <button
            type="button"
            className="sidebar-collapse-toggle"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            aria-label="收起侧边栏"
            title="收起侧边栏"
          >
            ✕
          </button>
        ) : null}
        <div className="sidebar-brand">
          <div className="brand-mark">G</div>
          <div>
            <strong>数值分析教学 Agent</strong>
            <p>课程内容、课堂工具与交互实验</p>
          </div>
        </div>

        {featureGroups.map((group) => (
          <div className="sidebar-section" key={group.title}>
            <button
              type="button"
              className={
                group.title === expandedGroupTitle
                  ? "sidebar-section-toggle is-active"
                  : "sidebar-section-toggle"
              }
              onClick={() => setExpandedGroupTitle(group.title)}
              aria-expanded={group.title === expandedGroupTitle}
            >
              <span className="sidebar-section-title">{group.title}</span>
              <span className="sidebar-section-meta">
                {group.items.length}
                <span className="sidebar-section-chevron">
                  {group.title === expandedGroupTitle ? "−" : "+"}
                </span>
              </span>
            </button>
            <div
              className={
                group.title === expandedGroupTitle
                  ? "sidebar-nav"
                  : "sidebar-nav is-collapsed"
              }
            >
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  ref={(node) => {
                    if (!node) {
                      sidebarItemRefs.current.delete(item.id);
                      return;
                    }

                    sidebarItemRefs.current.set(item.id, node);
                  }}
                  className={
                    item.id === activeFeatureId
                      ? "sidebar-nav-button is-active"
                      : "sidebar-nav-button"
                  }
                  onClick={() => activateFeature(item.id)}
                  aria-current={item.id === activeFeatureId ? "page" : undefined}
                >
                  <strong>{item.title}</strong>
                  <span className="sidebar-nav-hint">
                    {item.id === activeFeatureId ? "当前页" : "进入"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {activeFeatureId === "chat" ? (
          <>
            <button type="button" className="new-chat-button" onClick={handleNewChat}>
              新建对话
            </button>

            <div className="conversation-list">
              {conversations.map((conversation) => (
                <article
                  key={conversation.id}
                  className={
                    conversation.id === activeConversation?.id
                      ? "conversation-item is-active"
                      : "conversation-item"
                  }
                >
                  <div className="conversation-item-head">
                    <button
                      type="button"
                      className="conversation-item-main"
                      onClick={() => {
                        activateFeature("chat");
                        setActiveConversationId(conversation.id);
                      }}
                    >
                      <strong>{conversation.title}</strong>
                      <span>{conversation.model}</span>
                    </button>
                    <div className="conversation-actions">
                      <button
                        type="button"
                        className="conversation-action"
                        onClick={() => handleRenameConversation(conversation.id)}
                        aria-label="重命名对话"
                      >
                        改名
                      </button>
                      <button
                        type="button"
                        className="conversation-action conversation-action-danger"
                        onClick={() => handleDeleteConversation(conversation.id)}
                        aria-label="删除对话"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="sidebar-helper-card">
            <span className="sidebar-helper-label">当前页</span>
            <strong>{toolSidebarCopy.title}</strong>
            <span>{toolSidebarCopy.body}</span>
          </div>
        )}

        {!sidebarCollapsed ? (
          <>
            <button
              type="button"
              className={showRuntimeMeta ? "sidebar-meta-toggle is-active" : "sidebar-meta-toggle"}
              onClick={() => setShowRuntimeMeta((prev) => !prev)}
              aria-expanded={showRuntimeMeta}
            >
              运行配置
            </button>
            {showRuntimeMeta ? (
              <div className="sidebar-footer">
                <span>{runtimeConfig.provider}</span>
                <span>{runtimeConfig.baseUrl.replace(/^https?:\/\//, "")}</span>
              </div>
            ) : null}
          </>
        ) : null}
      </aside>

      {!sidebarCollapsed && (isCompactViewport || usesFloatingSidebar) ? (
        <button
          type="button"
          className="sidebar-backdrop is-visible"
          aria-label="关闭侧边栏"
          onClick={() => setSidebarCollapsed(true)}
        />
      ) : null}

      {sidebarCollapsed ? (
        <button
          type="button"
          className="sidebar-reopen-pill"
          onClick={() => setSidebarCollapsed(false)}
          aria-label="打开侧边栏导航"
          title="打开侧边栏导航"
        >
          <span className="sidebar-reopen-icon">☰</span>
          <span className="sidebar-reopen-copy">{collapsedSidebarLabel}</span>
        </button>
      ) : null}

      <section className="chat-main">
        <header className={activeFeatureId === "chat" ? "chat-topbar" : "chat-topbar tool-page-topbar"}>
          {activeFeatureId === "chat" ? (
            <>
              <div>
                <p className="topbar-label">当前对话</p>
                <h1>{activeConversation?.title || "新对话"}</h1>
              </div>
            </>
          ) : (
            <div className="tool-topbar">
              <div className="tool-topbar-copy">
                <p className="topbar-label">{toolTopbarCopy.label}</p>
                <h1>{toolTopbarCopy.title}</h1>
                <p>{toolTopbarCopy.body}</p>
              </div>
            </div>
          )}
        </header>

        {activeFeatureId !== "chat" ? (
          <div className="tool-local-nav-shell">
            <div className="tool-local-nav">
              <button
                type="button"
                className={`tool-nav-toggle ${sidebarCollapsed ? "is-collapsed" : ""}`}
                onClick={() => setSidebarCollapsed((prev) => !prev)}
                title={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
                aria-label={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginRight: "5px" }}
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18" />
                  {sidebarCollapsed ? (
                    <path d="M14 15l3-3-3-3" strokeWidth="2.5" />
                  ) : (
                    <path d="M16 9l-3 3 3 3" strokeWidth="2.5" />
                  )}
                </svg>
                <span>{sidebarCollapsed ? "展开目录" : "收起目录"}</span>
              </button>
              <div className="tool-nav-divider" aria-hidden="true" />
              {siblingFeatureItems.length > 1 ? (
                <nav className="feature-subnav" aria-label={`${activeFeatureGroupTitle} 页面切换`}>
                  {siblingFeatureItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={
                        item.id === activeFeatureId
                          ? "feature-subnav-button is-active"
                          : "feature-subnav-button"
                      }
                      onClick={() => activateFeature(item.id)}
                      aria-current={item.id === activeFeatureId ? "page" : undefined}
                    >
                      {item.title}
                    </button>
                  ))}
                </nav>
              ) : (
                <div className="tool-local-nav-spacer" aria-hidden="true" />
              )}
            </div>
          </div>
        ) : null}

        {activeFeatureId === "chat" ? (
          <>
            <div className="chat-feed" ref={feedRef}>
              {activeConversation?.messages.length ? (
                <div className="message-stream">
                  {activeConversation.messages.map((message) => (
                    <article
                      key={message.id}
                      className={
                        message.role === "assistant"
                          ? "chat-message chat-message-assistant"
                          : "chat-message chat-message-user"
                      }
                    >
                      <div className="message-avatar">
                        {message.role === "assistant" ? "AI" : "你"}
                      </div>
                      <div className="message-body">
                        {message.role === "assistant" && message.reasoning ? (
                          <details className="message-reasoning" open={!message.content}>
                            <summary>思考过程</summary>
                            <div className="message-reasoning-body">{message.reasoning}</div>
                          </details>
                        ) : null}
                        {message.content ? (
                          <RichTextMessage content={message.content} />
                        ) : message.reasoning ? null : (
                          <div className="message-body-pending">正在生成回答...</div>
                        )}
                        {message.role === "assistant" &&
                        message.id === activeConversation.messages.at(-1)?.id ? (
                          <div className="message-tools">
                            <button
                              type="button"
                              className="message-tool"
                              onClick={() => handleRegenerate(activeConversation.id)}
                              disabled={isPending}
                            >
                              重新生成
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="chat-empty">
                  <p className="eyebrow">Chat</p>
                  <h2 className="welcome-title">今天想问什么？</h2>
                  <p className="welcome-subtitle">我是您的数值分析教学助手，您可以随时向我提问。</p>

                  <div className="starter-grid">
                    {starterPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className="starter-card"
                        onClick={() => sendPrompt(prompt)}
                      >
                        <span className="starter-card-icon">✨</span>
                        <span className="starter-card-text">{prompt}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="composer-wrap">
              {error ? <div className="result-error">{error}</div> : null}

              <div className="composer-toolbar">
                <label className="model-switcher-inline">
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
                  <select
                    value={activeConversation?.model || defaultModel}
                    onChange={handleModelChange}
                  >
                    {runtimeConfig.models.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <form
                className="composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  sendPrompt(input);
                }}
              >
                <div className="composer-input-area">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.code === "Space" && (canStartVoiceInput || isVoiceHoldActive)) {
                        event.preventDefault();
                        return;
                      }

                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        sendPrompt(input);
                      }
                    }}
                    placeholder="输入任何问题，Enter 发送，Shift+Enter 换行"
                  />
                  <button type="submit" className="composer-send-button" disabled={isPending || (!input.trim() && !isVoiceHoldActive)} aria-label="发送">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                  </button>
                </div>

                <div className="composer-footer">
                  <div className="composer-meta">
                    <span className="model-name">{activeConversation?.model || defaultModel}</span>
                    <span
                      className={
                        speechStatus === "recording"
                          ? "speech-hint is-recording"
                          : "speech-hint"
                      }
                    >
                      {getSpeechHint()}
                    </span>
                  </div>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="tool-stage">
            {activeFeatureId === "collection" ? (
              <CollectionPage onOpenGrouping={() => activateFeature("grouping")} />
            ) : activeFeatureId === "lagrange-feedback" ? (
              <LagrangeFeedbackPage onOpenLagrange={() => activateFeature("lagrange")} />
            ) : activeFeatureId === "teacher-feedback-dashboard" ? (
              <TeacherFeedbackDashboard />
            ) : activeFeatureId === "evaluation" ? (
              <EvaluationPage />
            ) : activeFeatureId === "grouping" ? (
              <GroupingPage />
            ) : activeFeatureId === "simpson" ? (
              <SimpsonInteractivePage
                globalExpr={globalExpr} globalA={globalA} globalB={globalB}
                onGlobalChange={(e, a, b) => { setGlobalExpr(e); setGlobalA(a); setGlobalB(b); }}
                requestedStage={lessonJumpTarget?.featureId === "simpson" ? lessonJumpTarget.stageId : null}
                onNavigateLesson={navigateLesson}
              />
            ) : activeFeatureId === "newton-cotes" ? (
              <NewtonCotesInteractivePage
                globalExpr={globalExpr} globalA={globalA} globalB={globalB}
                onGlobalChange={(e, a, b) => { setGlobalExpr(e); setGlobalA(a); setGlobalB(b); }}
                requestedStage={
                  lessonJumpTarget?.featureId === "newton-cotes" ? lessonJumpTarget.stageId : null
                }
                onNavigateLesson={navigateLesson}
              />
            ) : activeFeatureId === "trapezoid" ? (
              <TrapezoidInteractivePage
                globalExpr={globalExpr} globalA={globalA} globalB={globalB}
                onGlobalChange={(e, a, b) => { setGlobalExpr(e); setGlobalA(a); setGlobalB(b); }}
                requestedStage={
                  lessonJumpTarget?.featureId === "trapezoid" ? lessonJumpTarget.stageId : null
                }
                onNavigateLesson={navigateLesson}
              />
            ) : activeFeatureId === "lagrange" ? (
              <LagrangeInteractivePage />
            ) : activeFeatureId === "newton" ? (
              <NewtonInteractivePage />
            ) : activeFeatureId === "hermite-classic" ? (
              <HermiteClassicPage />
            ) : activeFeatureId === "hermite-pchip" ? (
              <HermitePCHIPPage />
            ) : activeMethodPage ? (
              <MethodLearningPage
                method={activeMethodPage}
                onOpenVisualizer={() => activateFeature("integration-visualizer")}
              />
            ) : (
              <NumericalIntegrationVisualizer />
            )}
          </div>
        )}
      </section>
    </div>
  );
}
