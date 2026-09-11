const readEnv = (name: string): string => process.env[name] ?? "";

export const PORT = 3000;
export const CEREBRAS_API_KEY = readEnv("CEREBRAS_API_KEY");
export const GEMINI_API_KEY = readEnv("GEMINI_API_KEY");
export const SUPABASE_URL = readEnv("VITE_SUPABASE_URL");
export const SUPABASE_SERVICE_ROLE_KEY = readEnv("SUPABASE_SERVICE_ROLE_KEY");
export const SUPABASE_ANON_KEY = readEnv("VITE_SUPABASE_PUBLISHABLE_KEY");
