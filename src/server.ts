import express, { NextFunction, Request, Response } from "express";
import { env } from "./config/env";
import { sendHash, verifyHash } from "./services/hashService";
import { logger } from "./logger";
import { ValidationError } from "./errors";

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

const app = express();
app.use(express.json());

function asyncHandler(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok", chainId: env.chainId });
});

app.post(
  "/hash",
  asyncHandler(async (req, res) => {
    const body = req.body as { hash?: unknown } | undefined;
    const hash = body?.hash;

    if (typeof hash !== "string") {
      throw new ValidationError(
        "Request body must contain a string 'hash' property"
      );
    }

    const response = await sendHash(hash);

    res.status(202).json({
      message: "Hash broadcasted",
      txHash: response.txHash,
    });
  })
);

app.get(
  "/hash/:txHash",
  asyncHandler(async (req, res) => {
    const { txHash } = req.params;

    if (!txHash) {
      throw new ValidationError("Transaction hash parameter is required");
    }

    const result = await verifyHash(txHash);

    res.json(result);
  })
);

app.use(
  (
    err: unknown,
    req: Request,
    res: Response,
    _next: NextFunction
  ): Response => {
    if (err instanceof ValidationError) {
      return res.status(err.statusCode).json({ error: err.message });
    }

    logger.error({ err, path: req.path }, "Unhandled API error");
    return res.status(500).json({ error: "Unexpected server error" });
  }
);

export function startServer(): void {
  const server = app.listen(env.port, () => {
    logger.info({ port: env.port }, "HTTP server listening");
  });

  server.on("close", () => {
    logger.info("HTTP server stopped");
  });
}

if (require.main === module) {
  startServer();
}

export { app };


