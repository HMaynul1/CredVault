// Master field definitions for a credential item.
// 40+ fields across login, API/cloud, cards, banking, identity, security & custom.
// `sensitive: true` fields are masked in the UI and only revealed on tap,
// and are excluded from "quick view" lists.

export type FieldDef = {
  key: string;
  label: string;
  type: 'text' | 'password' | 'textarea' | 'date' | 'tags' | 'checkbox' | 'select';
  sensitive?: boolean;
  options?: string[];
  group: string;
};

export const CATEGORIES = [
  'PASSWORD', 'API_KEY', 'CARD', 'BANK', 'SSH_KEY', 'IDENTITY', 'NOTE', 'CUSTOM'
] as const;

export const FIELD_DEFS: FieldDef[] = [
  // --- Core ---
  { key: 'title', label: 'Title', type: 'text', group: 'Core' },
  { key: 'category', label: 'Category', type: 'select', options: [...CATEGORIES], group: 'Core' },
  { key: 'folder', label: 'Folder', type: 'text', group: 'Core' },
  { key: 'tags', label: 'Tags', type: 'tags', group: 'Core' },
  { key: 'favorite', label: 'Favorite', type: 'checkbox', group: 'Core' },
  { key: 'notes', label: 'Notes', type: 'textarea', sensitive: true, group: 'Core' },
  { key: 'expiresAt', label: 'Expiry Date', type: 'date', group: 'Core' },

  // --- Login ---
  { key: 'url', label: 'Website URL', type: 'text', group: 'Login' },
  { key: 'username', label: 'Username', type: 'text', group: 'Login' },
  { key: 'email', label: 'Email', type: 'text', group: 'Login' },
  { key: 'password', label: 'Password', type: 'password', sensitive: true, group: 'Login' },
  { key: 'pin', label: 'PIN', type: 'password', sensitive: true, group: 'Login' },
  { key: 'recoveryEmail', label: 'Recovery Email', type: 'text', group: 'Login' },
  { key: 'recoveryPhone', label: 'Recovery Phone', type: 'text', group: 'Login' },
  { key: 'twoFactorSecret', label: '2FA Secret (TOTP)', type: 'password', sensitive: true, group: 'Login' },
  { key: 'securityQuestion1', label: 'Security Question 1', type: 'text', group: 'Login' },
  { key: 'securityAnswer1', label: 'Security Answer 1', type: 'password', sensitive: true, group: 'Login' },
  { key: 'securityQuestion2', label: 'Security Question 2', type: 'text', group: 'Login' },
  { key: 'securityAnswer2', label: 'Security Answer 2', type: 'password', sensitive: true, group: 'Login' },

  // --- API / Cloud / Dev ---
  { key: 'apiKey', label: 'API Key', type: 'password', sensitive: true, group: 'API & Cloud' },
  { key: 'apiSecret', label: 'API Secret', type: 'password', sensitive: true, group: 'API & Cloud' },
  { key: 'clientId', label: 'Client ID', type: 'text', group: 'API & Cloud' },
  { key: 'clientSecret', label: 'Client Secret', type: 'password', sensitive: true, group: 'API & Cloud' },
  { key: 'accessToken', label: 'Access Token', type: 'password', sensitive: true, group: 'API & Cloud' },
  { key: 'refreshToken', label: 'Refresh Token', type: 'password', sensitive: true, group: 'API & Cloud' },
  { key: 'token', label: 'Generic Token', type: 'password', sensitive: true, group: 'API & Cloud' },
  { key: 'connectionString', label: 'Connection String', type: 'password', sensitive: true, group: 'API & Cloud' },
  { key: 'webhookUrl', label: 'Webhook URL', type: 'text', group: 'API & Cloud' },
  { key: 'region', label: 'Region / Endpoint', type: 'text', group: 'API & Cloud' },

  // --- SSH / Certs ---
  { key: 'privateKey', label: 'Private Key', type: 'textarea', sensitive: true, group: 'SSH & Certificates' },
  { key: 'publicKey', label: 'Public Key', type: 'textarea', group: 'SSH & Certificates' },
  { key: 'passphrase', label: 'Passphrase', type: 'password', sensitive: true, group: 'SSH & Certificates' },
  { key: 'certificate', label: 'Certificate', type: 'textarea', sensitive: true, group: 'SSH & Certificates' },
  { key: 'fingerprint', label: 'Fingerprint', type: 'text', group: 'SSH & Certificates' },

  // --- Card ---
  { key: 'cardNumber', label: 'Card Number', type: 'password', sensitive: true, group: 'Payment Card' },
  { key: 'cardHolder', label: 'Cardholder Name', type: 'text', group: 'Payment Card' },
  { key: 'cardExpiry', label: 'Card Expiry (MM/YY)', type: 'text', group: 'Payment Card' },
  { key: 'cardCvv', label: 'CVV', type: 'password', sensitive: true, group: 'Payment Card' },
  { key: 'cardPin', label: 'Card PIN', type: 'password', sensitive: true, group: 'Payment Card' },
  { key: 'cardType', label: 'Card Type', type: 'text', group: 'Payment Card' },
  { key: 'billingAddress', label: 'Billing Address', type: 'textarea', group: 'Payment Card' },

  // --- Banking ---
  { key: 'bankName', label: 'Bank Name', type: 'text', group: 'Banking' },
  { key: 'accountNumber', label: 'Account Number', type: 'password', sensitive: true, group: 'Banking' },
  { key: 'routingNumber', label: 'Routing Number', type: 'text', group: 'Banking' },
  { key: 'iban', label: 'IBAN', type: 'password', sensitive: true, group: 'Banking' },
  { key: 'swift', label: 'SWIFT / BIC', type: 'text', group: 'Banking' },

  // --- Identity / Custom ---
  { key: 'idNumber', label: 'ID / Passport Number', type: 'password', sensitive: true, group: 'Identity' },
  { key: 'licenseKey', label: 'License Key', type: 'password', sensitive: true, group: 'Identity' },
  { key: 'serialNumber', label: 'Serial Number', type: 'text', group: 'Identity' },
  { key: 'customField1Label', label: 'Custom Field 1 Name', type: 'text', group: 'Custom' },
  { key: 'customField1Value', label: 'Custom Field 1 Value', type: 'password', sensitive: true, group: 'Custom' },
  { key: 'customField2Label', label: 'Custom Field 2 Name', type: 'text', group: 'Custom' },
  { key: 'customField2Value', label: 'Custom Field 2 Value', type: 'password', sensitive: true, group: 'Custom' },
  { key: 'customField3Label', label: 'Custom Field 3 Name', type: 'text', group: 'Custom' },
  { key: 'customField3Value', label: 'Custom Field 3 Value', type: 'password', sensitive: true, group: 'Custom' },

  // --- Attachment ---
  { key: 'attachmentUrl', label: 'Attachment (encrypted file URL)', type: 'text', group: 'Attachment' },
  { key: 'attachmentName', label: 'Attachment File Name', type: 'text', group: 'Attachment' },
];

export const CATEGORY_ICON: Record<string, string> = {
  PASSWORD: '🔑', API_KEY: '🧩', CARD: '💳', BANK: '🏦',
  SSH_KEY: '🖥️', IDENTITY: '🪪', NOTE: '📝', CUSTOM: '📁'
};

export function emptyItem() {
  const item: any = { id: '', category: 'PASSWORD', favorite: false, tags: [], updatedAt: Date.now() };
  for (const f of FIELD_DEFS) if (!(f.key in item)) item[f.key] = f.type === 'checkbox' ? false : f.type === 'tags' ? [] : '';
  return item;
}
