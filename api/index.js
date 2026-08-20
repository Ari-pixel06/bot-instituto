const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();
app.use(express.json());

// 1. Configuración de Credenciales
const VERIFY_TOKEN = 'libertad123';
const WHATSAPP_TOKEN = 'EAAi8DNCKbGABSVkdDiBY0Ha28hQzqN2itZCL5vfenhHRHq3MQpou11pztqm2vkSBAF4AofnTesvJdcHyiaCvB2zLs0MEpD5bI4l7JRN1W114zrxa4ZCZAHAZCsaEYWBTwZCIZCZAdG2bWxFKCxZB9olS89NdVY7RUTBujV8Cj55lBLkwy02OMBgPiLoLe5CwXZCaBI6ZCCxz5xSzgeMZAQfAAZAq2vCZCSwWZAxEL6dQ6b84RaPFtcung3u8jK7ClxgTGhMc8biLYwXP8U8I7UVMjpIe5Q';
const SUPABASE_URL = 'https://tgdmrxklbzglxqgalosj.supabase.co/rest/v1/';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZG1yeGtsYnpnbHhxZ2Fsb3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNDY1MzcsImV4cCI6MjEwMjcyMjUzN30.ljf54dLWivnJZYmdlN7Gmf26bKE5D38u_9l_LGtZoeI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. Función auxiliar para enviar mensajes
async function enviarMensaje(telefono_destino, texto, phone_number_id) {
    await fetch(`https://graph.facebook.com/v17.0/${phone_number_id}/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: telefono_destino,
            type: 'text',
            text: { body: texto }
        })
    });
}

// 3. Endpoint para que Meta valide la conexión
app.get(['/', '/api'], (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// 4. Endpoint para recibir los mensajes de WhatsApp
app.post(['/', '/api'], async (req, res) => {
    const body = req.body;
    
    if (body.object === 'whatsapp_business_account') {
        const entry = body.entry?.[0]?.changes?.[0]?.value;
        const message = entry?.messages?.[0];
        
        if (message?.type === 'text') {
            const userText = message.text.body.trim();
            const userTextLower = userText.toLowerCase();
            const from = message.from;
            const phone_number_id = entry.metadata.phone_number_id;

            try {
                // Buscamos al usuario en Supabase
                let { data: usuario } = await supabase
                    .from('registro_pagos')
                    .select('*')
                    .eq('telefono', from)
                    .single();

                // Si no existe, lo creamos
                if (!usuario) {
                    const { data: nuevoUsuario } = await supabase
                        .from('registro_pagos')
                        .insert([{ telefono: from, paso_actual: 'INICIO' }])
                        .select()
                        .single();
                    usuario = nuevoUsuario;
                }

                // Lógica de respuestas
                if (userTextLower.includes('buenos dias') || userTextLower.includes('menú') || userTextLower.includes('menu')) {
                    await supabase.from('registro_pagos').update({ paso_actual: 'INICIO' }).eq('telefono', from);
                    await enviarMensaje(from, "Gracias por conectarte con el Instituto Libertad. 🎓\n\nElige una opción:\n1️⃣ Inscripciones y precio\n2️⃣ Datos bancarios de la institución\n3️⃣ Validación de pago\n4️⃣ Preguntas frecuentes", phone_number_id);
                } else {
                    switch (usuario.paso_actual) {
                        case 'INICIO':
                            if (userTextLower === '3') {
                                await supabase.from('registro_pagos').update({ paso_actual: 'ESPERANDO_NOMBRE' }).eq('telefono', from);
                                await enviarMensaje(from, "¡Perfecto! Vamos a validar tu pago. 📝\n\nPor favor, escribe tu *Nombre y Apellido* completo:", phone_number_id);
                            } else if (userTextLower === '1') {
                                await enviarMensaje(from, "📝 *Inscripciones:* El costo es de $50 mensuales.", phone_number_id);
                            }
                            break;
                        case 'ESPERANDO_NOMBRE':



