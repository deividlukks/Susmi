export interface EmailMessage {
    id: string;
    subject?: string;
    from: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    body: string;
    htmlBody?: string;
    attachments?: any[];
    date: Date;
    threadId?: string;
    labels?: string[];
}

export interface EmailProviderCredentials {
    accessToken?: string;
    refreshToken?: string;
    email?: string;
    password?: string;
    smtpHost?: string;
    smtpPort?: number;
    imapHost?: string;
    imapPort?: number;
    useTLS?: boolean;
}

export interface FetchEmailsOptions {
    folder?: string;
    limit?: number;
    offset?: number;
    query?: string;
    unreadOnly?: boolean;
}

export interface IEmailProvider {
    authenticate?(authCode: string): Promise<any>;
    refreshToken?(refreshToken: string): Promise<any>;
    fetchMessages(credentials: EmailProviderCredentials, options: FetchEmailsOptions): Promise<EmailMessage[]>;
    getMessage(credentials: EmailProviderCredentials, messageId: string): Promise<EmailMessage>;
    sendMessage(credentials: EmailProviderCredentials, message: Partial<EmailMessage>): Promise<any>;
    searchMessages(credentials: EmailProviderCredentials, query: string): Promise<EmailMessage[]>;
    markAsRead?(credentials: EmailProviderCredentials, messageId: string): Promise<void>;
    deleteMessage?(credentials: EmailProviderCredentials, messageId: string): Promise<void>;
}
