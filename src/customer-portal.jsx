import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Copy, ImagePlus, LoaderCircle, MapPin, Package, Phone, Ship, X } from 'lucide-react';
import { CONTACT, whatsappNumber } from './config';
import { preparePhoto, serviceRequest } from './customer-api';
import './customer-portal.css';

const destinations = ['Dar es Salaam', 'Zanzibar (Unguja)', 'Zanzibar (Pemba)', 'Tanga'];
const emptyForm = { customerName: '', company: '', phone: '', email: '', from: '', to: '', service: 'standard', cargoType: '', description: '', quantity: '', weightKg: '', weightUnit: 'kg', volume: '', lengthCm: '', widthCm: '', heightCm: '', declaredValue: '', pickupAddress: '', deliveryAddress: '', preferredDate: '', notes: '', website: '' };
const friendlyCity = city => city === 'Zanzibar' ? 'Zanzibar (Unguja)' : city || '';
const labels = { booked: 'Shipment booked', received: 'Package picked up', in_transit: 'On the way', arrived: 'Arrived at destination', ready_for_collection: 'Ready for collection', delivered: 'Delivered', cancelled: 'Shipment cancelled' };
const dateLabel = value => value ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Dar_es_Salaam', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) + ' EAT' : 'To be confirmed';

function PortalDialog({ titleId, onClose, busy = false, children, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const active = document.activeElement;
    const el = ref.current;
    el.showModal();
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = before; active?.focus(); };
  }, []);
  return <dialog ref={ref} className={`customer-dialog ${className}`} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} onClick={event => { if (event.target === ref.current && !busy) onClose(); }}>
    <button className="customer-close icon-button" type="button" onClick={onClose} disabled={busy} aria-label="Close window"><X size={21}/></button>{children}
  </dialog>;
}

function Field({ label, hint, children, full = false }) {
  const id = React.useId();
  const nodes = React.Children.toArray(children);
  const inputIndex = nodes.findIndex(node => React.isValidElement(node) && ['input', 'select', 'textarea'].includes(node.type));
  if (inputIndex >= 0) nodes[inputIndex] = React.cloneElement(nodes[inputIndex], { id, 'aria-describedby': hint ? `${id}-hint` : undefined });
  return <div className={`customer-field ${full ? 'full' : ''}`} role={inputIndex < 0 ? 'group' : undefined} aria-labelledby={inputIndex < 0 ? `${id}-label` : undefined}>{inputIndex >= 0 ? <label htmlFor={id}>{label}</label> : <span id={`${id}-label`}>{label}</span>}{nodes}{hint && <small id={`${id}-hint`}>{hint}</small>}</div>;
}

function ContactFallback() {
  return <div className="customer-help"><span>Prefer a conversation?</span><a href={`tel:${CONTACT.phone.replace(/[^+\d]/g, '')}`}><Phone size={14}/>{CONTACT.phone}</a>{whatsappNumber && <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">WhatsApp our team</a>}</div>;
}

export function QuoteDialog({ route, onClose }) {
  const [form, setForm] = useState(() => ({ ...emptyForm, from: friendlyCity(route?.from), to: friendlyCity(route?.to) }));
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const requestKey = useRef(crypto.randomUUID());
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, [step, result]);
  const update = event => { const { name, value } = event.target; setForm(current => ({ ...current, [name]: value })); setError(''); };
  const input = (name, attributes = {}) => <input name={name} value={form[name]} onChange={update} {...attributes}/>;
  async function addPhotos(event) {
    const files = Array.from(event.target.files || []); event.target.value = '';
    if (files.length + photos.length > 3) { setError('You can add up to three package photos.'); return; }
    setPhotoBusy(true); setError('');
    try { const prepared = await Promise.all(files.map(preparePhoto)); setPhotos(current => [...current, ...prepared]); }
    catch (failure) { setError(failure.message || 'We couldn’t read that photo. Please choose another.'); }
    finally { setPhotoBusy(false); }
  }
  async function submit(event) {
    event.preventDefault(); setError('');
    if (step === 0 && form.from === form.to) { setError('Please choose different pickup and destination locations.'); return; }
    if (step < 2) { setStep(step + 1); return; }
    if (photoBusy || sending) return;
    setSending(true);
    try {
      const payload = { ...form, photos: photos.map(({ name, type, dataBase64 }) => ({ name, type, dataBase64 })) };
      for (const key of ['quantity', 'weightKg', 'lengthCm', 'widthCm', 'heightCm', 'declaredValue']) payload[key] = payload[key] === '' ? null : Number(payload[key]);
      const response = await serviceRequest('/api/quotes', { method: 'POST', headers: { 'Idempotency-Key': requestKey.current }, body: JSON.stringify(payload) });
      if (!response.quote?.reference) throw new Error('We couldn’t confirm your request reference. Please contact our team.');
      setResult(response.quote);
    } catch (failure) { setError(failure.message); }
    finally { setSending(false); }
  }
  return <PortalDialog titleId="request-title" onClose={onClose} busy={sending}>
    {result ? <div className="customer-success"><span className="customer-success-mark"><CheckCircle2 size={33}/></span><span className="eyebrow">YOUR REQUEST IS WITH US</span><h2 id="request-title" tabIndex="-1" ref={heading}>Thank you, {form.customerName.split(' ')[0]}.</h2><p>Our team will review your cargo details and contact you to confirm the quote and next steps.</p><div className="request-reference"><span>Your quote reference</span><strong>{result.reference}</strong><button type="button" className="text-button" onClick={async () => { try { await navigator.clipboard.writeText(result.reference); setCopied(true); } catch { setCopied(false); } }}><Copy size={14}/>{copied ? 'Copied' : 'Copy reference'}</button></div><p className="customer-note">This is your quote reference. Once your shipment is confirmed, we’ll share a separate tracking number.</p><button type="button" className="button button-primary" onClick={onClose}>Back to Fanaar <Check size={17}/></button><ContactFallback/></div> : <>
      <div className="customer-heading"><span className="eyebrow">LET’S MOVE YOUR CARGO</span><h2 id="request-title" tabIndex="-1" ref={heading}>A quote, made simple.</h2><p>Tell us a little about your shipment. Our team will confirm the price with you.</p></div>
      <ol className="quote-progress" aria-label="Request progress">{['Your journey', 'Your cargo', 'Finishing touches'].map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined} className={step >= index ? 'active' : ''}><span>{step > index ? <Check size={13}/> : index + 1}</span>{label}</li>)}</ol>
      <form className="customer-form" onSubmit={submit}>
        <p className="customer-required">Fields marked * are required.</p>
        <div className="customer-honeypot" aria-hidden="true"><label>Leave this field empty<input name="website" value={form.website} onChange={update} tabIndex="-1" autoComplete="off"/></label></div>
        {step === 0 && <fieldset><legend>Your contact and route</legend><div className="customer-grid">
          <Field label="Your name *">{input('customerName', { required: true, autoComplete: 'name', maxLength: 120, placeholder: 'Full name' })}</Field>
          <Field label="Company (optional)">{input('company', { autoComplete: 'organization', maxLength: 160, placeholder: 'Business or organisation' })}</Field>
          <Field label="Phone number *" hint="We’ll use this to discuss your quote.">{input('phone', { type: 'tel', required: true, autoComplete: 'tel', maxLength: 30, placeholder: '+255 …' })}</Field>
          <Field label="Email (optional)" hint="Add an email if you’d like written updates.">{input('email', { type: 'email', autoComplete: 'email', maxLength: 254, placeholder: 'you@example.com' })}</Field>
          <Field label="From *"><select name="from" value={form.from} required onChange={update}><option value="">Choose pickup location</option>{destinations.map(city => <option key={city}>{city}</option>)}</select></Field>
          <Field label="To *"><select name="to" value={form.to} required onChange={update}><option value="">Choose destination</option>{destinations.map(city => <option key={city}>{city}</option>)}</select></Field>
          <Field label="Service preference" full><div className="service-choice">{[['standard', 'Standard', 'A straightforward coastal shipment.'], ['express', 'Express request', 'Ask our team about the earliest option.']].map(([value, name, detail]) => <label key={value} className={form.service === value ? 'selected' : ''}><input type="radio" name="service" value={value} checked={form.service === value} onChange={update}/><span><strong>{name}</strong><small>{detail}</small></span></label>)}</div></Field>
        </div></fieldset>}
        {step === 1 && <fieldset><legend>Tell us about the cargo</legend><div className="customer-grid">
          <Field label="Cargo type *" full>{input('cargoType', { required: true, maxLength: 120, list: 'cargo-suggestions', placeholder: 'For example: parcels, furniture or business stock' })}<datalist id="cargo-suggestions">{['Parcels and packages', 'Business stock', 'Household goods', 'Furniture', 'Machinery and equipment', 'Food and produce', 'Other cargo'].map(type => <option key={type}>{type}</option>)}</datalist></Field>
          <Field label="Number of packages (optional)">{input('quantity', { type: 'number', min: 1, max: 10000, step: 1, inputMode: 'numeric', placeholder: 'e.g. 2' })}</Field>
          <Field label="Cargo weight (optional)"><div className="input-unit">{input('weightKg', { type: 'number', min: 0, max: 1000000, step: 'any', inputMode: 'decimal', placeholder: 'e.g. 25', 'aria-label': 'Cargo weight' })}<select name="weightUnit" value={form.weightUnit} onChange={update} aria-label="Weight unit"><option value="kg">kg</option><option value="tons">tons</option><option value="lbs">lbs</option></select></div></Field>
          <Field label="Cargo volume (optional)" hint="Include the unit, such as m³.">{input('volume', { maxLength: 100, placeholder: 'e.g. 0.5 m³' })}</Field>
          <Field label="Declared value in TZS (optional)">{input('declaredValue', { type: 'number', min: 0, max: 1000000000, step: 1, inputMode: 'numeric', placeholder: 'e.g. 50000' })}</Field>
          <Field label="Dimensions in cm (optional)" full><div className="dimension-inputs">{[['lengthCm', 'Length'], ['widthCm', 'Width'], ['heightCm', 'Height']].map(([name, label]) => <label key={name}><small>{label}</small>{input(name, { type: 'number', min: 0, max: 100000, step: 'any', inputMode: 'decimal', placeholder: label, 'aria-label': `${label} in centimetres` })}</label>)}</div></Field>
          <Field label="Message (optional)" hint="Describe the contents and any handling needs." full><textarea name="notes" value={form.notes} onChange={update} rows="3" maxLength="2000" placeholder="What would you like our team to know?"/></Field>
        </div></fieldset>}
        {step === 2 && <fieldset><legend>Pickup details and package photos</legend><div className="journey-summary"><Ship size={22}/><div><strong>{form.from} <ArrowRight size={13}/> {form.to}</strong><span>{form.cargoType} · {form.service === 'express' ? 'Express requested' : 'Standard service'}</span></div><button type="button" className="text-button" onClick={() => setStep(0)}>Edit</button></div><div className="customer-grid">
          <Field label="Pickup address (optional)">{input('pickupAddress', { maxLength: 500, placeholder: 'Street, area or collection point' })}</Field>
          <Field label="Delivery address (optional)">{input('deliveryAddress', { maxLength: 500, placeholder: 'Street, area or destination point' })}</Field>
          <Field label="Preferred pickup date (optional)">{input('preferredDate', { type: 'date' })}</Field>
          <div className="photo-field full"><span>Package photos (optional)</span><p>Up to 3 JPG, PNG or WebP photos. We’ll resize them for an easier upload.</p><div className="photo-list">{photos.map((photo, index) => <div className="photo-preview" key={`${photo.name}-${index}`}><img src={photo.preview} alt={`Package photo ${index + 1}`}/><button type="button" aria-label={`Remove package photo ${index + 1}`} onClick={() => setPhotos(photos.filter((_, i) => i !== index))}><X size={14}/></button></div>)}{photos.length < 3 && <label className="photo-add"><ImagePlus size={24}/><span>{photoBusy ? 'Preparing photos…' : 'Add photos'}</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={photoBusy || sending} onChange={addPhotos} aria-label="Add package photos"/></label>}</div></div>
        </div><p className="customer-note"><CheckCircle2 size={16}/>Submitting asks for a quote. Our team will confirm the price and arrangements before you ship. Your photos are for our staff to review.</p></fieldset>}
        {error && <p className="customer-error" role="alert">{error}</p>}
        <div className="customer-form-actions">{step > 0 ? <button type="button" className="quiet-link" onClick={() => { setStep(step - 1); setError(''); }} disabled={sending}><ArrowLeft size={15}/>Back</button> : <span className="customer-step-note">About 2 minutes</span>}<button type="submit" className="button button-primary" disabled={sending || photoBusy}>{sending ? <><LoaderCircle size={17} className="spin"/>Sending request…</> : step < 2 ? <>Continue <ArrowRight size={17}/></> : <>Send quote request <ArrowRight size={17}/></>}</button></div>
      </form><ContactFallback/>
    </>}
  </PortalDialog>;
}

export function TrackingDialog({ code, onClose }) {
  const [record, setRecord] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; setLoading(true); setError(''); setRecord(null);
    serviceRequest(`/api/tracking/${encodeURIComponent(code)}`).then(data => { if (active) { if (!data.tracking?.code) throw new Error('We couldn’t confirm this shipment. Please contact our team.'); setRecord(data.tracking); } }).catch(failure => { if (active) setError(failure.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [code, attempt]);
  return <PortalDialog titleId="tracking-title" onClose={onClose} className="tracking-dialog"><div className="customer-heading"><span className="eyebrow">YOUR SHIPMENT’S JOURNEY</span><h2 id="tracking-title">A little peace of mind.</h2><p className="tracking-code">Tracking number <strong>{code}</strong></p></div>
    {loading && <div className="tracking-loading" role="status"><LoaderCircle className="spin" size={26}/><p>Checking your shipment…</p></div>}
    {error && <div className="tracking-failure"><Package size={32}/><p className="customer-error" role="alert">{error}</p><button type="button" className="button button-outline" onClick={() => setAttempt(attempt + 1)}>Try again</button><ContactFallback/></div>}
    {record && <><div className={`shipment-status status-${record.status}`}><span className="customer-success-mark"><Package size={25}/></span><div><span>Current status</span><strong>{labels[record.status] || 'Shipment update'}</strong></div></div><div className="tracking-route"><MapPin size={18}/><strong>{record.from}</strong><ArrowRight size={17}/><strong>{record.to}</strong></div><div className="tracking-dates"><div><span>Picked up</span><strong>{dateLabel(record.pickupAt)}</strong></div><div><span>{record.deliveredAt ? 'Delivered' : 'Estimated delivery'}</span><strong>{dateLabel(record.deliveredAt || record.eta)}</strong></div></div>{!record.deliveredAt && <p className="customer-note">Delivery times are estimates. We’ll update this page as your shipment progresses.</p>}<h3 className="timeline-heading">Shipment updates</h3><ol className="shipment-timeline">{record.events.map((event, index) => <li key={`${event.occurredAt}-${index}`}><span className="timeline-dot"/><div><strong>{labels[event.status] || 'Shipment update'}</strong><p>{event.description}</p><time dateTime={event.occurredAt}>{dateLabel(event.occurredAt)}</time></div></li>)}</ol><p className="tracking-updated">Last updated {dateLabel(record.updatedAt)}</p><ContactFallback/></>}
  </PortalDialog>;
}
