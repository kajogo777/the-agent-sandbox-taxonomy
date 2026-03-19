import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "fs";
import { resolve } from "path";
import yaml from "js-yaml";

// Load products.yaml at build time and inject as virtual module
const productsYaml = readFileSync(
  resolve(__dirname, "../products.yaml"),
  "utf-8"
);
const productsData = yaml.load(productsYaml) as { products: unknown[] };

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "inject-products",
      resolveId(id) {
        if (id === "virtual:products") return "\0virtual:products";
      },
      load(id) {
        if (id === "\0virtual:products") {
          return `export default ${JSON.stringify(productsData.products)};`;
        }
      },
    },
  ],
});
