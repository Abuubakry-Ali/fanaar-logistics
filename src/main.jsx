import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, ArrowRight, ArrowDown, Anchor, Package, Phone, Mail, Menu, X, Ship, MapPin, ShieldCheck, ChevronDown, Check, ExternalLink, MessageCircle, Navigation, MoveRight } from 'lucide-react';
import { CONTACT, ROUTES, ADMIN_LOGIN_URL, whatsappNumber } from './config';
import { QuoteDialog, TrackingDialog } from './customer-portal';
import { BookingDetailsDialog, readBookingLink } from './booking-completion';
import { CoastMap } from './CoastMap.jsx';
import './styles.css';

function Brand({ light = false }) {
  return <a href="#home" className={`brand ${light ? 'brand-light' : ''}`} aria-label="Fanaar Logistics home">
    <svg className="brand-mark" viewBox="0 0 48 48" aria-hidden="true"><path d="M7 7h34l-7 9H18v7h16l-7 9h-9v9H7z" fill="currentColor"/><path d="m28 37 7-4 8 4-8 5z" fill="#ed7654"/></svg>
    <span className="brand-text">fanaar<span>LOGISTICS</span></span>
  </a>;
}

const QuoteContext = React.createContext(null);
function QuoteLink({ children, className = '', onNavigate, route, ...props }) {
  const openQuote = React.useContext(QuoteContext);
  return <button type="button" className={className} onClick={() => { onNavigate?.(); openQuote(route); }} {...props}>{children}</button>;
}

function ContactDialog({ onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const active = document.activeElement;
    const el = dialog.current; el.showModal();
    const close = () => onClose(); el.addEventListener('cancel', close);
    const before = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { el.removeEventListener('cancel', close); document.body.style.overflow = before; active?.focus(); };
  }, [onClose]);
  return <dialog ref={dialog} className="quote-dialog contact-dialog" aria-labelledby="contact-title" onClick={event => { if (event.target === dialog.current) onClose(); }}><div className="dialog-inner">
    <button className="close-dialog icon-button" aria-label="Close contact details" onClick={onClose}><X size={21}/></button>
    <span className="eyebrow">A REAL CONVERSATION</span><h2 id="contact-title">Let’s talk cargo.</h2>
    <p>From a single parcel to a larger shipment, we’re here to help you plan your journey.</p>
    <div className="contact-options">
      {CONTACT.phone ? <a href={`tel:${CONTACT.phone.replace(/[^+\d]/g, '')}`}><Phone/><span>Call our team<strong>{CONTACT.phone}</strong></span><ArrowUpRight/></a> : <div><Phone/><span>Phone support<strong>Number coming soon</strong></span></div>}
      {whatsappNumber ? <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer"><MessageCircle/><span>Chat on WhatsApp<strong>Start a conversation</strong></span><ArrowUpRight/></a> : <div><MessageCircle/><span>WhatsApp<strong>Contact details coming soon</strong></span></div>}
      {CONTACT.email && <a href={`mailto:${CONTACT.email}`}><Mail/><span>Email our team<strong>{CONTACT.email}</strong></span><ArrowUpRight/></a>}
    </div>
    <QuoteLink className="button button-primary" onNavigate={onClose}>Get a quote <ArrowUpRight size={18}/></QuoteLink><p className="portal-help">Send a quote request here. Our team will confirm the price and next steps.</p>
  </div></dialog>;
}

const faqs = [
  ['Where does Fanaar Logistics ship?', 'We transport cargo by sea from Dar es Salaam to Zanzibar, from Zanzibar to Dar es Salaam, and from Zanzibar to Tanga. Choose your route when preparing a quote request.'],
  ['How do I track my package?', 'Enter your quote reference to check its progress. Once your shipment is booked, the same reference or the tracking number we share shows shipment status, pickup time, estimated delivery and journey updates. Prices and quotation documents are shared directly with you.'],
  ['How much will my shipment cost?', 'Your quote depends on the route, cargo type, weight, dimensions, and handling needs. Use Get a quote to fill in our enquiry form. Our team confirms the price before you ship.'],
  ['How do I arrange a shipment?', 'Click Get a quote and tell us your route, cargo details, and contact information. You can add package photos. Our team reviews your request and confirms the price, pickup arrangements, and next steps with you.'],
];

function App() {
  const linkedTracking = (new URLSearchParams(window.location.search).get('tracking') || '').trim().slice(0, 80);
  const [bookingLink, setBookingLink] = useState(readBookingLink);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState(bookingLink ? 'booking' : linkedTracking ? 'tracking' : null);
  const [activeFaq, setActiveFaq] = useState(0);
  const [tracking, setTracking] = useState(linkedTracking);
  const [quoteRoute, setQuoteRoute] = useState(null);
  const openQuote = route => { setQuoteRoute(route || null); setModal('quote'); setMenuOpen(false); };
  const closeModal = React.useCallback(() => { setModal(null); setBookingLink(null); }, []);
  const contact = () => { setModal('contact'); setMenuOpen(false); };
  const closeMenu = () => setMenuOpen(false);
  useEffect(() => {
    const openLinkedBooking = () => {
      const incoming = readBookingLink();
      if (!incoming) return;
      setBookingLink(incoming); setModal('booking'); setMenuOpen(false);
      const address = new URL(window.location.href);
      address.hash = '';
      window.history.replaceState(window.history.state, '', address);
    };
    openLinkedBooking();
    window.addEventListener('hashchange', openLinkedBooking);
    return () => window.removeEventListener('hashchange', openLinkedBooking);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const handleKey = event => { if (event.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [menuOpen]);

  function handleTracking(event) {
    event.preventDefault();
    if (!tracking.trim()) {
      event.currentTarget.elements.ref.setCustomValidity('Enter your quote reference or tracking number.');
      event.currentTarget.elements.ref.reportValidity();
      return;
    }
    setModal('tracking');
  }

  return <QuoteContext.Provider value={openQuote}><>
    <div className="topbar"><div className="container topbar-inner"><span className="topbar-tagline"><span className="status-dot"/> Your coast. Your cargo. Our connection.</span><span className="topbar-places">DAR ES SALAAM <span>•</span> ZANZIBAR <span>•</span> TANGA</span><div className="topbar-contact"><span className="topbar-contact-label"><Phone size={15}/>{CONTACT.phone && !whatsappNumber ? 'Call us' : !CONTACT.phone && whatsappNumber ? 'WhatsApp' : 'Call / WhatsApp'}</span>{CONTACT.phone ? <a className="topbar-number" href={`tel:${CONTACT.phone.replace(/[^+\d]/g, '')}`}>{CONTACT.phone}</a> : whatsappNumber ? <a className="topbar-number" href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">+{whatsappNumber}</a> : <span className="topbar-number">Number coming soon</span>}{CONTACT.phone && whatsappNumber && <a className="topbar-whatsapp" href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" aria-label="Chat with Fanaar on WhatsApp"><MessageCircle size={19}/></a>}</div></div></div>
    <header className="header"><div className="container nav-container"><Brand/><nav className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation" id="main-navigation"><a className="nav-active" href="#home" onClick={closeMenu}>Home</a><a href="#routes" onClick={closeMenu}>Our routes</a><a href="#services" onClick={closeMenu}>Our services</a><a href="#about" onClick={closeMenu}>Why Fanaar</a><button className="nav-contact" onClick={contact}>Contact us</button></nav><div className="nav-actions"><QuoteLink className="button button-primary nav-quote">Get a quote <ArrowUpRight size={17}/></QuoteLink><button className="menu-toggle icon-button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X/> : <Menu/>}</button></div></div></header>
    <main>
      <section className="hero container" id="home">
        <div className="hero-copy"><div className="eyebrow"><span className="tiny-line"/> CARGO THAT CONNECTS THE COAST</div><h1>Across the sea.<br/>Closer to <span className="hero-you">you.<svg viewBox="0 0 240 16" aria-hidden="true"><path d="M3 11Q103-4 236 8"/></svg></span></h1><p>From the mainland to the islands and back.<br className="desktop-break"/> We move your cargo between Dar es Salaam,<br className="desktop-break"/> Zanzibar and Tanga. Simply, and with care.</p><div className="hero-actions"><QuoteLink className="button button-primary">Let’s move your cargo <ArrowUpRight size={19}/></QuoteLink><a className="quiet-link" href="#routes">Explore our routes <ArrowDown size={16}/></a></div><div className="hero-note"><span className="note-icon"><Anchor size={19}/></span><span>Local roots. Coastal connections.</span></div></div>
        <div className="hero-visual"><img src={`${import.meta.env.BASE_URL}images/cargo-teal.jpg`} alt="Cargo vessel surrounded by the turquoise waters of the Indian Ocean" fetchPriority="high"/><div className="photo-grain"/><div className="hero-image-label"><span className="status-dot"/> MADE FOR THE COAST</div><div className="visual-caption">Good things<br/>are on the way.</div><div className="shipment-card"><div className="shipment-icon"><Ship size={23}/></div><div><span>Connecting our coast</span><strong>Dar es Salaam <MoveRight size={17}/> Zanzibar</strong></div><span className="shipment-dot"/></div><div className="photo-coordinate">6°09′ S &nbsp; 39°12′ E</div></div>
      </section>

      <section className="tracking-section container" id="track" aria-labelledby="tracking-heading"><div className="tracking-card"><div className="tracking-intro"><span className="tracking-icon"><Package size={27} strokeWidth={1.6}/></span><div><h2 id="tracking-heading">Where’s your cargo?</h2><p>A little peace of mind, in one click.</p></div></div><form className="tracking-form" onSubmit={handleTracking}><label className="sr-only" htmlFor="tracking-number">Quote reference or tracking number</label><div className="tracking-input-wrap"><Package size={18} aria-hidden="true"/><input id="tracking-number" type="text" name="ref" value={tracking} onChange={event => { event.target.setCustomValidity(''); setTracking(event.target.value); }} placeholder="Quote reference or tracking number" required maxLength="100" autoComplete="off"/></div><button className="button button-dark" type="submit">Track package <ArrowRight size={18}/></button><span className="tracking-powered"><ShieldCheck size={12}/> Quote and shipment updates, right here</span></form></div></section>

      <section className="trust-strip container" aria-label="Our approach"><div><Ship size={20} strokeWidth={1.5}/><span>Coastal cargo specialists</span></div><span className="strip-divider"/><div><MapPin size={20} strokeWidth={1.5}/><span>Three routes. One trusted connection.</span></div><span className="strip-divider"/><div><MessageCircle size={20} strokeWidth={1.5}/><span>Real people, ready to help</span></div></section>

      <section className="routes-section section-padding" id="routes"><div className="container"><div className="section-heading"><div><div className="eyebrow"><span className="tiny-line"/> OUR ROUTES</div><h2>A connected coast.<br/>More possibilities.</h2></div><p>Small distances on the map.<br/>Big connections for your business and everyday life.</p></div><div className="routes-layout"><div className="route-list">{ROUTES.map((r,i) => <QuoteLink className="route-card" route={r} key={r.code} aria-label={`Get a quote: ${r.from} to ${r.to}`}><div className="route-card-top"><span className="route-number">0{i+1}</span><span>{r.direction}</span><Ship size={19}/></div><div className="route-cities"><h3>{r.from}</h3><ArrowRight size={23}/><h3>{r.to}</h3></div><div className="route-card-bottom"><span><span className="small-dot"/> Sea freight</span><span>Get a route quote <ArrowUpRight size={16}/></span></div></QuoteLink>)}</div><div className="map-panel"><div className="map-top"><span><Navigation size={14}/> OUR COASTAL NETWORK</span><span>TANZANIA</span></div><CoastMap/><div className="map-bottom"><span><span className="small-dot"/> Four service destinations</span><span>Map data: Natural Earth</span></div></div></div></div></section>

      <section className="services-section section-padding container" id="services"><div className="section-heading"><div><div className="eyebrow"><span className="tiny-line"/> WHAT WE MOVE</div><h2>For your business.<br/>For your everyday.</h2></div><QuoteLink className="quiet-link">Find the right shipping option <ArrowUpRight size={18}/></QuoteLink></div><div className="service-grid"><article className="service-card"><span className="service-icon"><Package size={29} strokeWidth={1.4}/></span><span className="service-index">01 /</span><h3>Parcels & packages</h3><p>Personal items, small packages and the things that need to get to the other side.</p><QuoteLink className="text-button">Send a package <ArrowUpRight size={16}/></QuoteLink></article><article className="service-card"><span className="service-icon"><svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="m5 10 10-5 10 5v13l-10 5L5 23Z M5 10l10 5 10-5 M15 15v13 M10 7.5l10 5v5l-5 2"/></svg></span><span className="service-index">02 /</span><h3>Business cargo</h3><p>Stock, supplies and commercial goods that keep your business moving along the coast.</p><QuoteLink className="text-button">Move your goods <ArrowUpRight size={16}/></QuoteLink></article><article className="service-card"><span className="service-icon"><Ship size={30} strokeWidth={1.4}/></span><span className="service-index">03 /</span><h3>Larger shipments</h3><p>A bigger load or a specific handling need? Let’s talk through your cargo together.</p><button className="text-button" onClick={contact}>Talk to our team <ArrowUpRight size={16}/></button></article></div></section>

      <section className="about-section container" id="about"><div className="about-image"><img src={`${import.meta.env.BASE_URL}images/zanzibar-dhow.jpg`} alt="Traditional cargo dhow on the water near Zanzibar harbour" loading="lazy"/><div className="image-caption"><Anchor size={19}/><span>Rooted here.<br/><strong>Moving forward, together.</strong></span></div></div><div className="about-copy"><div className="eyebrow"><span className="tiny-line"/> THE FANAAR WAY</div><h2>A familiar coast.<br/>A personal approach.</h2><p>Every shipment has a story. A shop restocking its shelves. A family sending something home. A business taking its next step.</p><p>Fanaar Logistics brings the mainland and islands closer, with straightforward cargo transport and a simple way to stay connected to your shipment.</p><div className="about-points"><span><Check size={16}/> Routes that connect our communities</span><span><Check size={16}/> Tracking that keeps you informed</span><span><Check size={16}/> A conversation away when you need us</span></div><button className="quiet-link" onClick={contact}>Get to know our team <ArrowUpRight size={18}/></button></div></section>

      <section className="how-section section-padding container"><div className="center-heading"><div className="eyebrow">A SIMPLE JOURNEY</div><h2>Ready. Set. Ship.</h2><p>From your first question to your cargo’s next destination.</p></div><div className="steps"><div className="step"><span className="step-number">01</span><h3>Tell us what’s moving</h3><p>Fill in your cargo details and route in our quote form.</p></div><div className="step"><span className="step-number">02</span><h3>Let’s make a plan</h3><p>Confirm your price, sailing date and drop-off details with our team.</p></div><div className="step"><span className="step-number">03</span><h3>Follow the journey</h3><p>Use your tracking reference to follow your shipment.</p></div></div></section>

      <section className="faq-section container" id="questions"><div className="faq-intro"><div className="eyebrow"><span className="tiny-line"/> GOOD TO KNOW</div><h2>A few questions,<br/>before we set sail.</h2><p>Need a little more help?</p><button className="quiet-link" onClick={contact}>Let’s have a conversation <ArrowUpRight size={17}/></button></div><div className="faq-list">{faqs.map(([q,a], i) => <div className={`faq-item ${activeFaq === i ? 'expanded' : ''}`} key={q}><h3><button aria-expanded={activeFaq === i} aria-controls={`faq-${i}`} onClick={() => setActiveFaq(activeFaq === i ? null : i)}>{q}<ChevronDown size={19}/></button></h3><div id={`faq-${i}`} hidden={activeFaq !== i}><p>{a}</p></div></div>)}</div></section>

      <section className="cta-section container"><div className="cta-graphic" aria-hidden="true"><svg viewBox="0 0 300 200"><path d="M-20 130Q80 30 170 100T340 100 M-30 155Q70 55 160 125T330 125 M-40 180Q60 80 150 150T320 150 M-50 205Q50 105 140 175T310 175" fill="none" stroke="currentColor" strokeWidth="1.3"/></svg></div><div><span className="eyebrow">YOUR NEXT SHIPMENT STARTS HERE</span><h2>Let’s make the connection.</h2><p>Tell us about your cargo. Our team will take care of the next steps.</p></div><div className="cta-actions"><QuoteLink className="button button-primary">Get a quote <ArrowUpRight size={18}/></QuoteLink>{CONTACT.phone ? <a className="cta-phone" href={`tel:${CONTACT.phone.replace(/[^+\d]/g, '')}`}><Phone size={17}/>{CONTACT.phone}<ArrowUpRight size={15}/></a> : <button className="cta-phone" onClick={contact}><Phone size={17}/>Talk to our team<ArrowUpRight size={15}/></button>}</div></section>
    </main>
    <footer className="footer container"><div className="footer-top"><div><Brand/><p>Bringing our coast closer,<br/>one shipment at a time.</p></div><div className="footer-links"><span>EXPLORE</span><a href="#routes">Our routes</a><a href="#services">Our services</a><a href="#about">Why Fanaar</a></div><div className="footer-links"><span>HOW CAN WE HELP?</span><a href="#track">Track a package</a><QuoteLink>Get a quote</QuoteLink><button onClick={contact}>Phone & WhatsApp</button>{CONTACT.email && <a className="footer-email" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>}</div><div className="footer-coast"><span>CONNECTED BY THE COAST</span><p>Dar es Salaam <span>↔</span> Zanzibar<br/>Zanzibar <span>→</span> Tanga</p><div><MapPin size={14}/> Tanzania, East Africa</div></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Fanaar Logistics. All rights reserved.</span><div className="footer-bottom-actions"><span className="footer-motto">Local roots. Coastal connections.<Anchor size={13}/></span>{ADMIN_LOGIN_URL && <a className="footer-admin" href={ADMIN_LOGIN_URL} target="_blank" rel="noopener noreferrer" aria-label="Admin login — opens in a new tab">Admin login <ExternalLink size={12}/></a>}</div></div></footer>
    <button className="floating-contact" aria-label={whatsappNumber ? 'Chat with Fanaar on WhatsApp' : 'Contact Fanaar Logistics'} onClick={contact}><MessageCircle size={23}/><span>Let’s talk</span></button>
    {modal === 'contact' && <ContactDialog onClose={closeModal}/>}
    {modal === 'quote' && <QuoteDialog route={quoteRoute} onClose={closeModal}/>}
    {modal === 'tracking' && <TrackingDialog code={tracking.trim()} onClose={closeModal}/>}
    {modal === 'booking' && bookingLink && <BookingDetailsDialog key={bookingLink.token} token={bookingLink.token} reference={bookingLink.reference} onClose={closeModal}/>}
  </></QuoteContext.Provider>;
}

createRoot(document.getElementById('root')).render(<App/>);
