// scripts/test-whatsapp-api.js
const https = require('https');

const AISENSY_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZGE5MTc3YjQzZGQyMjQwMTNjNWEyNyIsIm5hbWUiOiJLRiBTT0xVVElPTiIsImFwcE5hbWUiOiJBaVNlbnN5IiwiY2xpZW50SWQiOiI2OWRhOTE3N2I0M2RkMjI0MDEzYzVhMjIiLCJhY3RpdmVQbGFuIjoiRlJFRV9GT1JFVkVSIiwiaWF0IjoxNzc1OTMxNzY3fQ.8pQhMyzi93e1tE-d9szIoRcVoLpOdd2gV2xxRGSaQWA';

async function testAPI() {
  console.log('🔧 Test d\'envoi WhatsApp via AiSensy...\n');

  // ⚠️ REMPLACEZ PAR VOTRE VRAI NUMÉRO DE TÉLÉPHONE
  // Exemple: si votre numéro est +216 98 765 432, écrivez "21698765432"
  const MON_VRAI_NUMERO = "+21644150151";  // <--- METTEZ VOTRE VRAI NUMÉRO ICI

  const payload = {
    apiKey: AISENSY_API_KEY,
    campaignName: "KF SOLUTIONS",
    destination: MON_VRAI_NUMERO,  // Votre vrai numéro
    userName: "KF SOLUTION",
    templateParams: [
      "Client ACHRAF",
      "3000",
      "2700",
      "300"
    ],
    source: "test",
    media: {},
    buttons: [],
    carouselCards: [],
    location: {},
    attributes: {},
    paramsFallbackValue: {
      FirstName: "Client"
    }
  };

  console.log(`📞 Envoi au numéro: ${payload.destination}`);
  console.log(`📝 Message: Bonjour Client Test, VOTRE DETTE EST 2000 dt...\n`);

  const postData = JSON.stringify(payload);

  const options = {
    hostname: 'backend.aisensy.com',
    path: '/campaign/t1/api/v2',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    console.log(`📡 Statut HTTP: ${res.statusCode}`);
    
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('📨 Réponse brute:', data);
      
      try {
        const response = JSON.parse(data);
        if (res.statusCode === 200 && response.message_id) {
          console.log('\n✅ SUCCÈS ! Vérifiez votre téléphone, le message WhatsApp est arrivé !');
        } else {
          console.log('\n📝 Réponse API:', response);
          if (response.message === 'Invalid Number') {
            console.log('\n⚠️ Le numéro n\'est pas valide ou n\'a pas WhatsApp.');
            console.log('💡 Vérifiez que:');
            console.log('   1. Le numéro est le vôtre (avec WhatsApp installé)');
            console.log('   2. Le format est 216XXXXXXXX (11 chiffres)');
          }
        }
      } catch (e) {
        console.log('❌ Erreur parsing:', e.message);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Erreur réseau:', error.message);
  });

  req.write(postData);
  req.end();
}

testAPI();