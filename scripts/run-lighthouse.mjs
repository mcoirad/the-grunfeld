import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const executable = path.join(root, "node_modules/.bin/lhci");
const result = spawnSync(executable, ["autorun", "--config=lighthouserc.json"], {
  cwd: root,
  env: { ...process.env, CHROME_PATH: chromium.executablePath() },
  stdio: "inherit",
});

process.exit(result.status ?? 1);
