import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Increase timeout for tests using the OpenAI API
jest.setTimeout(30000);
