import express from "express";
import helmet from "helmet";
import { createProxyMiddleware } from "http-proxy-middleware";

const PORT = Number(process.env.PORT || 4000);
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

const app = express();
app.use(helmet());
app.disable("x-powered-by");

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "okde-api-gateway", upstream: BACKEND_URL });
});

app.use(
  "/api",
  createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req) => {
        const rid = (req.headers["x-request-id"] as string) || undefined;
        if (rid) proxyReq.setHeader("x-request-id", rid);
      },
      error: (err, _req, res) => {
        const r = res as express.Response;
        if (!r.headersSent) {
          r.status(502).json({ error: "BAD_GATEWAY", message: err.message });
        }
      }
    }
  })
);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`OKDE API gateway on :${PORT} -> ${BACKEND_URL}`);
});
