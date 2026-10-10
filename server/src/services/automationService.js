/**
 * n8n Automation Webhook Service.
 *
 * Dispatches event payloads to an n8n webhook URL.
 * Relies on environment variable:
 * - N8N_WEBHOOK_URL
 */

/**
 * Triggers an n8n webhook for a match found event.
 *
 * @param {Object} data - Match event details
 * @param {number} data.studentId - Student ID
 * @param {number} data.requirementId - Requirement ID
 * @param {number} data.inventoryId - Inventory ID
 * @param {string} data.recipientEmail - Student email address
 * @param {string} data.recipientName - Student name
 * @param {string} data.clinicName - Clinic name
 * @param {string} data.toothType - Tooth type
 * @param {number} data.quantity - Quantity available
 * @param {string} data.location - Location of inventory
 * @returns {Promise<{success: boolean, [key: string]: any}>}
 */
const triggerMatchNotification = async (data = {}) => {
  const webhookUrl = process.env.N8N_WEBHOOK_URL || process.env.WEBHOOK_URL;

  // If webhook URL is not configured, exit gracefully without failing caller
  if (!webhookUrl || !webhookUrl.trim()) {
    console.warn(
      "[automationService] N8N_WEBHOOK_URL is not configured. Webhook dispatch skipped."
    );
    return { success: false, reason: "NOT_CONFIGURED" };
  }

  // Derive safe host name for logging (avoids exposing full URL, tokens, or query strings)
  let safeHost = "n8n-webhook";
  try {
    const parsedUrl = new URL(webhookUrl.trim());
    safeHost = parsedUrl.hostname;
  } catch {
    // fallback
  }

  const trimmedEmail = data.recipientEmail
    ? String(data.recipientEmail).trim()
    : data.studentEmail
    ? String(data.studentEmail).trim()
    : data.email
    ? String(data.email).trim()
    : null;

  const trimmedName = data.recipientName
    ? String(data.recipientName).trim()
    : data.studentName
    ? String(data.studentName).trim()
    : data.name
    ? String(data.name).trim()
    : "Student";

  // Strictly sanitized payload containing canonical fields and standard aliases
  // to ensure validation passes regardless of specific property references in n8n/Brevo
  const payload = {
    event: "MATCH_FOUND",
    studentId:
      data.studentId !== undefined && data.studentId !== null
        ? Number(data.studentId)
        : null,
    requirementId:
      data.requirementId !== undefined && data.requirementId !== null
        ? Number(data.requirementId)
        : null,
    inventoryId:
      data.inventoryId !== undefined && data.inventoryId !== null
        ? Number(data.inventoryId)
        : null,
    // Canonical email and aliases for flexible n8n node validation mapping
    recipientEmail: trimmedEmail,
    studentEmail: trimmedEmail,
    email: trimmedEmail,
    to: trimmedEmail,
    // Canonical name and aliases
    recipientName: trimmedName,
    studentName: trimmedName,
    name: trimmedName,
    // Clinical & resource details
    clinicName: data.clinicName ? String(data.clinicName).trim() : null,
    clinic: data.clinicName ? String(data.clinicName).trim() : null,
    toothType: data.toothType ? String(data.toothType).trim() : null,
    arch: data.arch ? String(data.arch).trim() : null,
    quantity:
      data.quantity !== undefined && data.quantity !== null
        ? Number(data.quantity)
        : 1,
    qty:
      data.quantity !== undefined && data.quantity !== null
        ? Number(data.quantity)
        : 1,
    location: data.location ? String(data.location).trim() : null,
    clinicLocation: data.location ? String(data.location).trim() : null,
    message: data.message ? String(data.message).trim() : null,
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(webhookUrl.trim(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.error(
        `[automationService] n8n webhook (${safeHost}) returned error status: ${response.status}`
      );
      return { success: false, status: response.status };
    }

    console.log(
      `[automationService] n8n match notification webhook (${safeHost}) triggered successfully for requirement ${payload.requirementId} (HTTP ${response.status})`
    );
    return { success: true, status: response.status };
  } catch (error) {
    // Safe error logging: never expose secret URLs or authorization details
    const isTimeout =
      error.name === "TimeoutError" ||
      error.name === "AbortError" ||
      /timeout/i.test(error.message);
    console.error(
      `[automationService] Failed to trigger n8n webhook (${safeHost}): ${
        isTimeout ? "Connection timed out after 10 seconds" : error.message
      }`
    );
    return { success: false, error: isTimeout ? "TIMEOUT" : error.message };
  }
};

module.exports = {
  triggerMatchNotification,
};
