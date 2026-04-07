import { installProxyAwareFetch } from "./fetch-with-proxy.js";
import { app } from "./server.js";

installProxyAwareFetch();

const port = Number(process.env.API_PORT ?? 4000);
const host = "0.0.0.0";

app
  .listen({ port, host })
  .then(() => {
    app.log.info(`API listening on http://${host}:${port}`);
  })
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
