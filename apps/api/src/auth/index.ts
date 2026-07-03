import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification
    }
  }),
  baseURL: process.env.API_URL || "http://localhost:3001",
  secret: process.env.BETTER_AUTH_SECRET || "development-secret-key-change-in-prod",
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:5173", 
    "http://localhost:5175",
    "https://codeward-frontend-production.up.railway.app",
    process.env.FRONTEND_URL || ""
  ].filter(Boolean),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      scope: ["read:user", "user:email", "read:org", "repo"]
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }
  },
});
