import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Rediriger vers login si non authentifié
    if (!token && path !== "/login") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Admin peut tout voir
    if (token?.role === "ADMIN") {
      return NextResponse.next();
    }

    // Chauffeur ne peut pas accéder aux pages admin
    if (token?.role === "CHAUFFEUR") {
      // const adminRoutes = ["/clients", "/produits", "/fournisseurs", "/bons-entree"];
      // if (adminRoutes.some(route => path.startsWith(route))) {
      //   return NextResponse.redirect(new URL("/tournees", req.url));
      // }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)",
  ],
};