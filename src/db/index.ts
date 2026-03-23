import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString, {
  prepare: false, // Required for Supabase transaction mode pooler
  max: 1, // Serverless: one connection per invocation
  idle_timeout: 20,
});
export const db = drizzle(client, { schema });
