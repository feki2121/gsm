// app/api/whatsapp/send/route.ts
import { NextResponse } from 'next/server';
import { sendPaymentReminder } from '@/lib/whatsapp-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, name, totalDebt, paidAmount } = body;

    // Validation des données
    if (!phone || !name || totalDebt === undefined || paidAmount === undefined) {
      return NextResponse.json(
        { error: 'Paramètres manquants. Vérifiez: phone, name, totalDebt, paidAmount' },
        { status: 400 }
      );
    }

    // Vérification cohérence des montants
    if (paidAmount > totalDebt) {
      return NextResponse.json(
        { error: 'Le montant payé ne peut pas dépasser le montant total dû' },
        { status: 400 }
      );
    }

    const result = await sendPaymentReminder({ phone, name, totalDebt, paidAmount });

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Rappel envoyé avec succès',
        remainingDebt: totalDebt - paidAmount
      });
    } else {
      return NextResponse.json(
        { error: 'Erreur lors de l\'envoi du rappel', details: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}