import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { getGoogleOAuthConfig } from "@/lib/env";
import { prisma } from "@/lib/prisma";

const googleOAuthConfig = getGoogleOAuthConfig();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
  },
  providers: [
    GoogleProvider({
      clientId: googleOAuthConfig.clientId,
      clientSecret: googleOAuthConfig.clientSecret,
    }),
  ],
  pages: {
    signIn: "/",
  },
  callbacks: {
    session: ({ session, user }) => {
      if (session.user) {
        session.user.id = user.id;
      }

      return session;
    },
  },
};