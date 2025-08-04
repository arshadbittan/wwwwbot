# WhatsApp Gmail Bot

A lightweight WhatsApp bot that integrates with Gmail using Google Apps Script to automatically send WhatsApp messages based on email content.

## Features

- 📧 **Gmail Integration**: Automatically processes emails with booking information
- 📱 **WhatsApp Messaging**: Sends automated WhatsApp messages via WhatsApp Web
- 💬 **FAQ Bot**: Responds to common questions automatically
- 🗄️ **Supabase Integration**: Logs all interactions and bookings
- 🚀 **Free Deployment**: Runs on Render.com free tier

## Setup Guide

### 1. Prerequisites

- Node.js 18+ installed
- Gmail account
- WhatsApp account
- Supabase account (free)
- Render.com account (free)

### 2. Local Development Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   - Copy `.env.example` to `.env`
   - Fill in your Supabase credentials

3. **Set up Supabase database:**
   - Create two tables in your Supabase project:

   **bookings table:**
   ```sql
   CREATE TABLE bookings (
     id SERIAL PRIMARY KEY,
     phone_number TEXT NOT NULL,
     country_code TEXT NOT NULL,
     message_sent TEXT NOT NULL,
     timestamp TIMESTAMPTZ DEFAULT NOW()
   );
   ```

   **chat_logs table:**
   ```sql
   CREATE TABLE chat_logs (
     id SERIAL PRIMARY KEY,
     phone_number TEXT NOT NULL,
     message TEXT NOT NULL,
     response TEXT NOT NULL,
     timestamp TIMESTAMPTZ DEFAULT NOW()
   );
   ```

4. **Run locally:**
   ```bash
   npm start
   ```

5. **Scan QR code:**
   - When you run the app, a QR code will appear in the terminal
   - Scan it with WhatsApp on your phone
   - Wait for "WhatsApp client is ready!" message

### 3. Google Apps Script Setup

1. **Go to [Google Apps Script](https://script.google.com/)**

2. **Create a new project:**
   - Click "New Project"
   - Copy the code from `google-apps-script.js`
   - Paste it into the script editor

3. **Set up permissions:**
   - Click "Review permissions"
   - Allow Gmail access

4. **Configure the webhook URL:**
   - In the `sendToWhatsAppBot` function, replace `your-app-name.onrender.com` with your actual Render URL

5. **Set up the trigger:**
   - Run the `setupGmailTrigger()` function once
   - This will check for new emails every 5 minutes

6. **Test the setup:**
   - Run `testEmailProcessing()` to test manually

### 4. Deploy to Render.com

1. **Push code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin your-github-repo-url
   git push -u origin main
   ```

2. **Deploy on Render:**
   - Go to [Render.com](https://render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Use these settings:
     - **Build Command:** `npm install`
     - **Start Command:** `npm start`
     - **Environment:** Node
     - **Plan:** Free

3. **Set environment variables in Render:**
   - Add your Supabase URL and key
   - Set PORT to 3000

4. **Update Google Apps Script:**
   - Replace the webhook URL with your Render app URL

### 5. Keep It Running 24/7

**Important for Render Free Tier:**
- Free tier apps sleep after 15 minutes of inactivity
- To keep it awake, you can:
  1. Use a free uptime monitoring service like UptimeRobot
  2. Set it to ping your app every 10 minutes
  3. Use the health check endpoint: `https://your-app.onrender.com/`

## How It Works

1. **Email Processing:**
   - Google Apps Script checks Gmail every 5 minutes
   - Looks for emails with booking information
   - Extracts country code and phone number

2. **WhatsApp Integration:**
   - Receives webhook from Google Apps Script
   - Combines country code + phone number
   - Sends "Thanks for the booking" message

3. **FAQ Bot:**
   - Listens for incoming WhatsApp messages
   - Responds to keywords like "what is pnr"
   - Logs all interactions to Supabase

## Supported FAQ Keywords

- "what is pnr" or "pnr"
- "booking status"
- "cancel booking"
- "help"

## Email Format Expected

```
CountryCode: +91
Phone: 8475043504
```

## Troubleshooting

### WhatsApp Not Connecting
- Make sure you're using the same phone that scanned the QR code
- Check if WhatsApp Web is working in your browser
- Restart the application and scan QR again

### Gmail Not Processing
- Check Google Apps Script execution logs
- Verify Gmail permissions are granted
- Test with `testEmailProcessing()` function

### Render Deployment Issues
- Check build logs in Render dashboard
- Verify environment variables are set
- Make sure Node.js version is 18+

### Database Issues
- Verify Supabase credentials
- Check if tables are created correctly
- Test connection in Supabase dashboard

## Performance Optimization

This bot is optimized for free tiers:
- Minimal dependencies
- Memory-efficient WhatsApp client
- Lightweight Express server
- Efficient database queries
- No file storage requirements

## Security Notes

- Never commit `.env` file to Git
- Use environment variables for all secrets
- Regularly rotate Supabase keys
- Monitor usage to stay within free limits

## Support

If you encounter issues:
1. Check the logs in Render dashboard
2. Test each component separately
3. Verify all environment variables
4. Check Supabase connection

## License

MIT License - feel free to modify and use for your projects!