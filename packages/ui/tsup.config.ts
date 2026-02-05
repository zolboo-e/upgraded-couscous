import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/components/*.tsx", "src/lib/*.ts", "src/hooks/*.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ["react", "react-dom"],
});
