import { api } from './api';

export interface SendEmailPayload {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  clientName?: string;
  referralCode?: string;
}

export interface SendEmailResponse {
  success: boolean;
  messageId: string;
  provider: 'brevo' | 'smtp' | 'simulated';
  sender: string;
  message: string;
}

export const emailService = {
  /**
   * Send an email via secure NestJS backend integration with Brevo API.
   * Keeps API keys safely on the backend server.
   */
  sendEmail: async (payload: SendEmailPayload): Promise<SendEmailResponse> => {
    const res = await api.post('/email/send', payload);
    return res.data;
  },
};

