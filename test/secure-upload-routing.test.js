import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const entry = fileURLToPath(new URL('../src/main.jsx', import.meta.url));
const source = readFileSync(entry, 'utf8');
const icons = [...new Set([...source.match(/import \{ ([^}]+) \} from 'lucide-react'/)[1].split(',').map(value => value.trim()), 'Upload', 'FileCheck', 'LoaderCircle'])];
const built = await build({ entryPoints: [entry], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent', define: { 'import.meta.env.BASE_URL': '"/"' }, plugins: [{ name: 'app-upload-surfaces', setup(builder) {
  builder.onResolve({ filter: /^(react|react-dom\/client|lucide-react|\.\/config|\.\/customer-portal|\.\/booking-completion|\.\/booking-attachments|\.\/CoastMap\.jsx)$|\.css$/ }, args => ({ path: args.path, namespace: 'unit' }));
  builder.onLoad({ filter: /.*/, namespace: 'unit' }, ({ path }) => ({ contents: path === 'react'
    ? `export const useState=(...a)=>globalThis.__uploadRoute.useState(...a),useRef=(...a)=>globalThis.__uploadRoute.useRef(...a),useEffect=(...a)=>globalThis.__uploadRoute.useEffect(...a);export default{createElement:(type,props,...children)=>({type,props:{...props,children}}),createContext:()=>({Provider:'Provider'}),useCallback:fn=>fn};`
    : path === 'react-dom/client' ? `export const createRoot=()=>({render:element=>{globalThis.__uploadApp=element.type;}});`
    : path === 'lucide-react' ? icons.map(name => `export const ${name}=()=>null;`).join('')
    : path === './config' ? `export const CONTACT={phone:'+255650090876',email:'info@example.test'},ROUTES=[],ADMIN_LOGIN_URL='',whatsappNumber='255650090876',SERVICE_API_URL='https://api.example.test';`
    : path === './customer-portal' ? `export const QuoteDialog='QuoteDialog',TrackingDialog='TrackingDialog',PortalDialog='PortalDialog',ContactFallback='ContactFallback';`
    : path === './booking-completion' ? `export const BookingDetailsDialog='BookingDetailsDialog';export function readBookingLink(hash=window.location.hash){const p=new URLSearchParams(hash.replace(/^#/,''));return p.has('booking')?{token:p.get('booking'),reference:p.get('reference')||''}:null;}`
    : path === './booking-attachments' ? `export const prepareBookingAttachment=()=>{throw Error('Uploads must be explicit');};`
    : path === './CoastMap.jsx' ? `export const CoastMap='CoastMap';` : '', loader: 'js' }));
} }] });

function nodes(tree) { const out = []; const walk = node => { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(walk); out.push(node); walk(node.props?.children); }; walk(tree); return out; }
function harness(address) {
  const h = { hooks: [], cursor: 0, dirty: false, effects: [], handlers: new Map(), replacements: [], tree: null, frames: [] };
  globalThis.window = { location: new URL(address), history: { state: { retained: true }, replaceState(state, _, url) { h.replacements.push(String(url)); window.location = new URL(url); assert.deepEqual(state, { retained: true }); } }, addEventListener(name, listener) { h.handlers.set(name, listener); }, removeEventListener(name) { h.handlers.delete(name); } };
  globalThis.document = { getElementById() { return {}; } };
  h.useState = initial => { const i = h.cursor++; if (!(i in h.hooks)) h.hooks[i] = { value: typeof initial === 'function' ? initial() : initial }; return [h.hooks[i].value, value => { const next = typeof value === 'function' ? value(h.hooks[i].value) : value; if (!Object.is(next, h.hooks[i].value)) { h.hooks[i].value = next; h.dirty = true; } }]; };
  h.useRef = initial => { const i = h.cursor++; return h.hooks[i] ??= { current: initial }; };
  h.useEffect = (effect, deps) => { const i = h.cursor++, old = h.hooks[i]; if (!old || deps.some((value, index) => !Object.is(value, old.deps[index]))) { h.hooks[i] = { deps, cleanup: old?.cleanup }; h.effects.push({ i, effect }); } };
  h.render = () => { h.dirty = true; let turns = 0; while (h.dirty) { assert.ok(turns++ < 20); h.dirty = false; h.cursor = 0; h.tree = globalThis.__uploadApp(); h.frames.push(h.tree); for (const { i, effect } of h.effects.splice(0)) { h.hooks[i].cleanup?.(); h.hooks[i].cleanup = effect(); } } return h.tree; };
  h.dialogs = tree => nodes(tree || h.tree).filter(node => node.type === 'TrackingDialog' || node.type === 'BookingDetailsDialog' || node.type?.name === 'SecureUploadDialog');
  h.hash = hash => { window.location.hash = hash; h.handlers.get('hashchange')(); h.render(); };
  h.unmount = () => { for (const value of h.hooks) value?.cleanup?.(); };
  globalThis.__uploadRoute = h; return h;
}
const encoded = Buffer.from(built.outputFiles[0].text).toString('base64');

test('private upload fragments win over booking/query tracking, are consumed, and hash changes replace their scope', async () => {
  const token = `SU1-${'a'.repeat(64)}`, next = `SU1-${'b'.repeat(64)}`;
  const h = harness(`https://fanaarlogistics.com/?tracking=FNL-SYNTHETIC#upload=${token}&booking=other-secret&reference=PRIVATE`);
  await import(`data:text/javascript;base64,${encoded}`); h.render();
  assert.ok(h.frames.every(frame => h.dialogs(frame).length === 1 && h.dialogs(frame)[0].type.name === 'SecureUploadDialog'));
  assert.equal(h.dialogs()[0].props.token, token); assert.equal(window.location.hash, ''); assert.equal(window.location.search, '?tracking=FNL-SYNTHETIC'); assert.ok(h.replacements.every(url => !url.includes(token) && !url.includes('other-secret')));
  h.hash(`#upload=${next}`); assert.equal(h.dialogs()[0].props.token, next); assert.equal(h.dialogs()[0].props.key, next); assert.equal(window.location.hash, '');
  h.dialogs()[0].props.onClose(); h.render(); assert.equal(h.dialogs().length, 0, 'Closing upload must not launch query tracking');
  h.hash('#booking=booking-secret&reference=FL-SYNTHETIC'); assert.equal(h.dialogs()[0].type, 'BookingDetailsDialog'); assert.equal(h.dialogs()[0].props.token, 'booking-secret'); assert.equal(window.location.hash, '');
  h.hash('#upload=invalid'); assert.equal(h.dialogs()[0].type.name, 'SecureUploadDialog'); assert.equal(h.dialogs()[0].props.token, 'invalid'); assert.equal(window.location.hash, '');
  h.unmount(); assert.equal(h.handlers.has('hashchange'), false);
});

test('ordinary tracking URLs retain their existing popup behavior without an upload fragment', () => {
  const h = harness('https://fanaarlogistics.com/?tracking=FL-SYNTHETIC#track'); h.render();
  assert.equal(h.dialogs().length, 1); assert.equal(h.dialogs()[0].type, 'TrackingDialog'); assert.equal(h.dialogs()[0].props.code, 'FL-SYNTHETIC'); assert.equal(h.replacements.length, 0); h.unmount();
});
