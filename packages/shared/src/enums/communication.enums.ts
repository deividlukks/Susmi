// Communication Enums
export enum CommunicationChannelType {
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  TELEGRAM = 'TELEGRAM',
  SMS = 'SMS',
}

export enum CommunicationProvider {
  GMAIL = 'gmail',
  OUTLOOK = 'outlook',
  SMTP = 'smtp',
  IMAP = 'imap',
  WHATSAPP_WEB = 'whatsapp-web',
  TELEGRAM_BOT = 'telegram-bot',
}

export enum MessageDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export enum MessageStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}
