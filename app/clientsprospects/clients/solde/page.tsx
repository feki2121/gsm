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

interface Client {
  id: string;
  nom: string;
  telephone: string;
  email: string;
  solde: number;
  creditAutorise: number;
  creditDisponible: number;
  createdAt: string;
}

export default function ClientsListPage() {
  const { sidebarClasses } = useSidebar();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalSolde, setTotalSolde] = useState<number>(0);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter(client =>
        client.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.telephone.includes(searchTerm) ||
        (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredClients(filtered);
    }
  }, [searchTerm, clients]);


  // Dans la fonction fetchClients
  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/clients?limit=1000');

      if (!response.ok) {
        throw new Error('Erreur lors du chargement');
      }

      const data = await response.json();
      const clientsData = data.data || data;
      setClients(clientsData);
      setFilteredClients(clientsData);

      // Utiliser le totalSoldeGeneral renvoyé par l'API
      if (data.totalSoldeGeneral !== undefined) {
        setTotalSolde(data.totalSoldeGeneral);
      } else {
        // Fallback: calculer manuellement si le total n'est pas dans la réponse
        // const total = clientsData.reduce((sum: number, client: Client) => {
        //   return sum + (client.solde > 0 ? client.solde : 0);
        // }, 0);
        // setTotalSolde(total);
      }

    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger la liste des clients',
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
          <Header title="Clients" subtitle="Gestion des soldes clients" />
          <div className="flex justify-center items-center h-96">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p>Chargement des clients...</p>
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
        <Header title="Clients" subtitle="Gestion des soldes clients" />
        <main className="p-4 md:p-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                  <CardTitle className="text-2xl">Clients</CardTitle>
                  <CardDescription>
                    Liste de tous les clients avec leur solde restant
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
            {/* Ajoutez cette carte après le CardHeader et avant le CardContent */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-red-50 border-red-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-red-700">Total des Soldes Restants</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    {totalSolde.toFixed(2)} DT
                  </div>
                  <p className="text-xs text-red-500 mt-1">
                    Montant total dû par tous les clients
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700">Nombre de Clients</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {filteredClients.length}
                  </div>
                  <p className="text-xs text-blue-500 mt-1">
                    Clients avec solde dû: {clients.filter(c => c.solde > 0).length}
                  </p>
                </CardContent>
              </Card>

              {/* <Card className="bg-green-50 border-green-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-green-700">Crédits Autorisés</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {clients.reduce((sum, c) => sum + (c.creditAutorise || 0), 0).toFixed(2)} DT
                  </div>
                </CardContent>
              </Card> */}
            </div>
            <CardContent>
              {filteredClients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucun client trouvé
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
                        {/* <TableHead>Crédit dispo</TableHead> */}
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClients.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.nom}</TableCell>
                          <TableCell>{client.telephone}</TableCell>
                          <TableCell>{client.email || '-'}</TableCell>
                          {/* <TableCell>{getSoldeBadge(client.solde || 0)}</TableCell> */}
                          {/* <TableCell>{client.creditDisponible?.toFixed(2) || '0.00'} DT</TableCell> */}
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              {/* <Link href={`/clients/${client.id}`}>
                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4 mr-1" />
                                  Détails
                                </Button>
                              </Link> */}
                              <Link href={`/extraits/clients/${client.id}`}>
                                <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700">
                                  <Wallet className="h-4 w-4 mr-1" />
                                  Extrait
                                </Button>
                              </Link>
                              <Link href={`/clients/${client.id}/solde`}>
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