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
  baseURL: process.env.API_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET || "development-secret-key-change-in-prod",
  trustedOrigins: (request?: Request) => {
    const origin = request?.headers.get("origin") || "";
    if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
      return [origin];
    }
    return [
      "http://localhost:3000",
      "http://localhost:5173", 
      "http://localhost:5174", 
      "http://localhost:5175",
      "https://codeward-frontend-production.up.railway.app",
      process.env.FRONTEND_URL || ""
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
            
            // Assume it's OAuth if there's no password field or based on the context.
            // BetterAuth handles verification natively for OAuth. We will pass a default 
            // verification link (this would ideally route to your frontend verification page).
            const verificationLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/verify?token=example`;
            
            // For now, we assume if we reach here via social provider, we can flag isOAuth based on if the user is verified
            const isOAuth = user.emailVerified === true; 

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
