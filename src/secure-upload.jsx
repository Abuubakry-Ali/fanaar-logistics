import React, { useEffect, useRef, useState } from 'react';
import { Upload, FileCheck, LoaderCircle, ShieldCheck } from 'lucide-react';
import { SERVICE_API_URL } from './config';
import { prepareBookingAttachment } from './booking-attachments';
import { PortalDialog, ContactFallback } from './customer-portal';
import './secure-upload.css';

const MAX_BYTES = 1048576;
const TYPES = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  pdf: 'application/pdf', txt: 'text/plain', csv: 'text/csv',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
const UNAVAILABLE = 'This upload link is unavailable or has expired. Please ask Fanaar for a new link.';
const isToken = token => typeof token === 'string' && /^SU1-[a-f0-9]{64}$/.test(token);

export function readSecureUploadLink(hash = window.location.hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  if (!params.has('upload')) return null;
  const tokens = params.getAll('upload');
  return { token: tokens.length === 1 ? tokens[0].slice(0, 256) : '' };
}

export function uploadContext(data, now = Date.now()) {
  const value = data?.upload;
  if (!value || !['photo_progress', 'documents'].includes(value.purpose)
      || !Number.isInteger(value.maxBytes) || value.maxBytes < 1 || value.maxBytes > MAX_BYTES
      || !Number.isInteger(value.attachmentLimit) || value.attachmentLimit < 1 || value.attachmentLimit > 40
      || !Number.isInteger(value.attachmentCount) || value.attachmentCount < 0 || value.attachmentCount > value.attachmentLimit
      || !Number.isFinite(Date.parse(value.expiresAt)) || Date.parse(value.expiresAt) <= now
      || !Array.isArray(value.allowedTypes)) throw new Error(UNAVAILABLE);
  const allowedTypes = [...new Set(value.allowedTypes)].filter(type => Object.values(TYPES).includes(type)
    && (value.purpose !== 'photo_progress' || type.startsWith('image/')));
  if (!allowedTypes.length) throw new Error(UNAVAILABLE);
  // Keep only the public upload contract, even if a future response includes other fields.
  return {
    label: 'Upload requested files',
    instruction: value.purpose === 'photo_progress'
      ? 'Send the requested progress photos to Fanaar.'
      : 'Send the supporting files requested by Fanaar.',
    purpose: value.purpose, expiresAt: value.expiresAt, allowedTypes,
    maxBytes: value.maxBytes, attachmentLimit: value.attachmentLimit, attachmentCount: value.attachmentCount,
  };
}

export async function secureUploadRequest(token, { attachment, key, signal } = {}) {
  if (!isToken(token)) throw new Error(UNAVAILABLE);
  if (!SERVICE_API_URL) throw new Error('Uploads are temporarily unavailable. Please contact Fanaar.');
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 25000);
  try {
    const response = await fetch(`${SERVICE_API_URL}/api/bookings/details`, {
      method: attachment ? 'POST' : 'GET', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer',
      headers: { Authorization: `Bearer ${token}`, ...(attachment ? { 'Content-Type': 'application/json', 'Idempotency-Key': key } : {}) },
      ...(attachment ? { body: JSON.stringify({ action: 'attachment', attachment }) } : {}),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = [401, 403, 404, 410].includes(response.status) ? UNAVAILABLE
        : response.status === 429 ? 'Too many upload requests. Wait a moment, then retry here.'
        : response.status === 409 ? 'The upload limit or link has changed. Please contact Fanaar if retrying here does not work.'
        : response.status === 400 ? 'That file was not accepted. Check its format and size, or ask Fanaar for help.'
        : 'We could not confirm this upload. Retry here to avoid sending a duplicate.';
      throw Object.assign(new Error(message), { status: response.status });
    }
    if (!attachment) return { upload: uploadContext(data) };
    const receipt = data?.attachment;
    if (data?.upload?.state !== 'received' || !receipt || typeof receipt.id !== 'string'
        || typeof receipt.name !== 'string' || typeof receipt.type !== 'string' || !Number.isInteger(receipt.size)
        || receipt.size < 1 || receipt.size > MAX_BYTES) {
      throw new Error('We could not confirm this upload. Retry here to avoid sending a duplicate.');
    }
    return { upload: { state: 'received' }, attachment: { id: receipt.id, name: receipt.name, type: receipt.type, size: receipt.size } };
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The upload was interrupted or timed out. Retry here to confirm it safely.');
    if (error instanceof TypeError) throw new Error('We could not connect. Check your connection and retry here to avoid a duplicate.');
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

export function uploadAccept(context) {
  return Object.entries(TYPES).filter(([, type]) => context.allowedTypes.includes(type)).map(([ext]) => `.${ext}`).join(',');
}

export async function prepareSecureBatch(files, context, prepare = prepareBookingAttachment) {
  const selected = Array.from(files);
  const available = Math.min(3, context.attachmentLimit - context.attachmentCount);
  if (!selected.length || selected.length > available) throw new Error(`Choose up to ${available} ${available === 1 ? 'file' : 'files'} for this batch.`);
  const batch = [];
  for (const file of selected) {
    const type = TYPES[file.name.split('.').pop().toLowerCase()];
    if (!type || !context.allowedTypes.includes(type)) throw new Error('That file format is not allowed by this upload link.');
    const prepared = await prepare(file);
    const size = Math.floor(prepared.dataBase64.length * 3 / 4) - (prepared.dataBase64.endsWith('==') ? 2 : prepared.dataBase64.endsWith('=') ? 1 : 0);
    if (!context.allowedTypes.includes(prepared.type) || size < 1 || size > context.maxBytes) throw new Error('That file is too large or is not in an allowed format after preparation.');
    const attachment = Object.freeze({ name: prepared.name, type: prepared.type, dataBase64: prepared.dataBase64 });
    batch.push({ key: crypto.randomUUID(), attachment, size, state: 'ready' });
  }
  return batch;
}

const initial = token => ({ token, context: null, loading: true, preparing: false, sending: false, items: [], error: '' });

export function SecureUploadDialog({ token, onClose }) {
  const [state, setState] = useState(() => initial(token));
  const [reload, setReload] = useState(0);
  const scope = useRef(null);
  const currentToken = useRef(token);
  currentToken.current = token;
  const input = useRef(null);
  useEffect(() => {
    const operation = { token, controller: new AbortController(), alive: true, working: false };
    scope.current = operation;
    const current = () => operation.alive && currentToken.current === token && scope.current === operation;
    setState(initial(token));
    if (!isToken(token)) setState({ ...initial(token), loading: false, error: UNAVAILABLE });
    else secureUploadRequest(token, { signal: operation.controller.signal }).then(result => {
      if (current()) setState(previous => ({ ...previous, context: result.upload, loading: false }));
    }).catch(error => {
      if (current()) setState(previous => ({ ...previous, loading: false, error: error.message }));
    });
    return () => { operation.alive = false; operation.controller.abort(); };
  }, [token, reload]);
  const view = state.token === token ? state : initial(token);
  const active = operation => operation?.alive && currentToken.current === token && scope.current === operation;
  const busy = view.preparing || view.sending;
  const complete = view.items.length > 0 && view.items.every(item => item.state === 'received');
  const remaining = view.context ? view.context.attachmentLimit - view.context.attachmentCount : 0;
  function clearBatch() {
    if (!active(scope.current) || scope.current.working) return;
    setState(previous => previous.token === token && (previous.items.every(item => item.state === 'ready') || previous.items.every(item => item.state === 'received'))
      ? { ...previous, items: [], error: '' } : previous);
  }
  function removeRejected(key) {
    if (!active(scope.current) || scope.current.working) return;
    setState(previous => previous.token === token ? { ...previous, error: '', items: previous.items.filter(item => item.key !== key || item.state !== 'rejected') } : previous);
  }

  async function chooseFiles(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    const operation = scope.current;
    if (!active(operation) || operation.working || !view.context || view.items.length || !files.length) return;
    operation.working = true;
    setState(previous => ({ ...previous, preparing: true, error: '' }));
    try {
      const items = await prepareSecureBatch(files, view.context);
      if (active(operation)) setState(previous => ({ ...previous, items }));
    } catch (error) {
      if (active(operation)) setState(previous => ({ ...previous, error: error.message }));
    } finally {
      operation.working = false;
      if (active(operation)) setState(previous => ({ ...previous, preparing: false }));
    }
  }

  async function sendFiles() {
    const operation = scope.current;
    if (!active(operation) || operation.working || !view.context || !view.items.length || complete || view.items.some(item => item.state === 'rejected')) return;
    operation.working = true;
    setState(previous => ({ ...previous, sending: true, error: '' }));
    try {
      for (const item of view.items) {
        if (!active(operation)) return;
        if (item.state === 'received') continue;
        setState(previous => ({ ...previous, items: previous.items.map(row => row.key === item.key ? { ...row, state: 'sending' } : row) }));
        try {
          await secureUploadRequest(token, { attachment: item.attachment, key: item.key, signal: operation.controller.signal });
          if (!active(operation)) return;
          setState(previous => ({ ...previous,
            context: { ...previous.context, attachmentCount: Math.min(previous.context.attachmentLimit, previous.context.attachmentCount + 1) },
            items: previous.items.map(row => row.key === item.key ? { ...row, state: 'received' } : row),
          }));
        } catch (error) {
          if (active(operation)) setState(previous => ({ ...previous, error: error.message,
            items: previous.items.map(row => row.key === item.key ? { ...row, state: error.status === 400 ? 'rejected' : 'retry' } : row),
            ...([401, 403, 404, 410].includes(error.status) ? { context: null } : {}),
          }));
          return;
        }
      }
    } finally {
      operation.working = false;
      if (active(operation)) setState(previous => ({ ...previous, sending: false }));
    }
  }

  const expires = view.context ? new Date(view.context.expiresAt).toLocaleString('en-GB', { timeZone: 'Africa/Dar_es_Salaam', dateStyle: 'medium', timeStyle: 'short' }) : '';
  return <PortalDialog titleId="secure-upload-title" onClose={onClose} busy={busy} className="secure-upload-dialog">
    <div className="customer-heading"><span className="eyebrow">FANAAR FILE UPLOAD</span><h2 id="secure-upload-title">Upload requested files.</h2>
      <p>Use this private link to send files to our team. You can upload files here without signing in.</p></div>
    {view.loading ? <div className="tracking-loading" role="status"><LoaderCircle className="spin" size={25}/>Checking upload link…</div> : <>
      {view.context && <>
        <div className="secure-upload-context"><strong>{view.context.instruction}</strong><p>{view.context.attachmentCount} of {view.context.attachmentLimit} files received. Up to 3 files per batch.</p><p>Each prepared file: {view.context.maxBytes === MAX_BYTES ? '1 MiB' : `${view.context.maxBytes} bytes`} maximum. Link expires {expires} EAT.</p></div>
        {!view.items.length && remaining > 0 && <label className="secure-upload-picker"><Upload size={25}/><strong>{view.preparing ? 'Preparing files…' : 'Choose files'}</strong>
          <span>{view.context.purpose === 'photo_progress' ? 'JPG, PNG or WebP photos. Larger photos are resized before upload.' : 'Choose an allowed photo or document.'}</span>
          <span className="secure-upload-formats">Allowed: {uploadAccept(view.context).replaceAll('.', '').replaceAll(',', ', ').toUpperCase()}</span>
          <input ref={input} type="file" accept={uploadAccept(view.context)} multiple disabled={busy} onChange={chooseFiles}/></label>}
        {!view.items.length && remaining === 0 && <p className="secure-upload-received" role="status">The file limit for this link has been reached. Ask Fanaar if more files are needed.</p>}
        {!!view.items.length && <ul className="secure-upload-list" aria-label="This upload batch">{view.items.map((item, index) => <li key={item.key}>
          {item.state === 'received' ? <FileCheck size={20}/> : item.state === 'sending' ? <LoaderCircle size={20} className="spin"/> : <Upload size={20}/>}
          <span><strong>{item.attachment.name}</strong><small>{Math.ceil(item.size / 1024)} KiB · File {index + 1} of {view.items.length}</small></span>
          <b>{item.state === 'received' ? 'Received' : item.state === 'sending' ? 'Uploading…' : item.state === 'retry' ? 'Retry needed' : item.state === 'rejected' ? 'Not accepted' : 'Ready'}</b>
          {item.state === 'rejected' && <button type="button" className="quiet-link" disabled={busy} onClick={() => removeRejected(item.key)} aria-label={`Remove rejected file ${item.attachment.name}`}>Remove</button>}
        </li>)}</ul>}
        {!!view.items.length && view.items.every(item => item.state === 'ready') && !busy && <button type="button" className="quiet-link secure-upload-recheck" onClick={clearBatch}>Choose different files</button>}
        {complete && <p className="secure-upload-received" role="status">Your files have been received by Fanaar. You can close this window{remaining > 0 ? ' or choose another batch' : ''}.</p>}
        <div className="customer-form-actions">
          {complete ? <><button type="button" className="quiet-link" onClick={onClose}>Close window</button>{remaining > 0 && <button type="button" className="button button-primary" onClick={clearBatch}>Choose more files <Upload size={17}/></button>}</>
            : view.items.length ? <><span className="customer-step-note">{view.items.some(item => item.state === 'rejected') ? 'Remove the rejected file to choose another or continue.' : view.items.some(item => item.state === 'retry') ? 'Retry here with the same files to avoid duplicates.' : 'Files are sent only when you click Upload.'}</span><button type="button" className="button button-primary" disabled={busy || view.items.some(item => item.state === 'rejected')} onClick={sendFiles}>{view.sending ? 'Uploading…' : view.items.some(item => item.state === 'retry') ? 'Retry remaining files' : 'Upload files'} <Upload size={17}/></button></>
            : <span className="customer-step-note">Only files you choose are uploaded.</span>}
        </div>
      </>}
      {view.error && <p className="customer-error" role="alert">{view.error}</p>}
      {view.items.some(item => item.state === 'retry') && <p className="customer-note">Keep this window open to retry safely. If you leave before confirmation, ask Fanaar before sending the same file again.</p>}
      {!view.context && isToken(token) && <button type="button" className="quiet-link secure-upload-recheck" onClick={() => { if (active(scope.current)) setReload(value => value + 1); }}>Check link again</button>}
      <p className="customer-note"><ShieldCheck size={16}/>Keep this link private. It allows uploads only; existing files and shipment details are not shown.</p>
    </>}
    <ContactFallback/>
  </PortalDialog>;
}
