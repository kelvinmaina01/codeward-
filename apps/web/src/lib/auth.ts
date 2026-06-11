import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: "http://localhost:3001" // The URL of our Hono API server
});

export const { signIn, signOut, useSession } = authClient;
