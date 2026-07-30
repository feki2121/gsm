// lib/whatsapp-service.ts

export interface ClientData {
  phone: string;      // Numéro du client (ex: 216XXXXXXXX)
  name: string;       // Nom complet
  totalDebt: number;  // Montant total dû (ex: 2000)
  paidAmount: number; // Montant déjà payé (ex: 1300)
}

export async function sendPaymentReminder(client: ClientData) {
  const remainingDebt = client.totalDebt - client.paidAmount;
  
  // Formatage du numéro Tunisien
  const formattedPhone = client.phone.startsWith('+') 
    ? client.phone 
    : `+216${client.phone}`;

  const payload = {
    apiKey: process.env.AISENSY_API_KEY,
    campaignName: process.env.AISENSY_CAMPAIGN_NAME,
    destination: formattedPhone,
    userName: client.name,
    templateParams: [
      client.name,      // {{1}} - Nom du client
      client.totalDebt, // {{2}} - Montant total dû
      client.paidAmount,// {{3}} - Montant payé
      remainingDebt     // {{4}} - Montant restant
    ]
  };

  try {
    const response = await fetch('https://api.aisensy.com/v1/send-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ Rappel envoyé à ${client.name} (${formattedPhone})`);
      return { success: true, data: result };
    } else {
      console.error('❌ Erreur API:', result);
      return { success: false, error: result };
    }
  } catch (error) {
    console.error('❌ Erreur réseau:', error);
    return { success: false, error };
  }
}