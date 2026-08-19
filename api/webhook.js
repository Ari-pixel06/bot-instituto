const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Usamos module.exports para máxima compatibilidad con Vercel
module.exports = async function (req, res) {
  // 1. Verificación del Webhook (Lo que usa Meta para conectarse)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: 'Token inválido' });
  }

  // 2. Recepción de mensajes
  if (req.method === 'POST') {
    try {
      const body = req.body;

      if (body.object && body.entry?.[0]?.changes?.[0]?.value?.messages) {
        const message = body.entry[0].changes[0].value.messages[0];
        const phone_number_id = body.entry[0].changes[0].value.metadata.phone_number_id;
        const from = message.from;
        const msg_body = message.text.body.trim();

        // A) Guardar en Supabase (Solo se conecta si llega un mensaje)
        if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
          const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
          await supabase.from('mensajes').insert([{ telefono: from, texto: msg_body }]);
        }

        // B) Lógica del menú
        let respuestaBot = "";
        switch (msg_body) {
          case "1":
            respuestaBot = "📚 *Requisitos y costos de inscripción:*\n- Fotocopia de la cédula.\n- 2 fotos tipo carnet.\n- Costo de inscripción: $XX.\n- Mensualidad: $XX.\n\nEscribe *0* para volver al menú principal.";
            break;
          case "2":
            respuestaBot = "🏦 *Nuestros datos bancarios:*\nBanco: Nombre del Banco\nCuenta: 0100-XXXX-XXXX-XXXX\nA nombre de: Instituto Libertad\nRIF: J-XXXXXXXX-X\n\nEscribe *0* para volver al menú principal.";
            break;
          case "3":
            respuestaBot = "✅ *Validar pagos:*\nPor favor, envíanos el *número de referencia*, banco de origen y el *nombre del estudiante* para procesar tu pago.\n\nEscribe *0* para volver al menú principal.";
            break;
          case "4":
            respuestaBot = "❓ *Preguntas frecuentes:*\n- ¿Tienen clases online? Sí.\n- ¿Dónde están ubicados? En la sede Petare, calle...\n\nEscribe *0* para volver al menú principal.";
            break;
          default:
            respuestaBot = "¡Bienvenido al *Instituto Libertad Sede Petare*! 🏫\n\n¿Cómo podemos ayudarte? Elige alguna de las siguientes opciones enviando el número:\n\n1️⃣ Requisitos y costos de inscripción.\n2️⃣ Datos bancarios.\n3️⃣ Validar pagos.\n4️⃣ Preguntas frecuentes.";
            break;
        }

        // C) Enviar WhatsApp
        await axios({
          method: 'POST',
          url: `https://graph.facebook.com/v17.0/${phone_number_id}/messages`,
          data: {
            messaging_product: 'whatsapp',
            to: from,
            text: { body: respuestaBot }
          },
          headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` }
        });
      }
      return res.status(200).send('EVENT_RECEIVED');
     
    } catch (error) {
      console.error("Error procesando el mensaje:", error);
      return res.status(500).send('Error interno del servidor');
    }
  }

  return res.status(405).send('Método no permitido');
};
