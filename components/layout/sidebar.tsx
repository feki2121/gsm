"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Truck,
  Landmark,
  Settings,
  ChevronDown,
  ShoppingCart,
  ShoppingBag,
  Store,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  children?: { title: string; href: string }[];
}

export function Sidebar() {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch(`/api/users/me`);
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.role || "ADMIN");
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setUserRole("ADMIN");
      }
    };
    fetchUserRole();
  }, []);

  const navigation = useMemo<NavItem[]>(() => [
    {
      title: "Tableau de bord",
      href: "/",
      icon: LayoutDashboard,
    },
    ...(userRole === "ADMIN" ? [{
      title: "Achats",
      icon: ShoppingBag,
      children: [
        { title: "Fournisseurs", href: "/fournisseurs" },
        { title: "Bons d'Entrée", href: "/bons-entree" },
        { title: "Retours Fournisseurs", href: "/retours-fournisseurs" },
        { title: "Règlements Fournisseurs", href: "/reglements/fournisseurs" },
        { title: "Soldes Fournisseurs", href: "/fournisseurs/solde" },
      ],
    },] : []),
    {
      title: "Ventes",
      icon: ShoppingCart,
      children: [
        { title: "Clients Prospects", href: "/clientsprospects/clients?seulementProspects=true" },
        { title: "Clients", href: "/clients" },
        { title: "Devis", href: "/devis" },
        { title: "Bons de Livraison", href: "/bons-livraison" },
         { title: "Bons de Sortie", href: "/bons-sortie" },
        { title: "Bons de transfert", href: "/transferts" },
        ...(userRole === "ADMIN"
          ? [
            { title: "Factures Clients", href: "/factures" },
          ]
          : []),
        { title: "Retours Clients", href: "/retours-clients" },
        { title: "Règlements Clients", href: "/reglements/clients" },
        { title: "Soldes Clients", href: "/clients/solde" },
      ],
    },
    {
      title: "Stock & Produits",
      icon: Package,
      children: [
        { title: "Produits", href: "/produits" },

        ...(userRole === "ADMIN"
          ? [
            { title: "Catégories", href: "/categories" },
            { title: "Alertes Stock", href: "/stock/alertes" },
            { title: "Transfert Stock", href: "/transferts" },
          ]
          : []),

        { title: "Inventaire Journalier", href: "/inventaire-journalier" },
        { title: "Inventaires", href: "/inventaires" },
      ],
    },
    {
      title: "Logistique",
      icon: Truck,
      children: [
        { title: "Tournée", href: "/tournees" },
      ],
    },
    {
      title: "Finances",
      icon: Landmark,
      children: [
        { title: "État de Caisse", href: "/caisse/etat" },
        { title: "Clôture", href: "/caisse" },
        ...(userRole === "ADMIN"
          ? [
            { title: "Dépenses Diverses", href: "/reglements/divers" },
          ]
          : []),
      ],
    },
    ...(userRole === "ADMIN" ? [{

      title: "Paramètres",
      icon: Settings,
      children: [
        { title: "Emplacements", href: "/emplacements" },
        { title: "Véhicules", href: "/vehicules" },
        { title: "Utilisateurs", href: "/utilisateurs" },
        { title: "Chauffeurs", href: "/chauffeurs" },
      ],
    },
    ] : []),
  ], [userRole]);

  useEffect(() => {
    const menusToOpen: string[] = [];

    navigation.forEach((item) => {
      if (item.children) {
        const isChildActive = item.children.some((child) => child.href === pathname);
        if (isChildActive) {
          menusToOpen.push(item.title);
        }
      }
    });

    if (menusToOpen.length > 0) {
      setOpenMenus((prev) => {
        const newMenus = [...prev];
        menusToOpen.forEach((menu) => {
          if (!newMenus.includes(menu)) {
            newMenus.push(menu);
          }
        });
        return newMenus;
      });
    }
  }, [pathname, navigation]);

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      <aside className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar text-sidebar-foreground transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}>
        {/* Logo */}
        <div className={cn(
          "flex h-16 items-center border-b border-sidebar-border",
          isCollapsed ? "justify-center px-2" : "gap-3 px-4"
        )}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Store className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold">CHIHA GSM</span>
              <span className="text-xs text-sidebar-foreground/60">Facturation & Stock</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.title}>
                {item.children ? (
                  <div>
                    <button
                      onClick={() => !isCollapsed && toggleMenu(item.title)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        !isCollapsed && item.children.some((child) => pathname === child.href)
                          ? "bg-sidebar-accent/50 text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80",
                        isCollapsed && "justify-center px-2"
                      )}
                      title={isCollapsed ? item.title : undefined}
                    >
                      <span className={cn(
                        "flex items-center gap-3",
                        isCollapsed && "justify-center"
                      )}>
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && item.title}
                      </span>
                      {!isCollapsed && (
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            openMenus.includes(item.title) && "rotate-180"
                          )}
                        />
                      )}
                    </button>
                    {!isCollapsed && openMenus.includes(item.title) && (
                      <ul className="ml-7 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className={cn(
                                "block rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                pathname === child.href
                                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                                  : "text-sidebar-foreground/70"
                              )}
                            >
                              {child.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.href!}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      pathname === item.href
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/80",
                      isCollapsed && "justify-center px-2"
                    )}
                    title={isCollapsed ? item.title : undefined}
                  >
                    <item.icon className="h-4 w-4" />
                    {!isCollapsed && item.title}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-4">
          <div className={cn(
            "flex items-center gap-3",
            isCollapsed && "justify-center"
          )}>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground">
              <span className="text-xs font-medium">{userRole.charAt(0)}</span>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-medium">{userRole}</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Bouton toggle */}
      <button
        onClick={toggleSidebar}
        className={cn(
          "fixed z-50 rounded-full bg-sidebar-primary p-1.5 shadow-lg transition-all duration-300 hover:bg-sidebar-primary/80",
          isCollapsed ? "left-16 top-20" : "left-64 top-20"
        )}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-sidebar-primary-foreground" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-sidebar-primary-foreground" />
        )}
      </button>
    </>
  );
}