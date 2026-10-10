/**
 * Brevo (formerly Sendinblue) Transactional Email Service.
 *
 * Uses Brevo's HTTP API (v3) to send transactional match notifications.
 * Relies on environment variables:
 * - BREVO_API_KEY
 * - BREVO_SENDER_EMAIL
 * - BREVO_SENDER_NAME
 */

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

/**
 * Escapes HTML characters to prevent HTML injection in emails.
 *
 * @param {any} unsafe - Input string or value to sanitize
 * @returns {string} Sanitized string safe for HTML interpolation
 */
const escapeHtml = (unsafe) => {
  if (unsafe === undefined || unsafe === null) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

/**
 * Sends an email notification to a student when matching inventory is found.
 *
 * @param {Object} params
 * @param {string} params.recipientEmail - Recipient email address
 * @param {string} params.recipientName - Recipient full name
 * @param {string} params.clinicName - Name of the clinic with available inventory
 * @param {string} params.toothType - Type of tooth matched (INCISOR, CANINE, etc.)
 * @param {number} params.quantity - Quantity available
 * @param {string} params.location - Clinic location
 * @returns {Promise<{success: boolean, [key: string]: any}>}
 */
const sendMatchNotification = async ({
  recipientEmail,
  recipientName,
  clinicName,
  toothType,
  quantity,
  location,
}) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "ToothLink";

  // Check required email credentials without logging secrets
  if (!apiKey || !apiKey.trim() || !senderEmail || !senderEmail.trim()) {
    console.warn(
      "[emailService] Brevo credentials (BREVO_API_KEY or BREVO_SENDER_EMAIL) are not configured. Email notification skipped."
    );
    return { success: false, reason: "NOT_CONFIGURED" };
  }

  if (!recipientEmail || !recipientEmail.trim()) {
    console.warn("[emailService] Missing recipientEmail. Email notification skipped.");
    return { success: false, reason: "MISSING_RECIPIENT" };
  }

  const safeRecipientName = escapeHtml(recipientName || "Student");
  const safeClinicName = escapeHtml(clinicName || "Partner Clinic");
  const safeToothType = escapeHtml(toothType || "Tooth");
  const safeQuantity = escapeHtml(quantity || 1);
  const safeLocation = escapeHtml(location || "ToothLink Network");

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New ToothLink Match Found</title>
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f7fafc;
      margin: 0;
      padding: 20px;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      padding: 30px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }
    .header {
      border-bottom: 2px solid #3182ce;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .header h2 {
      color: #2b6cb0;
      margin: 0;
      font-size: 22px;
    }
    .match-card {
      background-color: #ebf8ff;
      border-left: 4px solid #3182ce;
      padding: 16px 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .match-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    .match-table td {
      padding: 8px 4px;
      vertical-align: top;
      font-size: 14px;
    }
    .match-table td.label {
      font-weight: bold;
      color: #4a5568;
      width: 40%;
    }
    .match-table td.value {
      color: #1a202c;
    }
    .action-notice {
      margin: 24px 0 16px 0;
      font-size: 14px;
      color: #4a5568;
    }
    .footer {
      font-size: 12px;
      color: #a0aec0;
      margin-top: 30px;
      border-top: 1px solid #e2e8f0;
      padding-top: 15px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h2>ToothLink Match Alert</h2>
    </div>
    <p>Hello ${safeRecipientName},</p>
    <p>Good news! We found clinic inventory matching your study requirement on ToothLink.</p>
    <div class="match-card">
      <table class="match-table">
        <tr>
          <td class="label">Tooth Type:</td>
          <td class="value">${safeToothType}</td>
        </tr>
        <tr>
          <td class="label">Quantity Available:</td>
          <td class="value">${safeQuantity}</td>
        </tr>
        <tr>
          <td class="label">Clinic:</td>
          <td class="value">${safeClinicName}</td>
        </tr>
        <tr>
          <td class="label">Location:</td>
          <td class="value">${safeLocation}</td>
        </tr>
      </table>
    </div>
    <p class="action-notice">
      Log in to your ToothLink dashboard to view complete details and submit your request directly to the clinic.
    </p>
    <div class="footer">
      <p>ToothLink &bull; Dental Study Material Exchange Network</p>
      <p>This is an automated notification. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>`;

  const requestPayload = {
    sender: {
      name: senderName,
      email: senderEmail.trim(),
    },
    to: [
      {
        email: recipientEmail.trim(),
        name: recipientName ? recipientName.trim() : "Student",
      },
    ],
    subject: "New ToothLink Match Found",
    htmlContent,
  };

  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": apiKey.trim(),
      },
      body: JSON.stringify(requestPayload),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      // Safe logging: log status and partial error without sensitive headers or credentials
      console.error(
        `[emailService] Brevo API request failed with status ${response.status}: ${errorText.slice(0, 200)}`
      );
      return { success: false, status: response.status };
    }

    const data = await response.json().catch(() => ({}));
    console.log(
      `[emailService] Match notification email sent successfully to ${recipientEmail}`
    );
    return { success: true, messageId: data.messageId };
  } catch (error) {
    // Safe error logging: log only the error message, never dump full context with tokens
    console.error(`[emailService] Failed to send email via Brevo: ${error.message}`);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendMatchNotification,
};
