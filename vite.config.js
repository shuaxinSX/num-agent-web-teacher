import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { createApiRequestHandler, getServerRuntimeConfig } from "./scripts/server-core.mjs";

function agentApiPlugin(env) {
  const runtimeConfig = getServerRuntimeConfig(env);
  const handleApiRequest = createApiRequestHandler(runtimeConfig);

  return {
    name: "agent-api-plugin",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (await handleApiRequest(req, res)) {
          return;
        }

        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (await handleApiRequest(req, res)) {
          return;
        }

        next();
      });
    }
  };
}
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = Number(env.VITE_AGENT_PORT || 4173);
  const backendUrl = env.VITE_BACKEND_URL || "http://127.0.0.1:5000";

  const isSingleFile = mode === "singlefile";

  return {
    plugins: [
      react(),
      // In dev mode, we proxy /api to Express server, so we don't need the local agentApiPlugin middleware
      ...(isSingleFile ? [viteSingleFile()] : []),
    ],
    ...(isSingleFile && {
      build: {
        assetsInlineLimit: 100_000_000,
        rollupOptions: {
          output: { inlineDynamicImports: true },
        },
      },
    }),
    server: {
      host: "127.0.0.1",
      port,
      proxy: {
        "/api": {
          target: backendUrl,
          changeOrigin: true
        }
      }
    },
    preview: {
      host: "127.0.0.1",
      port,
      proxy: {
        "/api": {
          target: backendUrl,
          changeOrigin: true
        }
      }
    }
  };
});
