import pino from "pino";

const level = process.env.LOG_LEVEL ?? "info";

const transport =
  process.env.NODE_ENV === "production"
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
        },
      };

export const logger = pino({
  name: "onchain-hash-service",
  level,
  ...(transport ? { transport } : {}),
});

