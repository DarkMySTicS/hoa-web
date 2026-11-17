// Vercel-style serverless handler. Vite's dev plugin (in vite.config.js) loads
// this module and runs it as connect middleware too, so the same code works in
// both `npm run dev` and a Vercel deployment.
//
// On Vercel: place BLOB_READ_WRITE_TOKEN in the project's env settings.
// Locally: it's read from .env (loaded by Vite's loadEnv into process.env).
import { list } from "@vercel/blob";

const PREFIX = "videos/";

const chapterNumber = (pathname) => {
  const m = pathname.match(/C(\d+)/i);
  return m ? parseInt(m[1], 10) : 999;
};

export default async function handler(req, res) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "public, max-age=300");
  if (!token) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "Missing BLOB_READ_WRITE_TOKEN" }));
    return;
  }
  try {
    const result = await list({ token, prefix: PREFIX });
    const videos = (result?.blobs || [])
      .filter((b) => b.pathname.toLowerCase().endsWith(".mp4"))
      .map((b) => ({
        pathname: b.pathname,
        url: b.url,
        size: b.size,
        chapter: chapterNumber(b.pathname),
      }))
      .sort((a, b) => a.chapter - b.chapter);
    res.statusCode = 200;
    res.end(JSON.stringify({ videos }));
  } catch (err) {
    res.statusCode = 502;
    res.end(
      JSON.stringify({ error: err?.message || "Failed to list blobs" }),
    );
  }
}
