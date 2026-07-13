export type EmailTemplate = {
  subject: string;
  text: string;
  html: string;
};

export function buildEmailBody(params: {
  signerName: string;
  documentName: string;
  signingUrl: string;
  action: "invite" | "reminder" | "completed" | "declined" | "expiring_soon";
}) {
  const lines = {
    invite: [
      `Hi ${params.signerName},`,
      "",
      `You've been asked to sign ${params.documentName}.`,
      "",
      `Sign here: ${params.signingUrl}`,
    ],
    reminder: [
      `Hi ${params.signerName},`,
      "",
      `Reminder: you still need to sign ${params.documentName}.`,
      "",
      `Sign here: ${params.signingUrl}`,
    ],
    completed: [
      `Hi there,`,
      "",
      `The envelope "${params.documentName}" has been completed.`,
      "",
      `View it here: ${params.signingUrl}`,
    ],
    declined: [
      `Hi there,`,
      "",
      `The envelope "${params.documentName}" was declined.`,
    ],
    expiring_soon: [
      `Hi ${params.signerName},`,
      "",
      `This is a reminder that your signing link for "${params.documentName}" is expiring soon.`,
      "",
      `Sign here: ${params.signingUrl}`,
    ],
  };

  const text = (lines[params.action] ?? lines.invite).filter(Boolean).join("\n");

  const first = (lines[params.action] ?? lines.invite)[0] ?? "";
  const statusSuffix =
    params.action === "completed"
      ? " has been completed."
      : params.action === "declined"
        ? " was declined."
        : "";

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #171717;">
      <p>${first}</p>
      <p>${params.documentName}${statusSuffix}</p>
      <p><a href="${params.signingUrl}" style="color: #1d4ed8; text-decoration: underline;">Open signing link</a></p>
      <p style="word-break: break-all; color: #525252;">${params.signingUrl}</p>
    </div>
  `;

  return { text, html };
}

// Shared raw templates helper; dedicated email modules handle sanitization/escaping.
