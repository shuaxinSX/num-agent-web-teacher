# 数值分析教学 Agent

一个面向教学演示的本地网页 Agent，内容覆盖：

- 梯形法
- 辛普森法
- 牛顿-科特斯公式（第一版实验区采用 3/8 闭型公式）
- 可视化实验
- 可替换 API 适配层

## 开发运行

```bash
npm install
npm run dev
```

默认地址：

```text
http://127.0.0.1:4173
```

本机使用只保留开发模式。聊天代理和语音临时票据都由 Vite 本地中间件提供，不再保留额外的分发脚本和启动器。

## API 替换

所有 agent 请求都通过 [`src/api/createTeachingAgent.js`](/Users/ccf/num-agent-web/src/api/createTeachingAgent.js) 创建实例，页面层不直接耦合具体供应商。

当前内置三种实现：

- `mock`：本地假数据，用于演示
- `openai-compatible`：兼容 OpenAI 风格接口的后端
- `local-proxy`：前端请求本地 `/api`，由本地服务代理真实模型接口

复制环境变量模板：

```bash
cp .env.example .env
```

本机开发模式示例：

```env
VITE_AGENT_API_PROVIDER=local-proxy
VITE_AGENT_API_BASE_URL=/api/agent
VITE_AGENT_API_MODEL=gpt-4.1-mini
AGENT_API_BASE_URL=https://api.openai.com/v1
AGENT_API_KEY=your_api_key
```

如果你后续要换成自己的后端，只要保证它兼容 `/chat/completions` 风格协议，或者新增一个 adapter 即可。
