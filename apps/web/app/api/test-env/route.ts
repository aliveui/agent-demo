import { NextResponse } from "next/server";
import getConfig from "next/config";

export async function GET() {
  const { serverRuntimeConfig, publicRuntimeConfig } = getConfig();

  // Test critical environment variables
  const envStatus = {
    openai: {
      exists: !!serverRuntimeConfig.OPENAI_API_KEY,
      preview: serverRuntimeConfig.OPENAI_API_KEY?.substring(0, 10) + "...",
    },
    database: {
      exists: !!serverRuntimeConfig.DATABASE_URL,
      preview: serverRuntimeConfig.DATABASE_URL?.substring(0, 20) + "...",
    },
    auth: {
      exists: !!serverRuntimeConfig.NEXTAUTH_SECRET,
      preview: serverRuntimeConfig.NEXTAUTH_SECRET?.substring(0, 10) + "...",
    },
    node_env: publicRuntimeConfig.NODE_ENV,
  };

  return NextResponse.json(envStatus);
}
