import { ethers } from "ethers";
import { env } from "../config/env";
import { logger } from "../logger";
import { ValidationError } from "../errors";

const provider = new ethers.JsonRpcProvider(env.RPC_URL);
const wallet = new ethers.Wallet(env.PRIVATE_KEY, provider);

const HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/;
const TX_HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/;

export type SendHashResult = {
  txHash: string;
};

export type VerifyHashResult =
  | {
      status: "pending";
    }
  | {
      status: "success" | "failed";
      blockNumber: number;
      blockHash: string;
      transactionHash: string;
      confirmations: number;
    };

function ensureSha256(hashHex: string): string {
  if (!HASH_PATTERN.test(hashHex)) {
    throw new ValidationError(
      "Hash must be a 32-byte SHA-256 hex string prefixed with 0x"
    );
  }
  return hashHex.toLowerCase();
}

function ensureTxHash(txHash: string): string {
  if (!TX_HASH_PATTERN.test(txHash)) {
    throw new ValidationError("Transaction hash must be a 32-byte hex string");
  }
  return txHash.toLowerCase();
}

export async function sendHash(hashHex: string): Promise<SendHashResult> {
  const normalizedHash = ensureSha256(hashHex);

  try {
    logger.info({ hash: normalizedHash }, "Preparing transaction payload");

    const nonce = await provider.getTransactionCount(wallet.address);
    const gasLimit = 100_000n;
    const feeData = await provider.getFeeData();

    const tx: ethers.TransactionRequest = {
      to: wallet.address,
      value: 0n,
      data: normalizedHash,
      nonce,
      gasLimit,
      chainId: env.chainId,
    };

    if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
      tx.maxFeePerGas = feeData.maxFeePerGas;
      tx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
    } else if (feeData.gasPrice) {
      tx.gasPrice = feeData.gasPrice;
    } else {
      tx.gasPrice = ethers.parseUnits("50", "gwei");
    }

    const signedTx = await wallet.signTransaction(tx);
    const txHash = await provider.send("eth_sendRawTransaction", [signedTx]);

    logger.info({ txHash }, "Transaction broadcasted");

    return { txHash };
  } catch (error) {
    logger.error({ err: error }, "Failed to send hash");
    throw error;
  }
}

export async function verifyHash(
  txHash: string
): Promise<VerifyHashResult> {
  const normalizedHash = ensureTxHash(txHash);

  try {
    logger.info({ txHash: normalizedHash }, "Checking transaction receipt");
    const receipt = await provider.send("eth_getTransactionReceipt", [
      normalizedHash,
    ]);

    if (!receipt) {
      return { status: "pending" };
    }

    const status =
      parseInt(receipt.status as string, 16) === 1 ? "success" : "failed";
    const latestBlock = await provider.getBlockNumber();
    const blockNumber = parseInt(receipt.blockNumber as string, 16);

    return {
      status,
      blockNumber,
      blockHash: receipt.blockHash as string,
      transactionHash: receipt.transactionHash as string,
      confirmations: Math.max(latestBlock - blockNumber, 0),
    };
  } catch (error) {
    logger.error({ err: error, txHash: normalizedHash }, "Verification failed");
    throw error;
  }
}

