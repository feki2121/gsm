// types/next-auth.d.ts
import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    chauffeurId?: string;
  }

  interface Session {
    user: {
      id: string;
      role: string;
      chauffeurId: string;
      vehiculeId: string;
      phone: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    chauffeurId?: string;
  }
}