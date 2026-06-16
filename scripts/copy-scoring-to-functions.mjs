/**
 * Copies the built @bolao/scoring package into functions/packages/scoring
 * so Cloud Build can resolve the local file: dependency during npm install.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(fileURLToPath(import.meta.url), "../..");
const src = path.join(root, "packages/scoring");
const dest = path.join(root, "functions/packages/scoring");

fs.mkdirSync(path.join(dest, "dist"), { recursive: true });

// Copy package.json
fs.copyFileSync(path.join(src, "package.json"), path.join(dest, "package.json"));

// Copy all dist files
for (const file of fs.readdirSync(path.join(src, "dist"))) {
  fs.copyFileSync(path.join(src, "dist", file), path.join(dest, "dist", file));
}

console.log("Copied @bolao/scoring dist → functions/packages/scoring");
