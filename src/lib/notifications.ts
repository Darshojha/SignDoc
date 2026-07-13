import "server-only";

import { Resend } from "resend";
import { buildEmailBody } from "@/lib/email/templates";

const resendApiKey = process.env.RESEND_API_KEY;
const resendClient = resendApiKey ? new Resend(resendApiKey) : null;
const senderAddress = "onboarding@resend.dev";

export type SignerInvitationEmail = {
  signerName: string;
  signerEmail: string;
  documentName: string;
  signingUrl: string;
};

export async function sendEnvelopeCompletedEmail(params: {
  signerEmail: string;
  documentName: string;
  actionUrl?: string;
  ccBcc?: { cc?: string[]; bcc?: string[] };
}): Promise<void> {
  if (!resendClient) {
    return;
  }

  try {
    const body = buildEmailBody({
      signerName: "there",
      documentName: params.documentName,
      signingUrl: params.actionUrl ?? "",
      action: "completed",
    });

    const response = await resendClient.emails.send({
      from: senderAddress,
      to: params.signerEmail,
      cc: params.ccBcc?.cc,
      bcc: params.ccBcc?.bcc,
      subject: `Signed: ${params.documentName}`,
      text: body.text,
      html: body.html,
    });

    if (response.error) {
      console.error("Failed to send completed email", { error: response.error.message });
    }
  } catch (err) {
    console.error("Failed to send completed email", { error: err });
  }
}

export async function sendDeclineEmail(params: {
  signerEmail: string;
  documentName: string;
  reason?: string;
}): Promise<void> {
  if (!resendClient) {
    return;
  }

  try {
    const subject = `Declined: ${params.documentName}`;
    const text = [
      `Hi there,`,
      "",
      `The envelope "${params.documentName}" was declined.`,
      params.reason ? `Reason: ${params.reason}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #171717;">
        <p>Hi there,</p>
        <p>The envelope <strong>${escapeHtml(params.documentName)}</strong> was declined.</p>
        ${params.reason ? `<p><strong>Reason:</strong> ${escapeHtml(params.reason)}</p>` : ""}
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
      console.error("Failed to send decline email", { error: response.error.message });
    }
  } catch (err) {
    console.error("Failed to send decline email", { error: err });
  }
}

export async function sendExpiringSoonEmail(params: {
  signerEmail: string;
  signerName: string;
  documentName: string;
  signingUrl: string;
}): Promise<void> {
  if (!resendClient) {
    return;
  }

  try {
    const subject = `Reminder: "${params.documentName}" is expiring soon`;
    const text = [
      `Hi ${params.signerName},`,
      "",
      `This is a reminder that your signing link for "${params.documentName}" is expiring soon.`,
      "",
      `Sign here: ${params.signingUrl}`,
    ].join("\n");

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #171717;">
        <p>Hi ${escapeHtml(params.signerName)},</p>
        <p>This is a reminder that your signing link for <strong>${escapeHtml(params.documentName)}</strong> is expiring soon.</p>
        <p><a href="${params.signingUrl}" style="color: #1d4ed8; text-decoration: underline;">Open your signing link</a></p>
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
      console.error("Failed to send expiring-soon email", { error: response.error.message });
    }
  } catch (err) {
    console.error("Failed to send expiring-soon email", { error: err });
  }
}

export async function sendSignerInvitationEmail(params: SignerInvitationEmail): Promise<void> {
  if (!resendClient) {
    return;
  }

  try {
    const body = buildEmailBody({
      signerName: params.signerName,
      documentName: params.documentName,
      signingUrl: params.signingUrl,
      action: "invite",
    });

    const response = await resendClient.emails.send({
      from: senderAddress,
      to: params.signerEmail,
      subject: `You've been asked to sign ${params.documentName}`,
      text: body.text,
      html: body.html,
    });

    if (response.error) {
      console.error("Failed to send signer invitation email", { error: response.error.message });
    }
  } catch (err) {
    console.error("Failed to send signer invitation email", { error: err });
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
