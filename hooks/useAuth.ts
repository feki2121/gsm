import { useSession } from "next-auth/react";

export function useAuth() {
  const { data: session, status } = useSession();
  
  const isAdmin = session?.user?.role === "ADMIN";
  const isChauffeur = session?.user?.role === "CHAUFFEUR";
  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";
  
  return {
    session,
    user: session?.user,
    isAdmin,
    isChauffeur,
    isAuthenticated,
    isLoading,
    role: session?.user?.role,
  };
}