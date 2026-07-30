// lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                phone: { label: "Téléphone", type: "phone" },
                password: { label: "Mot de passe", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.phone || !credentials?.password) {
                    throw new Error("Téléphone et mot de passe requis");
                }

                const user = await prisma.user.findFirst({
                    where: {
                        phone: credentials.phone
                    },
                    include: {
                        chauffeur: {
                            include: {
                                vehicule: true
                            }
                        }
                    }
                });

                if (!user) {
                    throw new Error("Téléphone ou mot de passe incorrect");
                }

                const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

                if (!isPasswordValid) {
                    throw new Error("Téléphone ou mot de passe incorrect");
                }

                return {
                    id: user.id,
                    phone: user.phone,
                    name: user.nom,
                    role: user.role,
                    chauffeurId: user.chauffeur?.id,
                };
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.chauffeurId = user.chauffeurId;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.chauffeurId = token.chauffeurId as string;
            }
            return session;
        }
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 jours
    },
    secret: process.env.NEXTAUTH_SECRET,
};