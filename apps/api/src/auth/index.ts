import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";

if (process.env.BETTER_AUTH_URL && process.env.BETTER_AUTH_URL.includes("your-railway-api")) {
  process.env.BETTER_AUTH_URL = "https://codewardapi-production.up.railway.app";
}
if (process.env.API_URL && process.env.API_URL.includes("your-railway-api")) {
  process.env.API_URL = "https://codewardapi-production.up.railway.app";
}

const rawApiUrl = process.env.API_URL || "";
const safeApiUrl = rawApiUrl.includes("your-railway-api") || !rawApiUrl
  ? "https://codewardapi-production.up.railway.app"
  : rawApiUrl;

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
  baseURL: safeApiUrl,
  secret: process.env.BETTER_AUTH_SECRET || "development-secret-key-change-in-prod",
  advanced: {
    defaultCookieAttributes: {
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
    }
  },
  trustedOrigins: (request?: Request) => {
    const origin = request?.headers.get("origin") || "";
    if (
      origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:") ||
      origin.endsWith(".codeward.cloud") ||
      origin === "https://codeward.cloud"
    ) {
      return [origin];
    }
    return [
      "http://localhost:3000",
      "http://localhost:5173", 
      "http://localhost:5174", 
      "http://localhost:5175",
      "https://codeward.cloud",
      "https://www.codeward.cloud",
      "https://app.codeward.cloud",
      process.env.FRONTEND_URL || "",
      process.env.API_URL || ""
    ].filter(Boolean);
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      scope: ["read:org", "repo", "user:email"]
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github"],
    }
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            // Note: Since Resend is in "mock" mode until the domain is verified,
            // this will safely log to the console instead of throwing errors.
            const { NotificationService } = await import("../notifications/NotificationService.js");
            
            const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
            const isOAuth = user.emailVerified === true;
            // For OAuth users, route to repo connection; for password users, route to verification
            const verificationLink = isOAuth 
              ? `${frontendUrl}/connect-repo` 
              : `${frontendUrl}/verify-email?email=${encodeURIComponent(user.email)}`;

            await NotificationService.sendWelcomeVerification(
              user.email,
              user.name || "Developer",
              verificationLink,
              isOAuth
            );
          } catch (error) {
            console.error("Failed to send welcome email in hook:", error);
          }
        }
      }
    }
  }
});
