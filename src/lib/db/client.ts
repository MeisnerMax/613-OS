import { neon } from "@neondatabase/serverless";

export function isTaskDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function taskDatabase() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is not configured.");
  return neon(url);
}
