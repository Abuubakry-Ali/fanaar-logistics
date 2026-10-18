import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, ArrowRight, ArrowDown, Anchor, Package, Phone, Menu, X, Ship, MapPin, ShieldCheck, ChevronDown, Check, ExternalLink, MessageCircle, Navigation, MoveRight } from 'lucide-react';
import { CONTACT, ROUTES, TRACKING_URL, QUOTE_URL, ADMIN_LOGIN_URL, whatsappNumber } from './config';
import { openPortalPopup } from './portal';
import './styles.css';

function Brand({ light = false }) {
  return <a href="#home" className={`brand ${light ? 'brand-light' : ''}`} aria-label="Fanaar Logistics home">
    <svg className="brand-mark" viewBox="0 0 48 48" aria-hidden="true"><path d="M7 7h34l-7 9H18v7h16l-7 9h-9v9H7z" fill="currentColor"/><path d="m28 37 7-4 8 4-8 5z" fill="#ed7654"/></svg>
    <span className="brand-text">fanaar<span>LOGISTICS</span></span>
  </a>;
}

function QuoteLink({ children, className = '', onNavigate, ...props }) {
  function openQuote(event) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (openPortalPopup(QUOTE_URL)) event.preventDefault();
    onNavigate?.();
  }
  return <a href={QUOTE_URL} target="_blank" rel="noopener noreferrer" className={className} title="Opens the Trixa quote form in a separate window" onClick={openQuote} {...props}>{children}</a>;
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
    </div>
    <QuoteLink className="button button-primary" onNavigate={onClose}>Get a quote <ArrowUpRight size={18}/></QuoteLink><p className="portal-help">Complete the real Trixa form in the secure window, then close it to return here.</p>
  </div></dialog>;
}

function CoastMap() {
  return <svg className="coast-map" viewBox="0 0 620 500" role="img" aria-labelledby="map-title map-description">
    <title id="map-title">Fanaar Logistics coastal routes</title><desc id="map-description">Dar es Salaam to Zanzibar, Zanzibar to Dar es Salaam, and Zanzibar to Tanga. Schematic map, not to scale.</desc>
    <defs><pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#e0e9e5" strokeWidth=".7"/></pattern><linearGradient id="land" x1="0" x2="1"><stop offset="0" stopColor="#e5e9dc"/><stop offset="1" stopColor="#eaf0e4"/></linearGradient></defs>
    <rect x="0" y="0" width="620" height="500" fill="#f0f5f0"/><rect width="620" height="500" fill="url(#map-grid)"/>
    <path d="M0 0H236L243 24 235 46 251 67 244 88 260 114 253 147 270 171 268 202 285 227 278 248 292 276 284 305 306 329 297 359 315 385 321 412 349 442 350 474 369 500H0Z" fill="url(#land)" stroke="#d3dfd3" strokeWidth="1.4"/>
    <path d="M407 177 417 171 425 186 422 206 433 225 425 246 428 269 416 286 408 279 410 258 401 242 406 220 399 204Z" fill="#d4dfc9" stroke="#c4d3bc"/>
    <path d="m431 71 8-6 5 17-3 19 7 15-6 19-8-4 1-22-6-17Z" fill="#d4dfc9" stroke="#c4d3bc"/>
    <text x="66" y="256" className="map-country">TANZANIA</text><text x="473" y="354" className="map-water">INDIAN</text><text x="473" y="372" className="map-water">OCEAN</text><text x="450" y="99" className="map-small">Pemba</text>
    <path d="M304 367Q415 347 409 257" stroke="#e77c58" strokeWidth="2.5" fill="none" strokeDasharray="5 6"/><path d="M409 257Q380 135 260 113" stroke="#e77c58" strokeWidth="2.5" fill="none" strokeDasharray="5 6"/>
    <g fill="#113f44"><circle cx="304" cy="367" r="6"/><circle cx="409" cy="257" r="6"/><circle cx="260" cy="113" r="6"/></g>
    <g fill="none" stroke="#113f44" strokeOpacity=".15" strokeWidth="7"><circle cx="304" cy="367" r="11"/><circle cx="409" cy="257" r="11"/><circle cx="260" cy="113" r="11"/></g>
    <text x="278" y="95" className="map-city">Tanga</text><text x="434" y="261" className="map-city">Zanzibar</text><text x="180" y="399" className="map-city">Dar es Salaam</text>
    <g transform="translate(375 320) rotate(-30)"><rect x="-19" y="-19" width="38" height="38" rx="19" fill="#fff"/><path d="M-9 2h18L5 9H-4zM-5-8h8V2h-8zM3-4h4v6" fill="none" stroke="#113f44" strokeWidth="1.6"/></g>
    <path d="M552 52v-23m-5 7 5-7 5 7" stroke="#6f8c84" strokeWidth="1.4" fill="none"/><text x="548" y="69" className="map-small">N</text>
  </svg>;
}

const faqs = [
  ['Where does Fanaar Logistics ship?', 'We transport cargo by sea from Dar es Salaam to Zanzibar, from Zanzibar to Dar es Salaam, and from Zanzibar to Tanga. Choose your route when preparing a quote request.'],
  ['How do I track my package?', 'Enter your shipment reference or the phone number associated with your shipment in the tracking box. Your tracking information opens in a secure Trixa window, or a new tab on mobile. Close it when you are done to return to Fanaar.'],
  ['How much will my shipment cost?', 'Your quote depends on the route, cargo type, weight, dimensions, and handling needs. Use Get a quote to fill in the enquiry form in the Trixa window. Our team confirms the price before you ship.'],
  ['How do I arrange a shipment?', 'Click Get a quote to open the real Trixa enquiry form. Enter your cargo details and preferred route, then submit directly to our team through Trixa. Close that window to return here. Our team confirms the price, sailing date, and drop-off instructions.'],
];

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [activeFaq, setActiveFaq] = useState(0);
  const [tracking, setTracking] = useState('');
  const closeModal = React.useCallback(() => setModal(null), []);
  const contact = () => { setModal('contact'); setMenuOpen(false); };
  const closeMenu = () => setMenuOpen(false);
  useEffect(() => {
    if (!menuOpen) return;
    const handleKey = event => { if (event.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [menuOpen]);

  function handleTracking(event) {
    if (!tracking.trim()) {
      event.preventDefault();
      event.currentTarget.elements.ref.setCustomValidity('Enter a tracking reference or phone number.');
      event.currentTarget.elements.ref.reportValidity();
      return;
    }
    const destination = new URL(TRACKING_URL);
    destination.searchParams.set('ref', tracking.trim());
    if (openPortalPopup(destination.href)) event.preventDefault();
  }

  return <>
    <div className="topbar"><div className="container topbar-inner"><span className="topbar-tagline"><span className="status-dot"/> Your coast. Your cargo. Our connection.</span><span className="topbar-places">DAR ES SALAAM <span>•</span> ZANZIBAR <span>•</span> TANGA</span><div className="topbar-contact"><span className="topbar-contact-label"><Phone size={15}/>{CONTACT.phone && !whatsappNumber ? 'Call us' : !CONTACT.phone && whatsappNumber ? 'WhatsApp' : 'Call / WhatsApp'}</span>{CONTACT.phone ? <a className="topbar-number" href={`tel:${CONTACT.phone.replace(/[^+\d]/g, '')}`}>{CONTACT.phone}</a> : whatsappNumber ? <a className="topbar-number" href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">+{whatsappNumber}</a> : <span className="topbar-number">Number coming soon</span>}{CONTACT.phone && whatsappNumber && <a className="topbar-whatsapp" href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" aria-label="Chat with Fanaar on WhatsApp"><MessageCircle size={19}/></a>}</div></div></div>
    <header className="header"><div className="container nav-container"><Brand/><nav className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation" id="main-navigation"><a className="nav-active" href="#home" onClick={closeMenu}>Home</a><a href="#routes" onClick={closeMenu}>Our routes</a><a href="#services" onClick={closeMenu}>Our services</a><a href="#about" onClick={closeMenu}>Why Fanaar</a><button className="nav-contact" onClick={contact}>Contact us</button></nav><div className="nav-actions"><QuoteLink className="button button-primary nav-quote">Get a quote <ArrowUpRight size={17}/></QuoteLink><button className="menu-toggle icon-button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X/> : <Menu/>}</button></div></div></header>
    <main>
      <section className="hero container" id="home">
        <div className="hero-copy"><div className="eyebrow"><span className="tiny-line"/> CARGO THAT CONNECTS THE COAST</div><h1>Across the sea.<br/>Closer to <span className="hero-you">you.<svg viewBox="0 0 240 16" aria-hidden="true"><path d="M3 11Q103-4 236 8"/></svg></span></h1><p>From the mainland to the islands and back.<br className="desktop-break"/> We move your cargo between Dar es Salaam,<br className="desktop-break"/> Zanzibar and Tanga. Simply, and with care.</p><div className="hero-actions"><QuoteLink className="button button-primary">Let’s move your cargo <ArrowUpRight size={19}/></QuoteLink><a className="quiet-link" href="#routes">Explore our routes <ArrowDown size={16}/></a></div><div className="hero-note"><span className="note-icon"><Anchor size={19}/></span><span>Local roots. Coastal connections.</span></div></div>
        <div className="hero-visual"><img src={`${import.meta.env.BASE_URL}images/cargo-teal.jpg`} alt="Cargo vessel surrounded by the turquoise waters of the Indian Ocean" fetchPriority="high"/><div className="photo-grain"/><div className="hero-image-label"><span className="status-dot"/> MADE FOR THE COAST</div><div className="visual-caption">Good things<br/>are on the way.</div><div className="shipment-card"><div className="shipment-icon"><Ship size={23}/></div><div><span>Connecting our coast</span><strong>Dar es Salaam <MoveRight size={17}/> Zanzibar</strong></div><span className="shipment-dot"/></div><div className="photo-coordinate">6°09′ S &nbsp; 39°12′ E</div></div>
      </section>

      <section className="tracking-section container" id="track" aria-labelledby="tracking-heading"><div className="tracking-card"><div className="tracking-intro"><span className="tracking-icon"><Package size={27} strokeWidth={1.6}/></span><div><h2 id="tracking-heading">Where’s your cargo?</h2><p>A little peace of mind, in one click.</p></div></div><form className="tracking-form" action={TRACKING_URL} method="get" target="_blank" rel="noopener noreferrer" onSubmit={handleTracking}><label className="sr-only" htmlFor="tracking-number">Tracking reference or phone number</label><div className="tracking-input-wrap"><Package size={18} aria-hidden="true"/><input id="tracking-number" type="text" name="ref" value={tracking} onChange={event => { event.target.setCustomValidity(''); setTracking(event.target.value); }} placeholder="Reference or phone number" required maxLength="100" autoComplete="off"/></div><button className="button button-dark" type="submit">Track package <ArrowRight size={18}/></button><span className="tracking-powered"><ShieldCheck size={12}/> Trixa tracking · opens a secure window <ExternalLink size={10}/><span className="sr-only">. A new tab may open on mobile. Close it to return to Fanaar.</span></span></form></div></section>

      <section className="trust-strip container" aria-label="Our approach"><div><Ship size={20} strokeWidth={1.5}/><span>Coastal cargo specialists</span></div><span className="strip-divider"/><div><MapPin size={20} strokeWidth={1.5}/><span>Three routes. One trusted connection.</span></div><span className="strip-divider"/><div><MessageCircle size={20} strokeWidth={1.5}/><span>Real people, ready to help</span></div></section>

      <section className="routes-section section-padding" id="routes"><div className="container"><div className="section-heading"><div><div className="eyebrow"><span className="tiny-line"/> OUR ROUTES</div><h2>A connected coast.<br/>More possibilities.</h2></div><p>Small distances on the map.<br/>Big connections for your business and everyday life.</p></div><div className="routes-layout"><div className="route-list">{ROUTES.map((r,i) => <QuoteLink className="route-card" key={r.code} aria-label={`Get a quote: ${r.from} to ${r.to}`}><div className="route-card-top"><span className="route-number">0{i+1}</span><span>{r.direction}</span><Ship size={19}/></div><div className="route-cities"><h3>{r.from}</h3><ArrowRight size={23}/><h3>{r.to}</h3></div><div className="route-card-bottom"><span><span className="small-dot"/> Sea freight</span><span>Get a route quote <ArrowUpRight size={16}/></span></div></QuoteLink>)}</div><div className="map-panel"><div className="map-top"><span><Navigation size={14}/> OUR COASTAL NETWORK</span><span>TANZANIA</span></div><CoastMap/><div className="map-bottom"><span><span className="small-dot"/> Three routes, connected by sea</span><span>Illustrative map</span></div></div></div></div></section>

      <section className="services-section section-padding container" id="services"><div className="section-heading"><div><div className="eyebrow"><span className="tiny-line"/> WHAT WE MOVE</div><h2>For your business.<br/>For your everyday.</h2></div><QuoteLink className="quiet-link">Find the right shipping option <ArrowUpRight size={18}/></QuoteLink></div><div className="service-grid"><article className="service-card"><span className="service-icon"><Package size={29} strokeWidth={1.4}/></span><span className="service-index">01 /</span><h3>Parcels & packages</h3><p>Personal items, small packages and the things that need to get to the other side.</p><QuoteLink className="text-button">Send a package <ArrowUpRight size={16}/></QuoteLink></article><article className="service-card"><span className="service-icon"><svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="m5 10 10-5 10 5v13l-10 5L5 23Z M5 10l10 5 10-5 M15 15v13 M10 7.5l10 5v5l-5 2"/></svg></span><span className="service-index">02 /</span><h3>Business cargo</h3><p>Stock, supplies and commercial goods that keep your business moving along the coast.</p><QuoteLink className="text-button">Move your goods <ArrowUpRight size={16}/></QuoteLink></article><article className="service-card"><span className="service-icon"><Ship size={30} strokeWidth={1.4}/></span><span className="service-index">03 /</span><h3>Larger shipments</h3><p>A bigger load or a specific handling need? Let’s talk through your cargo together.</p><button className="text-button" onClick={contact}>Talk to our team <ArrowUpRight size={16}/></button></article></div></section>

      <section className="about-section container" id="about"><div className="about-image"><img src={`${import.meta.env.BASE_URL}images/zanzibar-dhow.jpg`} alt="Traditional cargo dhow on the water near Zanzibar harbour" loading="lazy"/><div className="image-caption"><Anchor size={19}/><span>Rooted here.<br/><strong>Moving forward, together.</strong></span></div></div><div className="about-copy"><div className="eyebrow"><span className="tiny-line"/> THE FANAAR WAY</div><h2>A familiar coast.<br/>A personal approach.</h2><p>Every shipment has a story. A shop restocking its shelves. A family sending something home. A business taking its next step.</p><p>Fanaar Logistics brings the mainland and islands closer, with straightforward cargo transport and a simple way to stay connected to your shipment.</p><div className="about-points"><span><Check size={16}/> Routes that connect our communities</span><span><Check size={16}/> Tracking that keeps you informed</span><span><Check size={16}/> A conversation away when you need us</span></div><button className="quiet-link" onClick={contact}>Get to know our team <ArrowUpRight size={18}/></button></div></section>

      <section className="how-section section-padding container"><div className="center-heading"><div className="eyebrow">A SIMPLE JOURNEY</div><h2>Ready. Set. Ship.</h2><p>From your first question to your cargo’s next destination.</p></div><div className="steps"><div className="step"><span className="step-number">01</span><h3>Tell us what’s moving</h3><p>Fill in your cargo details and route in the Trixa quote form.</p></div><div className="step"><span className="step-number">02</span><h3>Let’s make a plan</h3><p>Confirm your price, sailing date and drop-off details with our team.</p></div><div className="step"><span className="step-number">03</span><h3>Follow the journey</h3><p>Use your tracking reference to check your shipment with Trixa.</p></div></div></section>

      <section className="faq-section container" id="questions"><div className="faq-intro"><div className="eyebrow"><span className="tiny-line"/> GOOD TO KNOW</div><h2>A few questions,<br/>before we set sail.</h2><p>Need a little more help?</p><button className="quiet-link" onClick={contact}>Let’s have a conversation <ArrowUpRight size={17}/></button></div><div className="faq-list">{faqs.map(([q,a], i) => <div className={`faq-item ${activeFaq === i ? 'expanded' : ''}`} key={q}><h3><button aria-expanded={activeFaq === i} aria-controls={`faq-${i}`} onClick={() => setActiveFaq(activeFaq === i ? null : i)}>{q}<ChevronDown size={19}/></button></h3><div id={`faq-${i}`} hidden={activeFaq !== i}><p>{a}</p></div></div>)}</div></section>

      <section className="cta-section container"><div className="cta-graphic" aria-hidden="true"><svg viewBox="0 0 300 200"><path d="M-20 130Q80 30 170 100T340 100 M-30 155Q70 55 160 125T330 125 M-40 180Q60 80 150 150T320 150 M-50 205Q50 105 140 175T310 175" fill="none" stroke="currentColor" strokeWidth="1.3"/></svg></div><div><span className="eyebrow">YOUR NEXT SHIPMENT STARTS HERE</span><h2>Let’s make the connection.</h2><p>Fill in our Trixa quote form, then close the window to return here.</p></div><div className="cta-actions"><QuoteLink className="button button-primary">Get a quote <ArrowUpRight size={18}/></QuoteLink><button className="cta-phone" onClick={contact}><Phone size={17}/>{CONTACT.phone || 'Talk to our team'}<ArrowUpRight size={15}/></button></div></section>
    </main>
    <footer className="footer container"><div className="footer-top"><div><Brand/><p>Bringing our coast closer,<br/>one shipment at a time.</p></div><div className="footer-links"><span>EXPLORE</span><a href="#routes">Our routes</a><a href="#services">Our services</a><a href="#about">Why Fanaar</a></div><div className="footer-links"><span>HOW CAN WE HELP?</span><a href="#track">Track a package</a><QuoteLink>Get a quote</QuoteLink><button onClick={contact}>Phone & WhatsApp</button></div><div className="footer-coast"><span>CONNECTED BY THE COAST</span><p>Dar es Salaam <span>↔</span> Zanzibar<br/>Zanzibar <span>→</span> Tanga</p><div><MapPin size={14}/> Tanzania, East Africa</div></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Fanaar Logistics. All rights reserved.</span><div className="footer-bottom-actions"><span className="footer-motto">Local roots. Coastal connections.<Anchor size={13}/></span><a className="footer-admin" href={ADMIN_LOGIN_URL} target="_blank" rel="noopener noreferrer" aria-label="Admin login — opens Trixa in a new tab">Admin login <ExternalLink size={12}/></a></div></div></footer>
    <button className="floating-contact" aria-label={whatsappNumber ? 'Chat with Fanaar on WhatsApp' : 'Contact Fanaar Logistics'} onClick={contact}><MessageCircle size={23}/><span>Let’s talk</span></button>
    {modal === 'contact' && <ContactDialog onClose={closeModal}/>}
  </>;
}

createRoot(document.getElementById('root')).render(<App/>);
