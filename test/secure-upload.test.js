import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const token = `SU1-${'a'.repeat(64)}`;
const otherToken = `SU1-${'b'.repeat(64)}`;
const context = changes => ({ upload: { label: 'Upload requested files', instruction: 'Generic instructions', purpose: 'documents', expiresAt: '2099-01-01T00:00:00Z', allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'], maxBytes: 1048576, attachmentLimit: 20, attachmentCount: 0, ...changes } });
const attachment = (name = 'example.pdf') => ({ name, type: 'application/pdf', dataBase64: Buffer.from('%PDF-1.4 synthetic fixture').toString('base64') });
const response = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const receipt = name => ({ upload: { state: 'received' }, attachment: { id: `file-${name}`, name, type: 'application/pdf', size: 26 } });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flatten = node => node == null || typeof node === 'boolean' ? '' : Array.isArray(node) ? node.map(flatten).join('') : typeof node !== 'object' ? String(node) : flatten(node.props?.children);

const reactStub = `export const useState=(...a)=>globalThis.__uploadUI.useState(...a),useRef=(...a)=>globalThis.__uploadUI.useRef(...a),useEffect=(...a)=>globalThis.__uploadUI.useEffect(...a);const React={createElement:(type,props,...children)=>({type,props:{...props,children}}),createContext:()=>({Provider:'Provider'}),useCallback:fn=>fn,useContext:()=>null,Fragment:'Fragment'};export default React;`;
const built = await build({ entryPoints: [fileURLToPath(new URL('../src/secure-upload.jsx', import.meta.url))], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent', plugins: [{ name: 'upload-surfaces', setup(builder) {
  builder.onResolve({ filter: /^(react|lucide-react|\.\/config|\.\/customer-portal|\.\/booking-attachments)$|\.css$/ }, args => ({ path: args.path, namespace: 'unit' }));
  builder.onLoad({ filter: /.*/, namespace: 'unit' }, ({ path }) => ({ contents: path === 'react' ? reactStub
    : path === 'lucide-react' ? `export const Upload=()=>null,FileCheck=Upload,LoaderCircle=Upload,ShieldCheck=Upload;`
    : path === './config' ? `export const SERVICE_API_URL='https://api.example.test';`
    : path === './customer-portal' ? `export const PortalDialog='PortalDialog',ContactFallback='ContactFallback';`
    : path === './booking-attachments' ? `export const prepareBookingAttachment=(...a)=>globalThis.__uploadUI.prepare(...a);` : '', loader: 'js' }));
} }] });
const module = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
const { SecureUploadDialog, readSecureUploadLink, uploadContext, secureUploadRequest, prepareSecureBatch, uploadAccept } = module;

function harness({ value = token, fetcher = async () => response(context()), prepare = async file => attachment(file.name) } = {}) {
  const h = { hooks: [], cursor: 0, effects: [], dirty: false, alive: true, tree: null, props: { token: value, onClose() {} }, calls: [], frames: [], prepare };
  h.useState = initial => { const index = h.cursor++; if (!(index in h.hooks)) h.hooks[index] = { value: typeof initial === 'function' ? initial() : initial }; return [h.hooks[index].value, value => { assert.ok(h.alive, 'State write after unmount'); const next = typeof value === 'function' ? value(h.hooks[index].value) : value; if (!Object.is(next, h.hooks[index].value)) { h.hooks[index].value = next; h.dirty = true; } }]; };
  h.useRef = initial => { const index = h.cursor++; return h.hooks[index] ??= { current: initial }; };
  h.useEffect = (effect, deps) => { const index = h.cursor++, old = h.hooks[index]; if (!old || deps.some((value, i) => !Object.is(value, old.deps[i]))) { h.hooks[index] = { deps, cleanup: old?.cleanup }; h.effects.push({ index, effect }); } };
  h.flush = () => { let turns = 0; while (h.dirty) { assert.ok(turns++ < 30, 'Render loop'); h.dirty = false; h.cursor = 0; h.tree = SecureUploadDialog(h.props); h.frames.push(h.tree); for (const { index, effect } of h.effects.splice(0)) { h.hooks[index].cleanup?.(); h.hooks[index].cleanup = effect(); } } return h.tree; };
  h.render = props => { h.props = { ...h.props, ...props }; h.dirty = true; return h.flush(); };
  h.nodes = (tree = h.flush()) => { const nodes = []; const walk = node => { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) { node.forEach(walk); return; } nodes.push(node); walk(node.props?.children); }; walk(tree); return nodes; };
  h.dom = tree => flatten(tree || h.flush());
  h.click = label => { const button = h.nodes().find(node => node.type === 'button' && flatten(node).trim() === label); assert.ok(button, `Missing button ${label}`); assert.ok(!button.props.disabled, 'Button disabled'); const result = button.props.onClick(); h.flush(); return result; };
  h.choose = files => { const input = h.nodes().find(node => node.type === 'input'); assert.ok(input); assert.ok(!input.props.disabled); const result = input.props.onChange({ target: { files, value: 'fakepath' } }); h.flush(); return result; };
  h.settle = async () => { for (let i = 0; i < 20; i++) { await Promise.resolve(); h.flush(); } };
  h.unmount = () => { for (const hook of h.hooks) hook?.cleanup?.(); h.alive = false; };
  globalThis.__uploadUI = h;
  globalThis.fetch = (...args) => { h.calls.push(args); return fetcher(...args); };
  h.render(); return h;
}

test('upload tokens are read only from an explicit fragment and duplicate values fail closed', () => {
  assert.deepEqual(readSecureUploadLink(`#upload=${token}`), { token });
  assert.equal(readSecureUploadLink('#track'), null);
  assert.equal(readSecureUploadLink('#booking=anything'), null);
  assert.deepEqual(readSecureUploadLink(`#upload=${token}&upload=${otherToken}`), { token: '' });
  assert.equal(readSecureUploadLink('#upload=').token, '');
  assert.equal(readSecureUploadLink(`#upload=${'x'.repeat(1000)}`).token.length, 256);
});

test('context is a narrow safe DTO and rejects unsafe limits, purposes and expiry', () => {
  const safe = uploadContext(context({ customerName: 'PRIVATE NAME', quoteId: 'PRIVATE ID', instruction: 'PRIVATE DATA', label: 'PRIVATE LABEL', gallery: ['PRIVATE URL'] }));
  assert.deepEqual(Object.keys(safe).sort(), ['label', 'instruction', 'purpose', 'expiresAt', 'allowedTypes', 'maxBytes', 'attachmentLimit', 'attachmentCount'].sort());
  assert.doesNotMatch(JSON.stringify(safe), /PRIVATE/);
  for (const bad of [{ maxBytes: 1048577 }, { maxBytes: 0 }, { attachmentCount: 21 }, { attachmentLimit: 41 }, { purpose: 'load_photos' }, { expiresAt: 'invalid' }, { expiresAt: '2000-01-01' }, { allowedTypes: ['text/html', 'image/svg+xml'] }]) assert.throws(() => uploadContext(context(bad)), /unavailable/);
  const photos = uploadContext(context({ purpose: 'photo_progress', allowedTypes: ['image/jpeg', 'application/pdf'] }));
  assert.deepEqual(photos.allowedTypes, ['image/jpeg']); assert.equal(uploadAccept(photos), '.jpg,.jpeg');
});

test('transport uses a fixed API path and Bearer header, with no credentials, query token or leaked error content', async () => {
  let call;
  globalThis.fetch = async (...args) => { call = args; return response(context()); };
  await secureUploadRequest(token);
  assert.equal(call[0], 'https://api.example.test/api/bookings/details'); assert.equal(call[1].headers.Authorization, `Bearer ${token}`); assert.equal(call[1].credentials, 'omit'); assert.equal(call[1].redirect, 'error'); assert.equal(call[1].referrerPolicy, 'no-referrer'); assert.equal(call[1].body, undefined);
  globalThis.fetch = async (...args) => { call = args; return response(receipt('example.pdf')); };
  await secureUploadRequest(token, { attachment: attachment(), key: 'fixed-retry-key' });
  assert.equal(call[1].headers['Idempotency-Key'], 'fixed-retry-key'); assert.deepEqual(JSON.parse(call[1].body), { action: 'attachment', attachment: attachment() });
  globalThis.fetch = async () => response({ error: { message: 'PRIVATE CUSTOMER DATA' } }, 404);
  await assert.rejects(secureUploadRequest(token), error => error.status === 404 && !error.message.includes('PRIVATE'));
  await assert.rejects(secureUploadRequest('bad-token'), /unavailable/);
});

test('batch preparation limits three files, checks link formats and actual decoded byte size, and strips previews', async () => {
  const data = uploadContext(context()); let prepared = 0;
  await assert.rejects(prepareSecureBatch(Array.from({ length: 4 }, () => ({ name: 'example.pdf' })), data, async () => { prepared++; return attachment(); }), /up to 3/); assert.equal(prepared, 0);
  for (const name of ['bad.html', 'bad.svg', 'bad.docm', 'bad.xlsm']) await assert.rejects(prepareSecureBatch([{ name }], data), /format/);
  const exact = Buffer.alloc(1048576).toString('base64');
  const rows = await prepareSecureBatch([{ name: 'example.pdf' }], data, async () => ({ ...attachment(), dataBase64: exact, preview: 'PRIVATE PREVIEW' }));
  assert.equal(rows[0].size, 1048576); assert.ok(Object.isFrozen(rows[0].attachment)); assert.equal(rows[0].attachment.preview, undefined); assert.ok(rows[0].key);
  await assert.rejects(prepareSecureBatch([{ name: 'example.pdf' }], data, async () => ({ ...attachment(), dataBase64: Buffer.alloc(1048577).toString('base64') })), /too large/);
  await assert.rejects(prepareSecureBatch([{ name: 'photo.png' }], uploadContext(context({ allowedTypes: ['image/png'] })), async () => ({ name: 'photo.jpg', type: 'image/jpeg', dataBase64: 'eA==' })), /allowed format/);
  await assert.rejects(prepareSecureBatch([{ name: 'example.pdf' }], uploadContext(context({ attachmentCount: 20 }))), /up to 0/);
});

test('valid links load only generic context; invalid links make no request and never render a gallery', async () => {
  let h = harness({ value: 'not-a-token' }); await h.settle(); assert.equal(h.calls.length, 0); assert.match(h.dom(), /unavailable or has expired/); assert.equal(h.nodes().filter(node => node.type === 'input').length, 0); h.unmount();
  h = harness({ fetcher: async () => response(context({ customerName: 'PRIVATE CUSTOMER', price: 'PRIVATE PRICE', instruction: 'PRIVATE INSTRUCTION', gallery: [{ url: 'https://private.test' }] })) }); await h.settle();
  assert.equal(h.calls.length, 1); assert.doesNotMatch(h.dom(), /PRIVATE/); assert.ok(!h.nodes().some(node => node.type === 'img' || node.type === 'a')); assert.equal(h.nodes().find(node => node.type === 'input').props.multiple, true); h.unmount();
});

test('upload is explicit, sequential and retries unchanged payload/key while skipping confirmed files', async () => {
  let posts = 0; const first = deferred();
  const h = harness({ fetcher: async (_url, options) => { if (options.method === 'GET') return response(context()); posts++; if (posts === 1) return first.promise; if (posts === 2) throw new TypeError('Offline'); return response(receipt(JSON.parse(options.body).attachment.name)); } });
  await h.settle(); await h.choose([{ name: 'one.pdf' }, { name: 'two.pdf' }, { name: 'three.pdf' }]); await h.settle(); assert.equal(h.calls.length, 1, 'Selecting files must not submit them');
  const sending = h.click('Upload files'); await h.settle(); assert.equal(posts, 1, 'Only one file may be in flight'); assert.equal(h.tree.props.busy, true);
  first.resolve(response(receipt('one.pdf'))); await sending; await h.settle(); assert.equal(posts, 2); assert.match(h.dom(), /Retry needed/); assert.match(h.dom(), /1 of 20 files received/);
  const failed = h.calls.filter(([, options]) => options.method === 'POST')[1][1];
  await h.click('Retry remaining files'); await h.settle(); assert.equal(posts, 4); const posted = h.calls.filter(([, options]) => options.method === 'POST').map(([, options]) => options);
  assert.equal(posted[2].headers['Idempotency-Key'], failed.headers['Idempotency-Key']); assert.equal(posted[2].body, failed.body); assert.equal(posted.filter(value => JSON.parse(value.body).attachment.name === 'one.pdf').length, 1);
  assert.equal(new Set(posted.map(value => value.headers['Idempotency-Key'])).size, 3); assert.match(h.dom(), /3 of 20 files received/); assert.match(h.dom(), /Your files have been received/); h.unmount();
});

test('malformed successful upload receipts remain retryable with identical bytes and key', async () => {
  let posts = 0;
  const h = harness({ fetcher: async (_url, options) => options.method === 'GET' ? response(context()) : ++posts === 1 ? response({ upload: { state: 'received' } }) : response(receipt('one.pdf')) });
  await h.settle(); await h.choose([{ name: 'one.pdf' }]); await h.click('Upload files'); await h.settle(); assert.match(h.dom(), /could not confirm/);
  await h.click('Retry remaining files'); await h.settle(); const calls = h.calls.filter(([, value]) => value.method === 'POST'); assert.equal(calls[0][1].body, calls[1][1].body); assert.equal(calls[0][1].headers['Idempotency-Key'], calls[1][1].headers['Idempotency-Key']); h.unmount();
});

test('definitive validation rejection can be replaced, while provider failures keep the original retry identity', async () => {
  let posts = 0;
  let h = harness({ fetcher: async (_url, options) => options.method === 'GET' ? response(context()) : ++posts === 1 ? response({}, 400) : response(receipt('replacement.pdf')) });
  await h.settle(); await h.choose([{ name: 'rejected.pdf' }]); await h.click('Upload files'); await h.settle();
  assert.match(h.dom(), /Not accepted/); assert.equal(h.nodes().find(node => node.type === 'button' && flatten(node).trim() === 'Upload files').props.disabled, true);
  h.click('Remove'); await h.choose([{ name: 'replacement.pdf' }]); await h.click('Upload files'); await h.settle();
  let calls = h.calls.filter(([, value]) => value.method === 'POST'); assert.notEqual(calls[0][1].headers['Idempotency-Key'], calls[1][1].headers['Idempotency-Key']); assert.match(h.dom(), /Your files have been received/); h.unmount();
  posts = 0;
  h = harness({ fetcher: async (_url, options) => options.method === 'GET' ? response(context()) : ++posts === 1 ? response({}, 503) : response(receipt('same.pdf')) });
  await h.settle(); await h.choose([{ name: 'same.pdf' }]); const oldClear = h.nodes().find(node => node.type === 'button' && flatten(node).trim() === 'Choose different files');
  await h.click('Upload files'); await h.settle(); oldClear.props.onClick(); h.flush(); assert.match(h.dom(), /Retry needed/); assert.ok(!h.nodes().some(node => node.type === 'input'));
  await h.click('Retry remaining files'); await h.settle(); calls = h.calls.filter(([, value]) => value.method === 'POST'); assert.equal(calls[0][1].body, calls[1][1].body); assert.equal(calls[0][1].headers['Idempotency-Key'], calls[1][1].headers['Idempotency-Key']); h.unmount();
});

test('changing the private link clears file names before effects and ignores old context/preparation responses', async () => {
  const preparing = deferred();
  const h = harness({ prepare: () => preparing.promise }); await h.settle(); const pending = h.choose([{ name: 'OLD PRIVATE FILE.pdf' }]);
  const start = h.frames.length; h.render({ token: otherToken }); preparing.resolve(attachment('OLD PRIVATE FILE.pdf')); await pending; await h.settle();
  assert.ok(h.frames.slice(start).every(frame => !h.dom(frame).includes('OLD PRIVATE FILE'))); assert.equal(h.calls.length, 2); assert.equal(h.calls[1][1].headers.Authorization, `Bearer ${otherToken}`); h.unmount();
  const old = deferred(), fresh = deferred(); const second = harness({ fetcher: (_url, options) => options.headers.Authorization.endsWith(token) ? old.promise : fresh.promise });
  second.render({ token: otherToken }); old.resolve(response(context({ attachmentCount: 19 }))); await second.settle(); assert.doesNotMatch(second.dom(), /19 of/);
  fresh.resolve(response(context({ attachmentCount: 2 }))); await second.settle(); assert.match(second.dom(), /2 of 20/); second.unmount();
});

test('scope changes and unmount stop queued uploads and discard late upload success/failure', async () => {
  for (const unmount of [false, true]) for (const reject of [false, true]) {
    const pending = deferred(); let posts = 0;
    const h = harness({ fetcher: async (_url, options) => options.method === 'GET' ? response(context()) : (++posts, pending.promise) });
    await h.settle(); await h.choose([{ name: 'OLD FILE.pdf' }, { name: 'NEXT FILE.pdf' }]); const uploading = h.click('Upload files'); await h.settle(); const signal = h.calls.at(-1)[1].signal;
    if (unmount) h.unmount(); else h.render({ token: otherToken }); assert.equal(signal.aborted, true);
    if (reject) pending.reject(new TypeError('Late network failure')); else pending.resolve(response(receipt('OLD FILE.pdf')));
    await uploading; await h.settle(); assert.equal(posts, 1); if (!unmount) { assert.doesNotMatch(h.dom(), /OLD FILE|NEXT FILE|Late network/); h.unmount(); }
  }
});
