/**
 * Starts local WS signaling (:3001) + Next.js dev server (:3000).
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(root, "..");

function run(command, args, name) {
  const child = spawn(command, args, {
    cwd: appRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      NEXT_PUBLIC_LETSMEET_WS_BASE_URL:
        process.env.NEXT_PUBLIC_LETSMEET_WS_BASE_URL || "ws://127.0.0.1:3001",
    },
  });
  child.on("exit", (code) => {
    console.log(`[${name}] exited (${code})`);
    process.exit(code ?? 1);
  });
  return child;
}

const ws = run(process.execPath, [path.join(root, "local-ws-signaling.mjs")], "ws");
const next = run("npx", ["next", "dev"], "next");

function shutdown() {
  ws.kill();
  next.kill();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
