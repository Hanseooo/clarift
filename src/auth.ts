import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { client } from "./lib/api";

const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET!,
  callbacks: {
    async jwt({ token, account, profile }) {
      // Initial sign-in: account is present
      if (account && profile && !token.synced) {
        try {
          // Use Google ID token if available (JWT signed by Google)
          const idToken = account.id_token;
          if (!idToken) {
            console.warn("No ID token available for sync");
            return token;
          }
          // Call backend sync endpoint with the ID token
          const syncResponse = await client.POST("/api/v1/auth/sync", {
            body: { token: idToken },
          });
          if (syncResponse.error) {
            console.error("Failed to sync user with backend:", syncResponse.error);
          } else {
            // Mark as synced to avoid repeated calls
            token.synced = true;
          }
        } catch (error) {
          console.error("Error syncing user with backend:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Pass synced flag to session if needed
      if (session.user) {
        session.user.id = token.sub!;
        // Add any other token data to session
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);