import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, LoaderCircle, MapPin, ShieldCheck } from 'lucide-react';
import { SERVICE_API_URL } from './config';
import { ContactFallback, Field, PortalDialog } from './customer-portal';

const INVALID_LINK = 'This booking link is invalid or has expired. Please contact Fanaar for a new link.';
const emptyDetails = { pickupAddress: '', pickupContactName: '', pickupContactPhone: '', deliveryAddress: '', deliveryContactName: '', deliveryContactPhone: '', preferredCollectionDate: '', preferredCollectionWindow: '', notes: '' };

export function readBookingLink(hash = window.location.hash) {
  const parameters = new URLSearchParams(hash.replace(/^#/, ''));
  if (!parameters.has('booking')) return null;
  return { token: (parameters.get('booking') || '').slice(0, 256), reference: (parameters.get('reference') || '').slice(0, 100) };
}

function todayInTanzania() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Dar_es_Salaam', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function collectionDateLabel(value) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'Africa/Dar_es_Salaam' }).format(new Date(`${value}T12:00:00+03:00`));
}

async function bookingRequest(token, { body, idempotencyKey, signal } = {}) {
  if (!SERVICE_API_URL) throw new Error('Online booking details are temporarily unavailable. Please contact Fanaar.');
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(cancel, 25000);
  try {
    const headers = { Accept: 'application/json', Authorization: `Bearer ${token}` };
    if (body) { headers['Content-Type'] = 'application/json'; headers['Idempotency-Key'] = idempotencyKey; }
    const response = await fetch(`${SERVICE_API_URL}/api/bookings/details`, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined, credentials: 'omit', signal: controller.signal });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = [401, 403, 404, 410].includes(response.status) ? INVALID_LINK : response.status === 429 ? 'There have been too many attempts. Please wait a moment and try again.' : data?.error?.message || 'We couldn’t save your booking details. Please try again or contact Fanaar.';
      throw Object.assign(new Error(message), { status: response.status });
    }
    if (!data?.booking?.reference || !['pending', 'submitted'].includes(data.booking.state)) throw new Error('We couldn’t confirm this booking. Please contact Fanaar.');
    return data.booking;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('We couldn’t confirm the response in time. Retry here or contact Fanaar before making other arrangements.');
    if (error instanceof TypeError) throw new Error('We couldn’t connect. Check your connection and try again, or contact Fanaar.');
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

function LocationReview({ title, city, address, name, phone }) {
  return <section className="booking-review-location"><h3><MapPin size={16}/>{title} · {city}</h3><p>{address}</p><dl><div><dt>Contact</dt><dd>{name}</dd></div><div><dt>Phone</dt><dd>{phone}</dd></div></dl></section>;
}

export function BookingDetailsDialog({ token, reference, onClose }) {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [form, setForm] = useState(emptyDetails);
  const [reviewing, setReviewing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const request = useRef({ key: crypto.randomUUID(), fingerprint: '' });
  const heading = useRef(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true); setError(''); setBooking(null);
    if (!/^[a-f0-9]{64}$/i.test(token)) { setError(INVALID_LINK); setLoading(false); return () => controller.abort(); }
    bookingRequest(token, { signal: controller.signal }).then(value => {
      if (!active) return;
      if (reference && value.reference !== reference && value.invoiceNumber !== reference) throw new Error(INVALID_LINK);
      setBooking(value);
    }).catch(failure => { if (active) setError(failure.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [token, reference, attempt]);
  useEffect(() => { heading.current?.focus(); }, [loading, reviewing, receipt, booking?.state]);

  const update = event => { const { name, value } = event.target; setForm(current => ({ ...current, [name]: value })); setConfirmed(false); setError(''); };
  function details() {
    const value = Object.fromEntries(Object.entries(form).map(([key, entry]) => [key, entry.trim()]));
    if (Object.entries(value).some(([key, entry]) => key !== 'notes' && !entry)) throw new Error('Please complete the pickup, delivery and preferred collection details.');
    if (value.preferredCollectionDate < todayInTanzania()) throw new Error('Choose today or a future collection date in Tanzania.');
    return value;
  }
  async function submit(event) {
    event.preventDefault(); setError('');
    let value;
    try { value = details(); } catch (failure) { setError(failure.message); setReviewing(false); return; }
    if (!reviewing) { setReviewing(true); setConfirmed(false); return; }
    if (!confirmed || sending) return;
    const body = { ...value, confirmed: true };
    const fingerprint = JSON.stringify(body);
    if (request.current.fingerprint && request.current.fingerprint !== fingerprint) request.current.key = crypto.randomUUID();
    request.current.fingerprint = fingerprint;
    setSending(true);
    try {
      const result = await bookingRequest(token, { body, idempotencyKey: request.current.key });
      if (result.state !== 'submitted') throw new Error('We couldn’t confirm that the details were saved. Please contact Fanaar.');
      setReceipt(result);
    } catch (failure) {
      if (failure.status === 409) {
        try { const current = await bookingRequest(token); if (current.state === 'submitted') { setBooking(current); setError(''); return; } } catch { /* Keep the original submission error without exposing record details. */ }
      }
      setError(failure.message);
    } finally { setSending(false); }
  }

  const alreadySubmitted = booking?.state === 'submitted';
  return <PortalDialog titleId="booking-details-title" onClose={onClose} busy={sending} className="booking-dialog">
    <div className="customer-heading"><span className="eyebrow">YOUR NEXT STEP WITH FANAAR</span><h2 id="booking-details-title" tabIndex="-1" ref={heading}>{receipt ? 'Your details are with us.' : alreadySubmitted ? 'Details already received.' : 'Let’s arrange your collection.'}</h2><p>{receipt || alreadySubmitted ? 'Our team will review the arrangements and confirm the collection time with you.' : 'Complete these details after receiving your quote or invoice so our team can plan pickup and delivery.'}</p></div>
    {loading ? <div className="tracking-loading" role="status"><LoaderCircle size={26} className="spin"/><p>Checking your private booking link…</p></div> : !booking ? <div className="booking-link-error"><p className="customer-error" role="alert">{error || INVALID_LINK}</p><button type="button" className="button button-outline" onClick={() => setAttempt(value => value + 1)}>Try again</button><ContactFallback/></div> : receipt || alreadySubmitted ? <div className="booking-received"><span className="customer-success-mark"><CheckCircle2 size={30}/></span><p><strong>{receipt?.reference || booking.reference}</strong></p><p>{alreadySubmitted && !receipt ? 'This private link has already been used. Previously submitted contact and address details are not displayed here.' : 'The collection time you requested is awaiting confirmation by our team.'}</p><p>If anything needs correcting, please contact Fanaar with this reference.</p><button type="button" className="button button-primary" onClick={onClose}>Back to Fanaar <Check size={17}/></button><ContactFallback/></div> : <>
      <div className="booking-reference"><span>Quote / booking reference <strong>{booking.reference}</strong></span>{booking.invoiceNumber && <span>Invoice <strong>{booking.invoiceNumber}</strong></span>}</div>
      <div className="journey-summary"><MapPin size={21}/><div><strong>{booking.from} <ArrowRight size={13}/> {booking.to}</strong><span>{booking.service === 'express' ? 'Express requested' : booking.service === 'standard' ? 'Standard service' : booking.service}</span></div></div>
      <form className="customer-form booking-form" onSubmit={submit}>
        {reviewing ? <>
          <h3 className="booking-review-title">Please review before sending</h3>
          <div className="booking-review-grid"><LocationReview title="Pickup" city={booking.from} address={form.pickupAddress} name={form.pickupContactName} phone={form.pickupContactPhone}/><LocationReview title="Delivery" city={booking.to} address={form.deliveryAddress} name={form.deliveryContactName} phone={form.deliveryContactPhone}/></div>
          <div className="booking-time-review"><CalendarDays size={19}/><div><strong>{collectionDateLabel(form.preferredCollectionDate)}</strong><p>{form.preferredCollectionWindow} · Tanzania time (EAT)</p><small>Preferred timing only. Fanaar will confirm availability with you.</small></div></div>
          {form.notes.trim() && <section className="booking-notes-review"><h3>Delivery notes</h3><p>{form.notes}</p></section>}
          <label className="booking-consent"><input type="checkbox" checked={confirmed} required onChange={event => setConfirmed(event.target.checked)} disabled={sending}/><span>I confirm these pickup and delivery details are correct. I understand the collection time must be confirmed by Fanaar.</span></label>
        </> : <>
          <p className="customer-required">Fields marked * are required at this booking stage.</p>
          <fieldset className="booking-location"><legend>Pickup details</legend><div className="customer-grid"><Field label="Pickup contact name *"><input name="pickupContactName" value={form.pickupContactName} onChange={update} required maxLength="120" autoComplete="section-booking-pickup name" placeholder="Person handing over the cargo"/></Field><Field label="Pickup contact phone *"><input type="tel" name="pickupContactPhone" value={form.pickupContactPhone} onChange={update} required maxLength="40" autoComplete="section-booking-pickup tel" placeholder="+255 …"/></Field><Field label="Full pickup address *" hint="Include the street / building, area or ward, and a nearby landmark." full><textarea name="pickupAddress" value={form.pickupAddress} onChange={update} required rows="3" maxLength="500" autoComplete="section-booking-pickup street-address" placeholder="Where should our team collect the cargo?"/></Field></div></fieldset>
          <fieldset className="booking-location"><legend>Delivery details</legend><div className="customer-grid"><Field label="Delivery contact name *"><input name="deliveryContactName" value={form.deliveryContactName} onChange={update} required maxLength="120" autoComplete="section-booking-delivery name" placeholder="Person receiving the cargo"/></Field><Field label="Delivery contact phone *"><input type="tel" name="deliveryContactPhone" value={form.deliveryContactPhone} onChange={update} required maxLength="40" autoComplete="section-booking-delivery tel" placeholder="+255 …"/></Field><Field label="Full delivery address *" hint="Include the street / building, area or ward, and a nearby landmark." full><textarea name="deliveryAddress" value={form.deliveryAddress} onChange={update} required rows="3" maxLength="500" autoComplete="section-booking-delivery street-address" placeholder="Where should the cargo be delivered?"/></Field></div></fieldset>
          <fieldset className="booking-location"><legend>Preferred collection</legend><div className="customer-grid"><Field label="Preferred collection date *"><input type="date" name="preferredCollectionDate" value={form.preferredCollectionDate} onChange={update} required min={todayInTanzania()}/></Field><Field label="Preferred time window *" hint="Tanzania time (EAT). We’ll confirm availability."><input name="preferredCollectionWindow" value={form.preferredCollectionWindow} onChange={update} required maxLength="100" placeholder="e.g. 09:00–12:00"/></Field><Field label="Delivery notes (optional)" hint="Any access directions or other details our team should know." full><textarea name="notes" value={form.notes} onChange={update} rows="3" maxLength="2000"/></Field></div></fieldset>
          <p className="customer-note"><ShieldCheck size={16}/>This private form completes pickup and delivery arrangements. It does not change the agreed quote, invoice or payment details.</p>
        </>}
        {error && <p className="customer-error" role="alert">{error}</p>}
        <div className="customer-form-actions">{reviewing ? <button type="button" className="quiet-link" disabled={sending} onClick={() => { setReviewing(false); setConfirmed(false); setError(''); }}><ArrowLeft size={15}/>Back to details</button> : <span className="customer-step-note">Your preferred timing needs staff confirmation.</span>}<button type="submit" className="button button-primary" disabled={sending || reviewing && !confirmed}>{sending ? <><LoaderCircle className="spin" size={17}/>Sending details…</> : reviewing ? <>Confirm & send details <Check size={17}/></> : <>Review details <ArrowRight size={17}/></>}</button></div>
      </form><ContactFallback/>
    </>}
  </PortalDialog>;
}
