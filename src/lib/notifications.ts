import "server-only";

import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resendClient = resendApiKey ? new Resend(resendApiKey) : null;
const senderAddress = "onboarding@resend.dev";

export type SignerInvitationEmail = {
  signerName: string;
  signerEmail: string;
  documentName: string;
  signingUrl: string;
};

export async function sendSignerInvitationEmail(params: SignerInvitationEmail) {
  if (!resendClient) {
    throw new Error("Missing required environment variable: RESEND_API_KEY");
  }

  const subject = `You've been asked to sign ${params.documentName}`;
  const text = [
    `Hi ${params.signerName},`,
    "",
    `You've been asked to sign ${params.documentName}.`,
    "",
    `Sign here: ${params.signingUrl}`,
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #171717;">
      <p>Hi ${escapeHtml(params.signerName)},</p>
      <p>You've been asked to sign <strong>${escapeHtml(params.documentName)}</strong>.</p>
      <p>
        <a href="${params.signingUrl}" style="color: #1d4ed8; text-decoration: underline;">
          Open your signing link
        </a>
      </p>
      <p style="word-break: break-all; color: #525252;">${params.signingUrl}</p>
    </div>
  `;

  const response = await resendClient.emails.send({
    from: senderAddress,
    to: params.signerEmail,
    subject,
    text,
    html,
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
