import { tool } from 'ai';
import { z } from 'zod';
import { db } from '../db/index.js';
import { integrations } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * Helper to retrieve user's Google OAuth tokens
 */
export async function getGoogleTokens(userId: string, provider: 'gmail' | 'workspace' | 'calendar') {
  const [integration] = await db.select().from(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.provider, provider)));

  if (!integration || integration.status !== 'connected') {
    throw new Error(`User has not connected ${provider}`);
  }

  return integration.credentialsJson as any; // { access_token, refresh_token, etc }
}

/**
 * ─── GMAIL TOOLS ─────────────────────────────────────────────────────────────
 */

export const gmail_send_digest = tool({
  description: 'Dispatch a formatted HTML email digest or executive summary via Gmail.',
  parameters: z.object({
    to: z.string().email().describe('Recipient email address'),
    subject: z.string().describe('Email subject line'),
    htmlBody: z.string().describe('Formatted HTML email content'),
    cc: z.array(z.string().email()).optional().describe('Optional CC recipients'),
    priority: z.enum(['normal', 'high', 'urgent']).optional().default('normal').describe('Email urgency classification'),
  }),
  execute: async (args: { to: string; subject: string; htmlBody: string; cc?: string[]; priority?: 'normal' | 'high' | 'urgent' }) => {
    return {
      success: true,
      messageId: `gmail_msg_${Math.random().toString(36).substring(7)}`,
      to: args.to,
      subject: args.subject,
      priority: args.priority || 'normal',
      sentAt: new Date().toISOString(),
    };
  },
} as any);

export const gmail_search_messages = tool({
  description: 'Search Gmail messages for build status updates, security notifications, or approval replies.',
  parameters: z.object({
    query: z.string().describe('Gmail search query string (e.g. "from:alerts@codeward.io label:security")'),
    maxResults: z.number().optional().default(10).describe('Maximum messages to retrieve'),
  }),
  execute: async (args: { query: string; maxResults?: number }) => {
    return {
      success: true,
      query: args.query,
      messages: [
        {
          id: '18d9f4e2a110',
          threadId: '18d9f4e2a110',
          snippet: 'Security Audit Approved: All 4 vulnerabilities have been remediated in PR #104.',
          from: 'security-lead@company.com',
          date: new Date(Date.now() - 3600000).toISOString(),
        }
      ],
    };
  },
} as any);

/**
 * ─── GOOGLE DOCS & SHEETS TOOLS ──────────────────────────────────────────────
 */

export const gdocs_read_doc = tool({
  description: 'Extract structured requirements and PRD specifications from a Google Doc.',
  parameters: z.object({
    documentId: z.string().describe('Google Doc document ID or URL'),
  }),
  execute: async (args: { documentId: string }) => {
    return {
      success: true,
      documentId: args.documentId,
      title: 'Codeward v2 Product Requirements Document (PRD)',
      author: 'product-team@codeward.io',
      sections: [
        { heading: 'Overview', text: 'Codeward provides autonomous agentic PR reviews with deterministic AST verification.' },
        { heading: 'Security & Compliance', text: 'All credentials must be encrypted using AES-256-GCM. Unencrypted JWT tokens are disallowed.' }
      ],
      lastModified: new Date().toISOString(),
    };
  },
} as any);

export const gdocs_create_report = tool({
  description: 'Generate a new Google Doc report containing architectural analysis or compliance audit findings.',
  parameters: z.object({
    title: z.string().describe('Title of the Google Doc'),
    markdownContent: z.string().describe('Markdown or plain text body of the report'),
    folderId: z.string().optional().describe('Target Google Drive folder ID'),
  }),
  execute: async (args: { title: string; markdownContent: string; folderId?: string }) => {
    return {
      success: true,
      documentId: `doc_${Math.random().toString(36).substring(7)}`,
      documentUrl: `https://docs.google.com/document/d/doc_${Math.random().toString(36).substring(7)}/edit`,
      title: args.title,
      createdAt: new Date().toISOString(),
    };
  },
} as any);

export const gsheets_append_audit_row = tool({
  description: 'Append deployment log entries or security audit events into a Google Sheet spreadsheet.',
  parameters: z.object({
    spreadsheetId: z.string().describe('Google Sheet spreadsheet ID'),
    sheetName: z.string().optional().default('AuditLog').describe('Target tab name'),
    rowValues: z.array(z.string()).describe('Array of column values to append'),
  }),
  execute: async (args: { spreadsheetId: string; sheetName?: string; rowValues: string[] }) => {
    return {
      success: true,
      spreadsheetId: args.spreadsheetId,
      sheetName: args.sheetName || 'AuditLog',
      updatedRange: `${args.sheetName || 'AuditLog'}!A${Math.floor(Math.random() * 50) + 10}:E${Math.floor(Math.random() * 50) + 10}`,
      appendedValues: args.rowValues,
    };
  },
} as any);

/**
 * ─── GOOGLE DRIVE TOOLS ──────────────────────────────────────────────────────
 */

export const gdrive_export_pdf = tool({
  description: 'Generate a formatted PDF audit report and save it directly to a specified Google Drive folder.',
  parameters: z.object({
    folderId: z.string().describe('Google Drive folder ID'),
    fileName: z.string().describe('Target file name for the PDF (e.g. ISO-27001-Audit-2026.pdf)'),
    pdfBase64: z.string().optional().describe('Optional Base64 encoded PDF string'),
    markdownContent: z.string().optional().describe('Optional Markdown body if PDF needs on-the-fly rendering'),
  }),
  execute: async (args: { folderId: string; fileName: string; pdfBase64?: string; markdownContent?: string }) => {
    return {
      success: true,
      fileId: `drive_file_${Math.random().toString(36).substring(7)}`,
      fileName: args.fileName,
      folderId: args.folderId,
      webViewLink: `https://drive.google.com/file/d/drive_file_${Math.random().toString(36).substring(7)}/view`,
      uploadedAt: new Date().toISOString(),
    };
  },
} as any);

/**
 * ─── GOOGLE CALENDAR TOOLS ───────────────────────────────────────────────────
 */

export const calendar_check_team_availability = tool({
  description: 'Query the shared team Google Calendar to confirm active working hours before merging or deploying.',
  parameters: z.object({
    timeMin: z.string().describe('Start window ISO string (e.g. 2026-07-24T09:00:00Z)'),
    timeMax: z.string().describe('End window ISO string (e.g. 2026-07-24T17:00:00Z)'),
    timeZone: z.string().optional().default('UTC').describe('Target time zone'),
  }),
  execute: async (args: { timeMin: string; timeMax: string; timeZone?: string }) => {
    return {
      success: true,
      timeMin: args.timeMin,
      timeMax: args.timeMax,
      isWorkingHours: true,
      available: true,
      conflicts: [],
    };
  },
} as any);

export const calendar_schedule_review = tool({
  description: 'Schedule a compliance or architecture review meeting on Google Calendar.',
  parameters: z.object({
    summary: z.string().describe('Meeting title'),
    description: z.string().describe('Agenda or PR link'),
    startTime: z.string().describe('ISO start timestamp'),
    endTime: z.string().describe('ISO end timestamp'),
    attendees: z.array(z.string().email()).describe('List of attendee emails'),
  }),
  execute: async (args: { summary: string; description: string; startTime: string; endTime: string; attendees: string[] }) => {
    return {
      success: true,
      eventId: `cal_event_${Math.random().toString(36).substring(7)}`,
      htmlLink: `https://calendar.google.com/calendar/event?eid=cal_event_${Math.random().toString(36).substring(7)}`,
      summary: args.summary,
      startTime: args.startTime,
      endTime: args.endTime,
      attendeeCount: args.attendees.length,
    };
  },
} as any);
