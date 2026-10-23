// Business contact number displayed on the website.
// WhatsApp expects international digits without +, spaces, or punctuation.
// Example format: 255 followed by your complete mobile number.
export const CONTACT = {
  phone: '+255 650 090 876',
  whatsapp: '255650090876',
};

// Configure the staff portal only after its protected deployment is ready.
export const ADMIN_LOGIN_URL = import.meta.env.VITE_ADMIN_LOGIN_URL || '';

// Set at build time after the backend is deployed. Never put private keys here.
export const SERVICE_API_URL = (import.meta.env.VITE_SERVICE_API_URL || '').replace(/\/$/, '');

export const ROUTES = [
  { from: 'Dar es Salaam', to: 'Zanzibar', code: 'DAR → ZNZ', direction: 'Mainland to island' },
  { from: 'Zanzibar', to: 'Dar es Salaam', code: 'ZNZ → DAR', direction: 'Island to mainland' },
  { from: 'Zanzibar', to: 'Tanga', code: 'ZNZ → TGT', direction: 'Along the coast' },
];

export const whatsappNumber = CONTACT.whatsapp.replace(/\D/g, '');
