import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

await build({
  entryPoints: ["worker/index.js"],
  bundle: true,
  format: "esm",
  target: "es2022",
  outfile: "dist/server/index.js",
  loader: { ".html": "text", ".css": "text", ".jpg": "binary" },
  plugins: [{
    name: "text-assets",
    setup(builder) {
      builder.onResolve({ filter: /\?raw$/ }, (args) => ({
        path: resolve(args.resolveDir, args.path.slice(0, -4)), namespace: "text-assets"
      }));
      builder.onLoad({ filter: /.*/, namespace: "text-assets" }, async (args) => ({
        contents: await readFile(args.path, "utf8"), loader: "text"
      }));
    }
  }]
});
