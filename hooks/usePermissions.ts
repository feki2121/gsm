// hooks/usePermissions.ts
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface PermissionContext {
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  userRole: string;
  isLoading: boolean;
}

export function usePermissions(): PermissionContext {
  const { data: session, status } = useSession();
  const [userPermissions, setUserPermissions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPermissions() {
      if (status === "authenticated" && session?.user) {
        try {
          const response = await fetch(`/api/users/permissions?userId=${session.user.id}`);
          const data = await response.json();
          
          if (data.success) {
            setUserPermissions(new Set(data.permissions));
          }
        } catch (error) {
          console.error("Error loading permissions:", error);
        } finally {
          setIsLoading(false);
        }
      } else if (status === "unauthenticated") {
        setIsLoading(false);
      }
    }

    loadPermissions();
  }, [session, status]);

  const hasPermission = (permission: string): boolean => {
    if (status !== "authenticated") return false;
    if (session?.user?.role === "ADMIN") return true; // Admin a tous les droits
    return userPermissions.has(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(p => hasPermission(p));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(p => hasPermission(p));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    userRole: session?.user?.role || "CHAUFFEUR",
    isLoading,
  };
}