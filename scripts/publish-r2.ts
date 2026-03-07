import { spawnSync } from "node:child_process";
import { collectPublishedDataEntries } from "../src/cloudflare/publish.js";

const rootDir = process.cwd();
const bucket = process.argv[2] ?? process.env.CLOUDFLARE_R2_BUCKET ?? "univis-alternative-data";
const prefix = process.argv[3] ?? process.env.CLOUDFLARE_DATA_PREFIX ?? "latest";

async function main(): Promise<void> {
  const entries = await collectPublishedDataEntries(rootDir, prefix);

  if (entries.length === 0) {
    throw new Error("No published data files found under site/public/data.");
  }

  for (const entry of entries) {
    const target = `${bucket}/${entry.objectKey}`;
    console.log(`Uploading ${entry.fileName} -> ${target}`);

    const result = spawnSync("npx", ["wrangler", "r2", "object", "put", target, "--file", entry.filePath], {
      cwd: rootDir,
      stdio: "inherit"
    });

    if (result.status !== 0) {
      throw new Error(`wrangler upload failed for ${entry.fileName}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
