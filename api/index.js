const express = require('express');
const { createClient } = require('@supabase/supabase-js'); // Importamos Supabase
const app = express();
app.use(express.json());

// Credenciales (En producción, usa variables de entorno en Vercel)
const VERIFY_TOKEN = 'libertad_123';
const META_TOKEN = 'EAAi8DNCKbGABSVkdDiBY0Ha28hQzqN2itZCL5vfenhHRHq3MQpou11pztqm2vkSBAF4AofnTesvJdcHyiaCvB2zLs0MEpD5bI4l7JRN1W114zrxa4ZCZAHAZCsaEYWBTwZCIZCZAdG2bWxFKCxZB9olS89NdVY7RUTBujV8Cj55lBLkwy02OMBgPiLoLe5CwXZCaBI6ZCCxz5xSzgeMZAQfAAZAq2vCZCSwWZAxEL6dQ6b84RaPFtcung3u8jK7ClxgTGhMc8biLYwXP8U8I7UVMjpIe5Q';
const SUPABASE_URL = 'https://tgdmrxklbzglxqgalosj.supabase.co/rest/v1/';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZG1yeGtsYnpnbHhxZ2Fsb3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNDY1MzcsImV4cCI6MjEwMjcyMjUzN30.ljf54dLWivnJZYmdlN7Gmf26bKE5D38u_9l_LGtZoeI';

// Inicializamos Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.get('/api', (req, res) => {
    // ... (Tu código de verificación GET se mantiene igual)
});

app.post('/api', async (req, res) => {
    const body = req.body;
    if (body.object === 'whatsapp_business_account') {
        const entry = body.entry?.[0]?.changes?.[0]?.value;
        const message = entry?.messages?.[0];
       
        if (message?.type === 'text') {
            const userText = message.text.body.toLowerCase().trim();
            const from = message.from; // Número de WhatsApp del usuario
           
            // ¡NUEVO!: Guardar el número del usuario en Supabase
            // Asumiendo que creaste una tabla llamada 'interacciones'
            try {
                await supabase
                    .from('interacciones')
                    .insert([{ telefono: from, ultimo_mensaje: userText }]);
                console.log("Datos guardados en Supabase");
            } catch (error) {
                console.error("Error guardando en Supabase:", error);
            }

            // ... (Aquí va toda tu lógica de respuestas del menú que ya teníamos)
           
        }
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

module.exports = app;