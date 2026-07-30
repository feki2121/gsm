import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

// Fonction pour envoyer la notification WhatsApp (copiée depuis l'autre API)
async function sendWhatsAppNotification(telephone: string, montantPaye: number, soldeRestant: number, clientNom: string) {
  try {
    // Nettoyer le numéro de téléphone
    let cleanPhone = telephone.replace(/[\s\-\(\)]/g, '');

    if (cleanPhone.startsWith('0')) {
      cleanPhone = '216' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('216')) {
      cleanPhone = '216' + cleanPhone;
    }

    // Utiliser les valeurs réelles
    const montantReel = montantPaye;
    const soldeReel = soldeRestant >= 0 ? soldeRestant : 0;

    // Formater le message (identique à celui envoyé lors du paiement)
    const message = `Cher ${clientNom},

Nous vous remercions pour votre règlement de ${montantReel.toFixed(3)} DT.

Le solde restant de votre compte est de ${soldeReel.toFixed(3)} DT.

Cordialement,
CHIHA GSM`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send/?phone=${cleanPhone}&text=${encodedMessage}&type=phone_number&app_absent=0`;
    return whatsappUrl;
  } catch (error) {
    console.error('Erreur création URL WhatsApp:', error);
    return null;
  }
}

// Fonction pour calculer le solde restant du client
async function calculateClientSolde(clientId: string): Promise<number> {
  const allReglements = await prisma.reglementClient.findMany({
    where: {
      clientId,
      OR: [
        { typeReglement: 'CREDIT', statut: 'EN_ATTENTE' },
        { typeReglement: 'MIXTE' }
      ]
    }
  });

  let soldeTotal = 0;

  for (const reg of allReglements) {
    if (reg.typeReglement === 'CREDIT' && reg.statut === 'EN_ATTENTE') {
      soldeTotal += reg.montant;
    } else if (reg.typeReglement === 'MIXTE' && reg.detailsMixte) {
      try {
        const details = JSON.parse(reg.detailsMixte);
        for (const detail of details) {
          if (detail.type === 'CREDIT' && detail.statut === 'EN_ATTENTE' && detail.montant > 0) {
            soldeTotal += detail.montant;
          }
        }
      } catch (e) {
        console.error('Erreur parsing detailsMixte:', e);
      }
    }
  }

  return soldeTotal;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID du règlement manquant' },
        { status: 400 }
      );
    }

    // Récupérer le règlement avec les informations client
    const reglement = await prisma.reglementClient.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            telephone: true,
            solde: true
          }
        }
      }
    });

    if (!reglement) {
      return NextResponse.json(
        { error: 'Règlement non trouvé' },
        { status: 404 }
      );
    }

    if (!reglement.client) {
      return NextResponse.json(
        { error: 'Client non trouvé pour ce règlement' },
        { status: 404 }
      );
    }

    const client = reglement.client;

    if (!client.telephone) {
      return NextResponse.json(
        { error: 'Le client n\'a pas de numéro de téléphone' },
        { status: 400 }
      );
    }

    // Calculer le solde restant actuel du client
    const soldeRestant = await calculateClientSolde(client.id);

    // Générer l'URL WhatsApp
    const whatsappUrl = await sendWhatsAppNotification(
      client.telephone,
      reglement.montant,
      soldeRestant,
      client.nom
    );

    if (!whatsappUrl) {
      return NextResponse.json(
        { error: 'Erreur lors de la génération du message WhatsApp' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      whatsappUrl,
      message: 'URL WhatsApp générée avec succès',
      reglement: {
        montant: reglement.montant,
        date: reglement.date,
        reference: reglement.reference
      }
    });

  } catch (error) {
    console.error('Error generating WhatsApp URL for payment:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate WhatsApp URL' },
      { status: 500 }
    );
  }
}