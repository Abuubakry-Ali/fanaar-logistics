import React from 'react';
import {ArrowRight,MapPin,Package} from 'lucide-react';

const labels={booked:'Shipment booked',received:'Cargo received',in_transit:'In transit',arrived:'Arrived at destination',cancelled:'Shipment cancelled',driver_on_way_to_pickup:'Driver on the way to pickup',picked_up:'Cargo picked up',at_collection_centre:'At Fanaar collection centre',shipped:'Shipped / in transit',arrived_destination:'Arrived at destination',at_sorting_facility:'At sorting facility',out_for_delivery:'Out for delivery',ready_for_collection:'Ready for customer collection',delivered:'Delivered'};
const dateLabel=value=>{const parsed=value&&new Date(value);return parsed&&Number.isFinite(parsed.getTime())?new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Dar_es_Salaam',dateStyle:'medium',timeStyle:'short'}).format(parsed)+' EAT':'To be confirmed';};

export function TrackingJourney({record}){
 const expectedPickup=!record.pickedUpAt&&(record.pickupEtaAt||record.pickupEtaWindow);
 return <>
  <div className={`shipment-status status-${record.status}`}><span className="customer-success-mark"><Package size={25}/></span><div><span>Current status</span><strong>{labels[record.milestone]||labels[record.status]||'Shipment update'}</strong></div></div>
  <div className="tracking-route"><MapPin size={18}/><strong>{record.from}</strong><ArrowRight size={17}/><strong>{record.to}</strong></div>
  <div className="tracking-dates">
   {record.pickupAt&&<div><span>Scheduled pickup</span><strong>{dateLabel(record.pickupAt)}</strong></div>}
   {expectedPickup&&<div><span>Estimated pickup</span><strong>{record.pickupEtaAt?dateLabel(record.pickupEtaAt):record.pickupEtaWindow}</strong>{record.pickupEtaAt&&record.pickupEtaWindow&&<p>{record.pickupEtaWindow}</p>}</div>}
   {record.pickedUpAt&&<div><span>Picked up</span><strong>{dateLabel(record.pickedUpAt)}</strong></div>}
   {!record.pickupAt&&!expectedPickup&&!record.pickedUpAt&&<div><span>Pickup</span><strong>To be confirmed</strong></div>}
   <div><span>{record.deliveredAt?'Delivered':'Estimated delivery'}</span><strong>{dateLabel(record.deliveredAt||record.eta)}</strong></div>
  </div>
  {!record.deliveredAt&&record.status!=='cancelled'&&<p className="customer-note">Pickup and delivery estimates are entered by our team and may change. We’ll update this page as your shipment progresses.</p>}
  <h3 className="timeline-heading">Shipment updates</h3><ol className="shipment-timeline">{(record.events||[]).map((event,index)=><li key={`${event.status}-${event.occurredAt}-${index}`}><span className="timeline-dot"/><div><strong>{labels[event.status]||'Shipment update'}</strong><p>{event.description}</p><time dateTime={event.occurredAt}>{dateLabel(event.occurredAt)}</time></div></li>)}</ol>
  <p className="tracking-updated">Last updated {dateLabel(record.updatedAt)}</p>
 </>;
}
