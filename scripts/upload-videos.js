// One-shot uploader: reads every .mp4 in public/videos/ and pushes it to
// Vercel Blob under `videos/<original-filename>`. Run once after dropping new
// files in. Idempotent: re-running with the same names overwrites the blob
// (addRandomSuffix is off so URLs stay stable).
//
// Usage:  node scripts/upload-videos.js
import "dotenv/config";
import { readdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { put } from "@vercel/blob";

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
if (!TOKEN) {
  console.error("Missing BLOB_READ_WRITE_TOKEN in .env");
  process.exit(1);
}

const VIDEOS_DIR = resolve(process.cwd(), "public/videos");

const fmtSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GiB`;
};

async function main() {
  let entries;
  try {
    entries = await readdir(VIDEOS_DIR);
  } catch (err) {
    console.error(`Could not read ${VIDEOS_DIR}:`, err.message);
    process.exit(1);
  }
  const files = entries.filter((f) => f.toLowerCase().endsWith(".mp4")).sort();
  if (files.length === 0) {
    console.warn(`No .mp4 files found in ${VIDEOS_DIR}.`);
    return;
  }
  console.log(`Uploading ${files.length} file(s) to Vercel Blob…\n`);
  for (const file of files) {
    const fullPath = resolve(VIDEOS_DIR, file);
    const [buf, info] = await Promise.all([readFile(fullPath), stat(fullPath)]);
    const pathname = `videos/${file}`;
    try {
      const blob = await put(pathname, buf, {
        access: "public",
        token: TOKEN,
        contentType: "video/mp4",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      console.log(`  ${file}  (${fmtSize(info.size)})\n    → ${blob.url}\n`);
    } catch (err) {
      console.error(`  ${file}  FAILED: ${err.message}\n`);
    }
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
