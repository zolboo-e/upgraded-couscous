import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

export default defineConfig({
  dialect: "postgresql",
  schema: [
    "./src/schema/users.ts",
    "./src/schema/sessions.ts",
    "./src/schema/messages.ts",
    "./src/schema/auth-sessions.ts",
  ],
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
});
