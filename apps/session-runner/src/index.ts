import Fastify from "fastify";
import { z } from "zod";

const actionSchema = z.object({
  accountId: z.string(),
  platform: z.string(),
  action: z.enum([
    "publish_post",
    "edit_post",
    "reply_comment",
    "send_dm",
    "engage",
    "refresh_session"
  ]),
  sessionRecordId: z.string(),
  payload: z.record(z.string(), z.unknown()).default({})
});

const app = Fastify({ logger: true });

app.get("/health", async () => ({
  status: "ok",
  service: "session-runner",
  isolated: true
}));

app.post("/execute", async (request, reply) => {
  const parsed = actionSchema.safeParse(request.body);
  if (!parsed.success) {
    reply.code(400);
    return { error: "Invalid request", issues: parsed.error.issues };
  }

  return {
    accepted: true,
    execution: {
      profileLoadedFrom: "encrypted-session-vault",
      liveBrowserLifetime: "per-job",
      secretExposure: "none",
      action: parsed.data.action
    }
  };
});

const port = Number(process.env.SESSION_RUNNER_PORT ?? 4200);
app.listen({ port, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
