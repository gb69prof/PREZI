import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // GitHub Pages-proof: works for both user site and project pages
  base: "./",
  plugins: [react()],
});
