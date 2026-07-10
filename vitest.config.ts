import { defineConfig } from "vitest/config";
import ts from "typescript";

export default defineConfig({
  plugins: [
    {
      name: "test-tsx-transform",
      enforce: "pre",
      transform(code, id) {
        if (!id.endsWith(".tsx")) return;
        return ts.transpileModule(code, {
          compilerOptions: {
            jsx: ts.JsxEmit.ReactJSX,
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022
          },
          fileName: id
        }).outputText;
      }
    }
  ],
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.{ts,tsx}"]
  },
  resolve: {
    alias: {
      "@": new URL(".", import.meta.url).pathname
    }
  }
});
