import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv with empty prefix gives us non-VITE_ vars too. We forward the
  // server-only secrets onto process.env so the api/ handlers (which also run
  // on Vercel) can read them the same way in both environments. These never
  // reach the client bundle — only the api/ modules see them.
  const env = loadEnv(mode, process.cwd(), "");
  [
    "BLOB_READ_WRITE_TOKEN",
    // Meta Conversions API — read by api/conversions.js.
    "META_CAPI_ACCESS_TOKEN",
    "META_PIXEL_ID",
    "META_TEST_EVENT_CODE",
  ].forEach((key) => {
    if (env[key]) process.env[key] = env[key];
  });

  // Every file in api/ is exposed at /api/<name> in dev, mirroring Vercel.
  const DEV_API_ROUTES = ["videos", "conversions"];

  return {
    build: {
      // Vite's default modulepreload injection was hoisting the Firebase
      // chunk (used only by the lazily-mounted ContactForm) into
      // index.html's <head>, forcing every page load to fetch it up front
      // regardless of the lazy() boundary around it. Preloading is only
      // wired up for chunks the entry actually needs synchronously.
      modulePreload: {
        resolveDependencies: (_filename, deps) =>
          deps.filter((dep) => !dep.includes("/firebase-")),
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      {
        // Local emulation of the Vercel `api/` directory. In dev, a request to
        // /api/<name> loads and runs api/<name>.js as connect middleware.
        name: "hoa-dev-api",
        configureServer(server) {
          DEV_API_ROUTES.forEach((route) => {
            server.middlewares.use(`/api/${route}`, async (req, res) => {
              try {
                const mod = await server.ssrLoadModule(`/api/${route}.js`);
                await mod.default(req, res);
              } catch (err) {
                console.error(`[/api/${route}]`, err);
                res.statusCode = 500;
                res.setHeader("content-type", "application/json");
                res.end(
                  JSON.stringify({ error: err?.message || "dev api error" }),
                );
              }
            });
          });
        },
      },
    ],
  };
});
