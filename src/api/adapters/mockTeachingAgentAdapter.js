import { methods } from "../../content/courseContent";

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function locateMethod(text) {
  const content = text.toLowerCase();

  if (content.includes("梯形")) {
    return methods.find((method) => method.id === "trapezoid");
  }

  if (content.includes("辛普森")) {
    return methods.find((method) => method.id === "simpson");
  }

  if (
    content.includes("牛顿") ||
    content.includes("科特斯") ||
    content.includes("3/8")
  ) {
    return methods.find((method) => method.id === "newton-cotes");
  }

  return null;
}

function compareMethods() {
  return [
    "梯形法最适合拿来建立离散积分的第一直觉，因为它把曲线直接替换成折线。",
    "辛普森法通过抛物线保留更多曲率信息，所以对平滑函数通常会给出更小误差。",
    "牛顿-科特斯更适合理解“公式族”的概念：不同节点数对应不同权重模式。"
  ].join("\n");
}

export class MockTeachingAgentAdapter {
  constructor(config) {
    this.config = config;
  }

  async streamText(text, onToken) {
    const chunks = text.match(/.{1,12}/g) || [text];

    for (const chunk of chunks) {
      await wait(60);
      onToken?.(chunk);
    }
  }

  async chat({ messages, model }) {
    await wait(220);

    const lastUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user")?.content;

    if (!lastUserMessage) {
      return "这是一个 mock 对话接口。接入真实 API 后，这里会返回模型的正式回答。";
    }

    const method = locateMethod(lastUserMessage);
    if (method) {
      return `${model || this.config.model} 的 mock 回复：${method.title}页面会先给直观图像，再给公式，并通过误差项解释精度为什么会变化。`;
    }

    return `${model || this.config.model} 的 mock 回复：我已收到你的问题“${lastUserMessage}”。当前项目已经支持多轮对话和模型切换，接入真实 API 后这里会显示正式回答。`;
  }

  async chatStream({ messages, model, onToken }) {
    const answer = await this.chat({ messages, model });
    await this.streamText(answer, onToken);
    return answer;
  }

  async explainTopic(topic, context = "") {
    await wait(240);

    const method = locateMethod(`${topic} ${context}`);
    if (method) {
      return `${method.title}的核心思路是：${method.intro}\n\n可以优先关注：${method.takeaways[0]} ${method.takeaways[1]}`;
    }

    return "这个演示站默认把每个章节拆成概念、公式、误差、实现步骤和推荐示例五部分，便于逐步理解。";
  }

  async solveExample(input) {
    await wait(240);

    return `如果把 ${input.topic} 放进练习，可以先展示公式，再改变参数并观察误差变化。`;
  }

  async answerQuestion(question, chapter = "课程导览") {
    await wait(320);

    const method = locateMethod(`${question} ${chapter}`);
    const lowered = question.toLowerCase();

    if (lowered.includes("比较") || lowered.includes("区别")) {
      return compareMethods();
    }

    if (lowered.includes("误差")) {
      if (method) {
        return `${method.title}这部分最该盯住的是误差项对导数阶数的依赖。可以同时增大总子区间数，再观察误差下降的速度。`;
      }

      return "误差面板里的参考值来自高分辨率的复化辛普森积分，用来作为对照基准，而不是严格符号积分。";
    }

    if (method) {
      return `${method.title}当前章节可以先看几何直观，再看复化公式，最后在实验区改动参数，观察近似值和绝对误差如何变化。`;
    }

    return `你现在停留在“${chapter}”。可以先记住三种方法都来自“用插值函数逼近原函数再积分”这一共同框架。`;
  }
}
