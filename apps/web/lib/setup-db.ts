import { sql } from "@vercel/postgres";
import { readFileSync } from "fs";
import { join } from "path";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

async function setup() {
  try {
    // Read the schema file
    const schema = readFileSync(
      join(process.cwd(), "lib", "schema.sql"),
      "utf-8"
    );

    // Execute the schema
    await sql.query(schema);

    console.log("Database setup completed successfully");
  } catch (error) {
    console.error("Error setting up database:", error);
    process.exit(1);
  }
}

setup();
