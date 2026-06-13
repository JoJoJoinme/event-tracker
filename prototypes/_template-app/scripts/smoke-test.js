import { readFileSync, existsSync } from "node:fs";

const requiredFiles = [
  "index.html",
  "src/main.js",
  "src/styles.css",
  "src/data/mock-data.js",
  "prototype.json"
];

const missing = requiredFiles.filter((file) => !existsSync(file));

if (missing.length > 0) {
  console.error(`Missing required files: ${missing.join(", ")}`);
  process.exit(1);
}

const prototype = JSON.parse(readFileSync("prototype.json", "utf8"));

if (!prototype.name || !prototype.stage || !prototype.path) {
  console.error("prototype.json must include name, stage, and path");
  process.exit(1);
}

console.log(`Smoke test passed for ${prototype.name} at ${prototype.stage}`);
