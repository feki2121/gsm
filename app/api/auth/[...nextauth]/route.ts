// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        phone: { label: "Téléphone", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log("credentials:", credentials);

        if (!credentials?.phone || !credentials?.password) {
          throw new Error("Téléphone et mot de passe requis");
        }

        const user = await prisma.user.findUnique({
          where: { phone: credentials.phone },
        });

        console.log("user:", user);

        if (!user) {
          throw new Error("Utilisateur non trouvé");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        console.log("isValid:", isValid);

        if (!isValid) {
          throw new Error("Mot de passe incorrect");
        }

        return user;
      }
    })
  ],
  session: {
    strategy: "jwt" as const, // Add 'as const' to fix the type error
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }: any) { // Add :any to fix parameter types
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.chauffeurId = user.chauffeurId;
        token.vehiculeId = user.vehiculeId;
        token.phone = user.phone;
      }
      return token;
    },
    async session({ session, token }: any) { // Add :any to fix parameter types
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.chauffeurId = token.chauffeurId as string;
        session.user.vehiculeId = token.vehiculeId as string;
        session.user.phone = token.phone as string;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
} as const;

const handler = NextAuth(authOptions as unknown as AuthOptions);

export { handler as GET, handler as POST };