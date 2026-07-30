'use client';

import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Wallet, Eye, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface Fournisseur {
  id: string;
  nom: string;
  telephone: string;
  email: string;
  adresse: string;
  solde: number;
  createdAt: string;
}

export default function FournisseursListPage() {
  const { sidebarClasses } = useSidebar();
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [filteredFournisseurs, setFilteredFournisseurs] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchFournisseurs();
  }, []);

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredFournisseurs(fournisseurs);
    } else {
      const filtered = fournisseurs.filter(fournisseur =>
        fournisseur.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fournisseur.telephone.includes(searchTerm) ||
        (fournisseur.email && fournisseur.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredFournisseurs(filtered);
    }
  }, [searchTerm, fournisseurs]);

  const fetchFournisseurs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/fournisseurs?limit=1000');
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement');
      }
      
      const data = await response.json();
      const fournisseursData = data.data || data;
      setFournisseurs(fournisseursData);
      setFilteredFournisseurs(fournisseursData);
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger la liste des fournisseurs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getSoldeBadge = (solde: number) => {
    if (solde === 0) {
      return <Badge className="bg-green-500">À jour</Badge>;
    } else if (solde > 0) {
      return <Badge className="bg-red-500">{solde.toFixed(2)} DT</Badge>;
    } else {
      return <Badge className="bg-blue-500">{Math.abs(solde).toFixed(2)} DT (avoir)</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Fournisseurs" subtitle="Gestion des soldes fournisseurs" />
          <div className="flex justify-center items-center h-96">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p>Chargement des fournisseurs...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar />
      <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
        <Header title="Fournisseurs" subtitle="Gestion des soldes fournisseurs" />
        <main className="p-4 md:p-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                  <CardTitle className="text-2xl">Fournisseurs</CardTitle>
                  <CardDescription>
                    Liste de tous les fournisseurs avec leur solde restant
                  </CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredFournisseurs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucun fournisseur trouvé
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Téléphone</TableHead>
                        <TableHead>Email</TableHead>
                        {/* <TableHead>Solde à payer</TableHead> */}
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFournisseurs.map((fournisseur) => (
                        <TableRow key={fournisseur.id}>
                          <TableCell className="font-medium">{fournisseur.nom}</TableCell>
                          <TableCell>{fournisseur.telephone}</TableCell>
                          <TableCell>{fournisseur.email || '-'}</TableCell>
                          {/* <TableCell>{getSoldeBadge(fournisseur.solde || 0)}</TableCell> */}
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Link href={`/fournisseurs/${fournisseur.id}`}>
                                {/* <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4 mr-1" />
                                  Détails
                                </Button> */}
                              </Link>
                              <Link href={`/extraits/fournisseurs/${fournisseur.id}`}>
                                <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700">
                                  <Wallet className="h-4 w-4 mr-1" />
                                  Extrait
                                </Button>
                              </Link>
                              <Link href={`/fournisseurs/${fournisseur.id}/solde`}>
                                <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700">
                                  <Wallet className="h-4 w-4 mr-1" />
                                  Solde & Paiements
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}