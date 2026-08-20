const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = 'libertad123';
const WHATSAPP_TOKEN = 'EAAi8DNCKbGABSVkdDiBY0Ha28hQzqN2itZCL5vfenhHRHq3MQpou11pztqm2vkSBAF4AofnTesvJdcHyiaCvB2zLs0MEpD5bI4l7JRN1W114zrxa4ZCZAHAZCsaEYWBTwZCIZCZAdG2bWxFKCxZB9olS89NdVY7RUTBujV8Cj55lBLkwy02OMBgPiLoLe5CwXZCaBI6ZCCxz5xSzgeMZAQfAAZAq2vCZCSwWZAxEL6dQ6b84RaPFtcung3u8jK7ClxgTGhMc8biLYwXP8U8I7UVMjpIe5Q';
const SUPABASE_URL = 'https://tgdmrxklbzglxqgalosj.supabase.co/rest/v1/';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZG1yeGtsYnpnbHhxZ2Fsb3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNDY1MzcsImV4cCI6MjEwMjcyMjUzN30.ljf54dLWivnJZYmdlN7Gmf26bKE5D38u_9l_LGtZoeI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Función auxiliar para enviar mensajes más fácil
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

app.get('/api', (req, res) => { /* ... Tu código de validación GET se mantiene igual ... */ });

app.post('/api', async (req, res) => {
    const body = req.body;
   
    if (body.object === 'whatsapp_business_account') {
        const entry = body.entry?.[0]?.changes?.[0]?.value;
        const message = entry?.messages?.[0];
       
        if (message?.type === 'text') {
            const userText = message.text.body.trim(); // No usamos toLowerCase aquí para guardar los nombres bien escritos
            const userTextLower = userText.toLowerCase();
            const from = message.from;
            const phone_number_id = entry.metadata.phone_number_id;

            // 1. Buscar si el usuario ya existe en Supabase
            let { data: usuario } = await supabase
                .from('registro_pagos')
                .select('*')
                .eq('telefono', from)
                .single();

            // 2. Si no existe, lo creamos en estado INICIO
            if (!usuario) {
                const { data: nuevoUsuario } = await supabase
                    .from('registro_pagos')
                    .insert([{ telefono: from, paso_actual: 'INICIO' }])
                    .select()
                    .single();
                usuario = nuevoUsuario;
            }

            // 3. LOGICA DE LA CONVERSACIÓN (MÁQUINA DE ESTADOS)
           
            // Si el usuario saluda o manda el menú principal
            if (userTextLower.includes('buenos dias') || userTextLower.includes('menú') || userTextLower.includes('menu')) {
                await supabase.from('registro_pagos').update({ paso_actual: 'INICIO' }).eq('telefono', from);
                await enviarMensaje(from, "Gracias por conectarte con el Instituto Libertad. 🎓\n\nElige una opción:\n1️⃣ Inscripciones y precio\n2️⃣ Datos bancarios de la institución\n3️⃣ Validación de pago\n4️⃣ Preguntas frecuentes", phone_number_id);
                return res.status(200).send('EVENT_RECEIVED');
            }

            // Dependiendo del "paso_actual" en la base de datos, el bot sabe qué responder
            switch (usuario.paso_actual) {
               
                case 'INICIO':
                    if (userTextLower === '3') {
                        // Cambiamos el estado y pedimos el nombre
                        await supabase.from('registro_pagos').update({ paso_actual: 'ESPERANDO_NOMBRE' }).eq('telefono', from);
                        await enviarMensaje(from, "¡Perfecto! Vamos a validar tu pago. 📝\n\nPor favor, escribe tu *Nombre y Apellido* completo:", phone_number_id);
                    } else if (userTextLower === '1') {
                        await enviarMensaje(from, "📝 *Inscripciones:* El costo es de $50 mensuales.", phone_number_id);
                    }
                    // Agrega aquí las opciones 2 y 4...
                    break;

                case 'ESPERANDO_NOMBRE':
                    // Guardamos el nombre y pedimos la cédula
                    await supabase.from('registro_pagos').update({ nombre_apellido: userText, paso_actual: 'ESPERANDO_CEDULA' }).eq('telefono', from);
                    await enviarMensaje(from, `Gracias ${userText}. Ahora, por favor escribe tu número de *Cédula de Identidad*:`, phone_number_id);
                    break;

                case 'ESPERANDO_CEDULA':
                    // Guardamos la cédula y pedimos el pago móvil
                    await supabase.from('registro_pagos').update({ cedula: userText, paso_actual: 'ESPERANDO_PAGO' }).eq('telefono', from);
                    await enviarMensaje(from, "Excelente. Finalmente, indícame los *datos de tu Pago Móvil* (Banco, Número de Referencia y Monto):", phone_number_id);
                    break;

                case 'ESPERANDO_PAGO':
                    // Guardamos el pago y terminamos el flujo
                    await supabase.from('registro_pagos').update({ datos_pago_movil: userText, paso_actual: 'COMPLETADO' }).eq('telefono', from);
                    await enviarMensaje(from, "✅ ¡Datos recibidos con éxito! Nuestro equipo de administración verificará tu pago móvil y te enviaremos tu recibo pronto.\n\nEscribe *Menú* si deseas volver al inicio.", phone_number_id);
                    break;

                case 'COMPLETADO':
                    await enviarMensaje(from, "Tu pago ya está en proceso de revisión. Si necesitas algo más, escribe *Menú*.", phone_number_id);
                    break;
            }
        }
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

module.exports = app;