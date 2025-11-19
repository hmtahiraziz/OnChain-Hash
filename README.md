# On-chain Hash Service (TypeScript)

Modular Node.js service that stores SHA-256 hashes on Ethereum-compatible chains using native JSON-RPC calls only (`eth_sendRawTransaction` and `eth_getTransactionReceipt`). Includes structured logging, strict environment validation, a CLI runner, and a production-ready HTTP API for Postman or any other client.

## Project Structure

- `src/config/env.ts` – loads and validates required environment variables (RPC, signer key, chainId, port).
- `src/logger.ts` – configures Pino logger (pretty output in development).
- `src/services/hashService.ts` – exposes `sendHash` and `verifyHash`.
- `src/server.ts` – Express server that wraps the services with JSON endpoints.
- `src/index.ts` – CLI entry point that reuses the same services for scripting.
- `src/errors.ts` – shared error types (validation, etc.).

## Setup

```bash
cd onchain-hash-ts
cp env.example .env        # populate RPC_URL, PRIVATE_KEY, CHAIN_ID, optional PORT
npm install
```

## Scripts

- `npm run dev` – start the HTTP API with ts-node (hot reload friendly).
- `npm run start` – run the compiled HTTP API from `dist/server.js`.
- `npm run dev:cli -- <send|verify> <value>` – run the CLI via ts-node.
- `npm run start:cli -- <send|verify> <value>` – run the compiled CLI.
- `npm run build` – compile TypeScript to `dist/`.
- `npm run lint` – type-check without emitting files.

## HTTP API

Start the API (`npm run dev` or `npm run start`) and send requests to `http://localhost:<PORT>` (default `3000`).

| Method | Path            | Description                                   |
| ------ | --------------- | --------------------------------------------- |
| GET    | `/healthz`      | Returns `{ status: "ok", chainId }`.          |
| POST   | `/hash`         | Body `{ "hash": "0x..." }`; broadcasts hash.  |
| GET    | `/hash/:txHash` | Returns confirmation status for transaction.  |

### Example Postman Request

1. **POST** `http://localhost:3000/hash`
   ```json
   {
     "hash": "0x1234...abcd"
   }
   ```
   Response:
   ```json
   {
     "message": "Hash broadcasted",
     "txHash": "0xdeadbeef..."
   }
   ```

2. **GET** `http://localhost:3000/hash/0xdeadbeef...`
   ```json
   {
     "status": "success",
     "blockNumber": 123,
     "blockHash": "0x...",
     "transactionHash": "0xdeadbeef...",
     "confirmations": 12
   }
   ```

Errors are surfaced as JSON payloads with meaningful HTTP status codes (e.g., 400 for malformed hashes, 500 for unexpected RPC failures), which keeps Postman collections clean.

## Programmatic Usage

```ts
import { sendHash, verifyHash } from "./dist";

const { txHash } = await sendHash("0x1234..."); // 32-byte SHA-256 hex
const verification = await verifyHash(txHash);
```

Both helpers throw if inputs are malformed or if RPC calls fail, so wrap them in try/catch and surface/log errors as needed.

