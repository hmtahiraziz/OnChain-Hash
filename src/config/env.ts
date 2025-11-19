import { config } from "dotenv";

config();

const requiredEnvVars = ["RPC_URL", "PRIVATE_KEY", "CHAIN_ID"] as const;

type RequiredEnv = {
  [K in (typeof requiredEnvVars)[number]]: string;
};

function resolvePort(): number {
  const rawPort = process.env.PORT ?? "3000";
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  return port;
}

function getEnv(): RequiredEnv & { chainId: number; port: number } {
  const missing: string[] = [];
  const values = {} as RequiredEnv;

  for (const key of requiredEnvVars) {
    const value = process.env[key];
    if (!value) {
      missing.push(key);
      continue;
    }
    values[key] = value;
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  const chainId = Number(values.CHAIN_ID);
  if (Number.isNaN(chainId)) {
    throw new Error("CHAIN_ID must be a valid number");
  }

  return {
    ...values,
    chainId,
    port: resolvePort(),
  };
}

export const env = getEnv();

