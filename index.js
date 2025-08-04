const { Client, NoAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
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

// WhatsApp client with no persistent auth (simpler for free hosting)
const client = new Client({
    authStrategy: new NoAuth(),
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
let qrCodeTimestamp = null;

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
    console.log('QR Code length:', qr.length);
    qrcode.generate(qr, { small: true });
    
    // Store QR code in memory for web access
    currentQRCode = qr;
    qrCodeTimestamp = new Date().toISOString();
    isWhatsAppReady = false;
    
    console.log('QR code available at: https://wwwwbot.onrender.com');
    console.log('QR code stored in memory successfully');
});

client.on('ready', () => {
    console.log('WhatsApp client is ready!');
    currentQRCode = null; // Clear QR code when connected
    isWhatsAppReady = true;
    qrCodeTimestamp = null;
});

client.on('disconnected', (reason) => {
    console.log('WhatsApp client disconnected:', reason);
    currentQRCode = null;
    isWhatsAppReady = false;
    qrCodeTimestamp = null;
    
    // Restart client after disconnection
    setTimeout(() => {
        console.log('Restarting WhatsApp client...');
        client.initialize();
    }, 5000);
});

client.on('auth_failure', (msg) => {
    console.error('Authentication failed:', msg);
    currentQRCode = null;
    isWhatsAppReady = false;
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
        whatsappReady: isWhatsAppReady,
        hasQRCode: !!currentQRCode,
        qrTimestamp: qrCodeTimestamp
    });
});

// Debug endpoint
app.get('/debug', (req, res) => {
    res.json({
        currentQRCode: !!currentQRCode,
        qrCodeLength: currentQRCode ? currentQRCode.length : 0,
        isWhatsAppReady: isWhatsAppReady,
        qrCodeTimestamp: qrCodeTimestamp,
        clientState: client.info ? 'has_info' : 'no_info',
        timestamp: new Date().toISOString()
    });
});

// Endpoint to get QR code for scanning
app.get('/qr', (req, res) => {
    console.log('QR endpoint called');
    console.log('currentQRCode exists:', !!currentQRCode);
    console.log('isWhatsAppReady:', isWhatsAppReady);
    console.log('qrCodeTimestamp:', qrCodeTimestamp);
    
    // Set proper headers
    res.header('Content-Type', 'application/json');
    res.header('Cache-Control', 'no-cache');
    
    try {
        if (currentQRCode) {
            console.log('Sending QR code to client, length:', currentQRCode.length);
            res.status(200).json({
                qr_code: currentQRCode,
                timestamp: qrCodeTimestamp || new Date().toISOString(),
                message: 'Scan this QR code with WhatsApp',
                success: true
            });
        } else if (isWhatsAppReady) {
            console.log('WhatsApp already connected');
            res.status(200).json({
                message: 'WhatsApp is already connected! No need to scan QR code.',
                whatsappReady: true,
                success: true
            });
        } else {
            console.log('No QR code available, bot starting up');
            res.status(200).json({
                message: 'Bot is starting up... Please wait a moment.',
                whatsappReady: false,
                success: false,
                debug: {
                    hasQRCode: !!currentQRCode,
                    isReady: isWhatsAppReady,
                    timestamp: new Date().toISOString()
                }
            });
        }
    } catch (error) {
        console.error('Error in QR endpoint:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            success: false
        });
    }
});

// Endpoint to get QR code as image
app.get('/qr-image', async (req, res) => {
    console.log('QR image endpoint called');
    
    try {
        if (currentQRCode) {
            console.log('Generating QR image, data length:', currentQRCode.length);
            
            // Generate QR code as PNG buffer
            const qrBuffer = await QRCode.toBuffer(currentQRCode, {
                type: 'png',
                width: 256,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'no-cache');
            res.send(qrBuffer);
        } else {
            res.status(404).json({ error: 'No QR code available' });
        }
    } catch (error) {
        console.error('Error generating QR image:', error);
        res.status(500).json({ error: 'Failed to generate QR image' });
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