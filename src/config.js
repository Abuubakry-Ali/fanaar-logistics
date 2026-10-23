// Business contact number displayed on the website.
// WhatsApp expects international digits without +, spaces, or punctuation.
// Example format: 255 followed by your complete mobile number.
export const CONTACT = {
  phone: '+255 650 090 876',
  whatsapp: '255650090876',
};

export const TRACKING_URL = 'https://cargo.trixa.net/t/5d2e73922193/';
export const QUOTE_URL = 'https://cargo.trixa.net/t/5d2e73922193/enquiry/';
export const ADMIN_LOGIN_URL = 'https://cargo.trixa.net/';

export const ROUTES = [
  { from: 'Dar es Salaam', to: 'Zanzibar', code: 'DAR → ZNZ', direction: 'Mainland to island' },
  { from: 'Zanzibar', to: 'Dar es Salaam', code: 'ZNZ → DAR', direction: 'Island to mainland' },
  { from: 'Zanzibar', to: 'Tanga', code: 'ZNZ → TGT', direction: 'Along the coast' },
];

export const whatsappNumber = CONTACT.whatsapp.replace(/\D/g, '');
