const { Client, RemoteAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Custom store for WhatsApp session using Supabase
class SupabaseStore {
    async sessionExists(options) {
        try {
            const { data } = await supabase
                .from('whatsapp_sessions')
                .select('session_data')
                .eq('session_id', options.session)
                .single();
            return !!data;
        } catch {
            return false;
        }
    }

    async save(options) {
        try {
            await supabase
                .from('whatsapp_sessions')
                .upsert([
                    {
                        session_id: options.session,
                        session_data: JSON.stringify(options.data),
                        updated_at: new Date().toISOString()
                    }
                ]);
            console.log('Session saved to Supabase');
        } catch (error) {
            console.error('Error saving session:', error);
        }
    }

    async extract(options) {
        try {
            const { data } = await supabase
                .from('whatsapp_sessions')
                .select('session_data')
                .eq('session_id', options.session)
                .single();
            
            return data ? JSON.parse(data.session_data) : null;
        } catch (error) {
            console.error('Error extracting session:', error);
            return null;
        }
    }

    async delete(options) {
        try {
            await supabase
                .from('whatsapp_sessions')
                .delete()
                .eq('session_id', options.session);
            console.log('Session deleted from Supabase');
        } catch (error) {
            console.error('Error deleting session:', error);
        }
    }
}

// WhatsApp client with persistent session storage
const store = new SupabaseStore();
const client = new Client({
    authStrategy: new RemoteAuth({
        store: store,
        backupSyncIntervalMs: 300000 // 5 minutes
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

// Store current QR code in memory
let currentQRCode = null;
let isWhatsAppReady = false;

// FAQ responses
const faqResponses = {
    'what is pnr': 'PNR stands for Passenger Name Record. It\'s a unique identifier for your booking that contains all your travel details.',
    'pnr': 'PNR stands for Passenger Name Record. It\'s a unique identifier for your booking that contains all your travel details.',
    'booking status': 'To check your booking status, please provide your PNR number.',
    'cancel booking': 'To cancel your booking, please contact our support team with your PNR number.',
    'help': 'Available commands:\n- What is PNR?\n- Booking status\n- Cancel booking\n- Help'
};

// Initialize WhatsApp client
client.on('qr', (qr) => {
    console.log('QR Code received, scan with WhatsApp:');
    qrcode.generate(qr, { small: true });

    // Store QR code in memory for web access
    currentQRCode = qr;
    console.log('QR code available at: https://wwwwbot.onrender.com/qr');
});

client.on('ready', () => {
    console.log('WhatsApp client is ready!');
    currentQRCode = null; // Clear QR code when connected
    isWhatsAppReady = true;
});

client.on('disconnected', (reason) => {
    console.log('WhatsApp client disconnected:', reason);
    currentQRCode = null;
    isWhatsAppReady = false;
});

client.on('remote_session_saved', () => {
    console.log('Session saved remotely');
});

client.on('message', async (message) => {
    const messageText = message.body.toLowerCase().trim();

    // Check if message matches any FAQ
    for (const [keyword, response] of Object.entries(faqResponses)) {
        if (messageText.includes(keyword)) {
            await message.reply(response);

            // Log interaction to Supabase
            try {
                await supabase
                    .from('chat_logs')
                    .insert([
                        {
                            phone_number: message.from,
                            message: message.body,
                            response: response,
                            timestamp: new Date().toISOString()
                        }
                    ]);
            } catch (error) {
                console.error('Error logging to Supabase:', error);
            }
            break;
        }
    }
});

// Endpoint to receive data from Google Apps Script
app.post('/send-whatsapp', async (req, res) => {
    try {
        const { countryCode, phoneNumber } = req.body;

        if (!countryCode || !phoneNumber) {
            return res.status(400).json({ error: 'Missing country code or phone number' });
        }

        // Combine country code and phone number
        const fullPhoneNumber = `${countryCode}${phoneNumber}`;
        const chatId = `${fullPhoneNumber}@c.us`;

        // Send WhatsApp message
        const message = 'Thanks for the booking. 🎉';
        await client.sendMessage(chatId, message);

        // Log to Supabase
        try {
            await supabase
                .from('bookings')
                .insert([
                    {
                        phone_number: fullPhoneNumber,
                        country_code: countryCode,
                        message_sent: message,
                        timestamp: new Date().toISOString()
                    }
                ]);
        } catch (error) {
            console.error('Error logging booking to Supabase:', error);
        }

        console.log(`Message sent to ${fullPhoneNumber}: ${message}`);
        res.json({ success: true, message: 'WhatsApp message sent successfully' });

    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        res.status(500).json({ error: 'Failed to send WhatsApp message' });
    }
});

// Health check endpoint for Render
app.get('/api/status', (req, res) => {
    res.json({
        status: 'WhatsApp Bot is running',
        timestamp: new Date().toISOString(),
        whatsappReady: isWhatsAppReady
    });
});

// Endpoint to get QR code for scanning
app.get('/qr', (req, res) => {
    if (currentQRCode) {
        res.json({
            qr_code: currentQRCode,
            timestamp: new Date().toISOString(),
            message: 'Scan this QR code with WhatsApp'
        });
    } else if (isWhatsAppReady) {
        res.json({
            message: 'WhatsApp is already connected! No need to scan QR code.',
            whatsappReady: true
        });
    } else {
        res.json({
            message: 'Bot is starting up... Please wait a moment and refresh.',
            whatsappReady: false
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Initialize WhatsApp client
client.initialize();

// Handle process termination
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await client.destroy();
    process.exit(0);
});