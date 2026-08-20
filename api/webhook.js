const express = require('express');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = 'libertad_123'; // Tu contraseña inventada
const META_TOKEN = 'EAAi8DNCKbGABSccDbT9iCKzgOlwpWfvBrCp4HFBI85pk8dPRroBQBuuqMKeWdmac3348aPZBN2XTbk6ldIH9iwCBY0w3bVL9uGXL5ioOre5TPWXQBeWbvdxCc4best7HTMhrs0n7jmXwx9VGWoiZBqUodz8AcgQsACUHLAbC35lSYN4FMOEnZBGXpqvEJiwKWAzW1hEWhmaFZCynlTokGYlFXGBZCIZBRmOzHpKOzuZArdgvHTbXnXHhBIRAs9YVaIZAssZBWb0xoRLQh8UsGXcCR'; // Pega tu token de Meta

app.get('/api', (req, res) => {
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === VERIFY_TOKEN) {
        res.status(200).send(req.query['hub.challenge']);
    } else {
        res.sendStatus(403);
    }
});

app.post('/api', async (req, res) => {
    const body = req.body;
    if (body.object === 'whatsapp_business_account') {
        const entry = body.entry?.[0]?.changes?.[0]?.value;
        const message = entry?.messages?.[0];
        
        if (message?.type === 'text') {
            const userText = message.text.body.toLowerCase().trim();
            const from = message.from;
            const phone_number_id = entry.metadata.phone_number_id;
            let respuestaText = "";

            // Lógica de respuestas
            if (userText.includes('buenos dias') || userText.includes('buenos días')) {
                respuestaText = "Gracias por conectarte con el Instituto Libertad. 🎓\n\nElige una opción:\n1️⃣ Inscripciones y precio\n2️⃣ Datos bancarios de la institución\n3️⃣ Validación de pago\n4️⃣ Preguntas frecuentes";
            } else if (userText === '1') {
                respuestaText = "📝 *Inscripciones:* El costo es de $50 mensuales. Las inscripciones están abiertas hasta fin de mes.";
            } else if (userText === '2') {
                respuestaText = "🏦 *Datos Bancarios:*\nBanco: X\nCuenta: 0123-4567...\nA nombre de: Instituto Libertad";
            } else if (userText === '3') {
                respuestaText = "✅ *Validación de pago:* Por favor, envía el número de referencia o una foto de tu comprobante por este medio.";
            } else if (userText === '4') {
                respuestaText = "❓ *Preguntas frecuentes:*\n- Horario: 8 AM a 5 PM.\n- Modalidad: 100% online.";
            }

            // Enviar mensaje si hay una respuesta programada
            if (respuestaText !== "") {
                try {
                    await fetch(`https://graph.facebook.com/v17.0/${phone_number_id}/messages`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${META_TOKEN}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            messaging_product: 'whatsapp',
                            to: from,
                            type: 'text',
                            text: { body: respuestaText }
                        })
                    });
                } catch (error) {
                    console.error("Error:", error);
                }
            }
        }
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

module.exports = app;