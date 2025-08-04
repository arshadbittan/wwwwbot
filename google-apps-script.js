// Google Apps Script code for Gmail integration
// This should be deployed as a Google Apps Script project

function setupGmailTrigger() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  // Create new trigger for Gmail
  ScriptApp.newTrigger('processGmailEmails')
    .timeBased()
    .everyMinutes(5) // Check every 5 minutes
    .create();
}

function processGmailEmails() {
  try {
    // Search for unread emails with specific criteria
    const threads = GmailApp.search('is:unread subject:(booking OR reservation)', 0, 10);
    
    threads.forEach(thread => {
      const messages = thread.getMessages();
      
      messages.forEach(message => {
        if (message.isUnread()) {
          const body = message.getPlainBody();
          const subject = message.getSubject();
          
          console.log('Processing email:', subject);
          console.log('Email body:', body);
          
          // Extract country code and phone number
          const extractedData = extractPhoneData(body);
          
          if (extractedData.countryCode && extractedData.phoneNumber) {
            // Send to WhatsApp bot
            sendToWhatsAppBot(extractedData);
            
            // Mark as read
            message.markRead();
            
            // Add label for processed emails
            const label = GmailApp.getUserLabelByName('WhatsApp-Processed') || 
                         GmailApp.createLabel('WhatsApp-Processed');
            thread.addLabel(label);
          }
        }
      });
    });
  } catch (error) {
    console.error('Error processing emails:', error);
  }
}

function extractPhoneData(emailBody) {
  const result = {
    countryCode: null,
    phoneNumber: null
  };
  
  try {
    // Extract country code (looking for patterns like "CountryCode: +91")
    const countryCodeMatch = emailBody.match(/CountryCode:\s*(\+\d+)/i);
    if (countryCodeMatch) {
      result.countryCode = countryCodeMatch[1];
    }
    
    // Extract phone number (looking for patterns like "Phone: 8475043504")
    const phoneMatch = emailBody.match(/Phone:\s*(\d+)/i);
    if (phoneMatch) {
      result.phoneNumber = phoneMatch[1];
    }
    
    console.log('Extracted data:', result);
    return result;
    
  } catch (error) {
    console.error('Error extracting phone data:', error);
    return result;
  }
}

function sendToWhatsAppBot(data) {
  try {
    // Replace with your Render.com deployed URL
    const webhookUrl = 'https://your-app-name.onrender.com/send-whatsapp';
    
    const payload = {
      countryCode: data.countryCode,
      phoneNumber: data.phoneNumber
    };
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    };
    
    const response = UrlFetchApp.fetch(webhookUrl, options);
    const responseData = JSON.parse(response.getContentText());
    
    console.log('WhatsApp bot response:', responseData);
    
  } catch (error) {
    console.error('Error sending to WhatsApp bot:', error);
  }
}

// Test function to manually trigger email processing
function testEmailProcessing() {
  processGmailEmails();
}

// Function to test phone data extraction
function testExtraction() {
  const testEmail = `
    Dear Customer,
    
    Your booking has been confirmed.
    
    CountryCode: +91
    Phone: 8475043504
    
    Thank you for choosing our service.
  `;
  
  const result = extractPhoneData(testEmail);
  console.log('Test extraction result:', result);
}