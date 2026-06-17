import { createAuthClient } from "better-auth/react";

import { API_URL } from './api';

export const authClient = createAuthClient({
    baseURL: API_URL // The URL of our Hono API server
});

export const { signIn, signOut, useSession } = authClient;
