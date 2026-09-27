import axios from '@/lib/axios';

export type WhatsAppLinkState = 'open' | 'connecting' | 'close' | 'not_configured' | 'no_instance' | 'unreachable' | 'unknown';

export interface WhatsAppStatus {
  enabled: boolean;
  configured: boolean;
  instance: string;
  state: WhatsAppLinkState;
  requests?: { open: number; inProgress: number };
  error?: string;
}

export type WhatsAppRequestKind = 'booking' | 'join' | 'human';
export type WhatsAppRequestStatus = 'open' | 'in_progress' | 'converted' | 'closed';

export interface WhatsAppRequest {
  _id: string;
  reference: string;
  kind: WhatsAppRequestKind;
  phone: string;
  name?: string;
  user?: { _id: string; firstName: string; lastName: string; email: string; role: string };
  serviceCategory?: string;
  description?: string;
  hasPhoto?: boolean;
  location?: { text?: string; lat?: number; lng?: number };
  urgency?: 'low' | 'medium' | 'high' | 'emergency';
  status: WhatsAppRequestStatus;
  assignedTo?: { _id: string; firstName: string; lastName: string };
  booking?: string;
  notes: { by?: string; text: string; at: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppRequestPage {
  data: WhatsAppRequest[];
  total: number;
  page: number;
  pages: number;
}

const whatsappService = {
  async status(): Promise<WhatsAppStatus> {
    const { data } = await axios.get('/whatsapp/status');
    return data.data;
  },

  async requests(params: { status?: string; kind?: string; page?: number } = {}): Promise<WhatsAppRequestPage> {
    const { data } = await axios.get('/whatsapp/requests', { params });
    return { data: data.data, total: data.total, page: data.page, pages: data.pages };
  },

  async update(
    id: string,
    changes: { status?: WhatsAppRequestStatus; assignToMe?: boolean; booking?: string; note?: string }
  ): Promise<WhatsAppRequest> {
    const { data } = await axios.patch(`/whatsapp/requests/${id}`, changes);
    return data.data;
  },

  async send(phone: string, text: string, requestId?: string): Promise<void> {
    await axios.post('/whatsapp/send', { phone, text, requestId });
  },

  async connect(number?: string): Promise<{ base64: string | null; pairingCode: string | null }> {
    const { data } = await axios.post('/whatsapp/connect', number ? { number } : {});
    return data.data;
  },
};

export default whatsappService;
