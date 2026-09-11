import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl = env.VITE_SUPABASE_URL || "https://blrtzldmsktzrxpbogfu.supabase.co";
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscnR6bGRtc2t0enJ4cGJvZ2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3OTA2MzMsImV4cCI6MjA4ODM2NjYzM30.b9mNlriXMzI8j_bID0kZDSfX4nwQ9Y9orlYzVDvKQi8";

  return {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(backendUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(publishableKey),
    },
    server: {
      host: "0.0.0.0",
      port: 8080,
      allowedHosts: true,
      proxy: {
        "/api": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
