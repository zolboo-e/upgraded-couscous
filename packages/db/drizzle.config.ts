import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

export default defineConfig({
  dialect: "postgresql",
  schema: [
    "./src/schema/companies.ts",
    "./src/schema/company-members.ts",
    "./src/schema/users.ts",
    "./src/schema/sessions.ts",
    "./src/schema/messages.ts",
    "./src/schema/projects.ts",
    "./src/schema/project-members.ts",
    "./src/schema/tasks.ts",
    "./src/schema/task-assignees.ts",
  ],
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
});
