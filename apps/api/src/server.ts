import { createApp } from "./app";
import { config } from "./lib/config";
import { logger } from "./lib/logger";

const app = createApp();

app.listen(config.port, () => {
  logger.info("API listening", { url: `http://localhost:${config.port}`, nodeEnv: config.nodeEnv });
});
