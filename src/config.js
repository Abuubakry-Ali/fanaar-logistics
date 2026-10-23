// Business contact number displayed on the website.
// WhatsApp expects international digits without +, spaces, or punctuation.
// Example format: 255 followed by your complete mobile number.
export const CONTACT = {
  phone: '+255 650 090 876',
  whatsapp: '255650090876',
};

export const TRACKING_URL = 'https://tracking.fanaarlogistics.com/';
export const QUOTE_URL = 'https://quote.fanaarlogistics.com/';
// Add the confirmed staff portal address to show the footer's Admin login link.
export const ADMIN_LOGIN_URL = '';

export const ROUTES = [
  { from: 'Dar es Salaam', to: 'Zanzibar', code: 'DAR → ZNZ', direction: 'Mainland to island' },
  { from: 'Zanzibar', to: 'Dar es Salaam', code: 'ZNZ → DAR', direction: 'Island to mainland' },
  { from: 'Zanzibar', to: 'Tanga', code: 'ZNZ → TGT', direction: 'Along the coast' },
];

export const whatsappNumber = CONTACT.whatsapp.replace(/\D/g, '');
