// Keep service identifiers stable while presenting the shorter place names.
export function placeLabel(value) {
  if (typeof value !== 'string') return value ?? '';
  const name = value.trim().replace(/\s+/g, ' ');
  if (/^dar es salaam$/i.test(name)) return 'Dar es Salaam';
  if (/^tanga$/i.test(name)) return 'Tanga';
  if (/^(?:zanzibar|unguja|zanzibar\s*\(\s*unguja\s*\))$/i.test(name)) return 'Zanzibar';
  if (/^(?:pemba|zanzibar\s*\(\s*pemba\s*\))$/i.test(name)) return 'Pemba';
  return value;
}

export function placeValue(value) {
  const label = placeLabel(value);
  return label === 'Zanzibar' ? 'Zanzibar (Unguja)' : label === 'Pemba' ? 'Zanzibar (Pemba)' : label;
}

export const locations = ['Dar es Salaam', 'Zanzibar (Unguja)', 'Zanzibar (Pemba)', 'Tanga'];
export const ROUTE_PAIRS = [
  ['Dar es Salaam', 'Zanzibar (Unguja)'],
  ['Dar es Salaam', 'Zanzibar (Pemba)'],
  ['Zanzibar (Pemba)', 'Zanzibar (Unguja)'],
  ['Zanzibar (Pemba)', 'Dar es Salaam'],
  ['Zanzibar (Pemba)', 'Tanga'],
  ['Zanzibar (Unguja)', 'Tanga'],
  ['Zanzibar (Unguja)', 'Dar es Salaam'],
];
export const supportsRoute = (from, to) => ROUTE_PAIRS.some(([origin, destination]) => origin === placeValue(from) && destination === placeValue(to));
export const pickupLocations = locations.filter(location => ROUTE_PAIRS.some(([origin]) => origin === location));

export function prefillRoute(route) {
  const origin = placeValue(route?.from), destination = placeValue(route?.to);
  const from = pickupLocations.includes(origin) ? origin : '';
  const to = locations.includes(destination) && (!from || supportsRoute(from, destination)) ? destination : '';
  return { from, to };
}
