import Fastify from "fastify";
import { z } from "zod";

const renderRequestSchema = z.object({
  projectId: z.string(),
  template: z.enum(["meme", "slideshow", "fade"]),
  assetIds: z.array(z.string()),
  caption: z.string().optional()
});

const app = Fastify({ logger: true });

app.get("/health", async () => ({
  status: "ok",
  service: "renderer",
  pipeline: "remotion+ffmpeg"
}));

app.post("/render", async (request, reply) => {
  const parsed = renderRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    reply.code(400);
    return { error: "Invalid render request", issues: parsed.error.issues };
  }

  return {
    accepted: true,
    status: "queued",
    job: {
      template: parsed.data.template,
      renderPipeline: "remotion+ffmpeg"
    }
  };
});

const port = Number(process.env.RENDERER_PORT ?? 4300);
app.listen({ port, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
