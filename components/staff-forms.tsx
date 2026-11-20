'use client';
import { useRouter } from 'next/navigation';
import { useState,type FormEvent,type ReactNode } from 'react';
import { api } from './actions';
import type { StaffData } from '@/lib/staff';
type Item={id:number;name:string};
export function Editor({action,read,children,label='Save changes'}:{action:string;read:(f:FormData)=>unknown;children:ReactNode;label?:string}) {
  const router=useRouter();
  const [status,setStatus]=useState('');
  const [pending,setPending]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setPending(true);setStatus('');
    try{await api(action,read(new FormData(event.currentTarget)));setStatus('Saved.');router.refresh()}
    catch(e){setStatus((e as Error).message)}finally{setPending(false)}
  }
  return <form className="stack" onSubmit={submit}>{children}<button disabled={pending}>{label}</button>{status&&<p role="status">{status}</p>}</form>;
}
function Options({label,name,items,initial,disabled}:{label:string;name:string;items:Item[];initial?:number;disabled?:boolean}) {
  return <label>{label}<select name={name} defaultValue={initial??''} disabled={disabled} required>
    <option value="" disabled>Choose {label.toLowerCase()}</option>{items.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}
  </select></label>;
}
function wallTime(timestamp:string) {
  const date=new Date(timestamp);
  return new Date(date.getTime()+330*60000).toISOString().slice(0,16);
}
function optionalNumber(form:FormData,name:string) {
  const value=form.get(name);
  return typeof value==='string'&&value!==''?Number(value):null;
}
export function EventEditor({data,event}:{data:StaffData;event?:StaffData['events'][number]}) {
  return <Editor action="event" label={event?'Save event':'Create event'} read={f=>({
    eventId:event?.id,venueId:event?.venue_id??Number(f.get('venue')),artistId:Number(f.get('artist')),categoryId:Number(f.get('category')),
    title:f.get('title'),description:f.get('description'),startsAt:new Date(String(f.get('startsAt'))+':00+05:30').toISOString(),
    published:f.has('published'),featured:f.has('featured'),artwork:f.get('artwork'),price:Number(f.get('price')),frontPrice:Number(f.get('frontPrice')),
    details:{doorsBefore:optionalNumber(f,'doorsBefore'),duration:optionalNumber(f,'duration'),
      venueNote:f.get('venueNote'),entryNote:f.get('entryNote'),demo:f.has('demo')}
  })}>
    <div className="form-grid"><label>Title<input name="title" required maxLength={100} defaultValue={event?.title}/></label>
    <label>Date and time (IST)<input name="startsAt" type="datetime-local" required defaultValue={event?wallTime(event.starts_at):undefined}/></label>
    <Options name="venue" label="Venue" items={data.venues} initial={event?.venue_id} disabled={!!event}/>
    <Options name="artist" label="Artist" items={data.artists} initial={event?.artist_id}/>
    <Options name="category" label="Genre" items={data.categories} initial={event?.category_id}/>
    <label>Standard price (₹)<input name="price" type="number" min={0} max={1000000} required defaultValue={event?.price??1100}/></label>
    <label>Front Row price (₹)<input name="frontPrice" type="number" min={0} max={1000500} required defaultValue={event?.front_price??1600}/></label>
    <label>Event image<select name="artwork" defaultValue={event?.artwork??'ruby'}><option value="ruby">Red stage</option><option value="indigo">Open air</option><option value="amber">Microphone</option><option value="violet">Purple stage</option></select></label>
    <div className="stack"><label className="check"><input type="checkbox" name="published" defaultChecked={event?.published}/> Publish show</label><label className="check"><input type="checkbox" name="featured" defaultChecked={event?.featured}/> Feature show</label></div></div>
    <label>Description<textarea name="description" required maxLength={3000} defaultValue={event?.description}/></label>
    <details className="event-editor-details"><summary>Schedule and entry details</summary><div className="stack">
      <div className="form-grid"><label>Doors before show (minutes)<input name="doorsBefore" type="number" min={0} max={180} defaultValue={event?.doors_before_minutes??''}/></label>
      <label>Estimated duration (minutes)<input name="duration" type="number" min={15} max={600} defaultValue={event?.duration_minutes??''}/></label></div>
      <label>Venue notes<textarea name="venueNote" maxLength={600} defaultValue={event?.venue_note??''}/></label>
      <label>Entry notes<textarea name="entryNote" maxLength={600} defaultValue={event?.entry_note??''}/></label>
      <label className="check"><input name="demo" type="checkbox" defaultChecked={event?.is_demo}/> Mark as a demo listing</label>
    </div></details>
    <p className="muted">Sections within five metres of the stage use Front Row pricing. Existing bookings keep their original price.</p>
  </Editor>;
}
export function ManageVenue({item}:{item?:{id:number;name:string;city:string}}) {
  return <Editor action="venue" label={item?'Save venue':'Add venue'} read={f=>({id:item?.id,name:f.get('name'),city:f.get('city')})}>
    <label>Name<input name="name" defaultValue={item?.name} required/></label><label>City<input name="city" defaultValue={item?.city} required/></label>
  </Editor>;
}
export function ManageSection({venues,item}:{venues:Item[];item?:{id:number;venue_id:number;name:string;distance:number}}) {
  return <Editor action="section" label={item?'Save section':'Add section'} read={f=>({id:item?.id,venueId:item?.venue_id??Number(f.get('venue')),name:f.get('name'),distance:Number(f.get('distance'))})}>
    <Options name="venue" label="Venue" items={venues} initial={item?.venue_id} disabled={!!item}/>
    <label>Section name<input name="name" required defaultValue={item?.name}/></label><label>Distance from stage (m)<input type="number" name="distance" min={1} required defaultValue={item?.distance}/></label>
  </Editor>;
}
type SeatItem={id:number;section_id:number;venue_id:number;row_label:string;seat_no:number;accessible:boolean};
export function ManageSeat({venues,sections,item}:{venues:Item[];sections:(Item&{venue_id:number})[];item?:SeatItem}) {
  const choices=sections.map(s=>({...s,name:(venues.find(v=>v.id===s.venue_id)?.name??'')+' · '+s.name}));
  return <Editor action="seat" label={item?'Save seat':'Add seat'} read={f=>{
    const section=sections.find(s=>s.id===(item?.section_id??Number(f.get('section'))));
    return {id:item?.id,venueId:section?.venue_id,sectionId:section?.id,row:f.get('row'),number:Number(f.get('number')),accessible:f.has('accessible')};
  }}>
    <Options name="section" label="Section" items={choices} initial={item?.section_id} disabled={!!item}/>
    <label>Row<input name="row" maxLength={4} required defaultValue={item?.row_label}/></label>
    <label>Seat number<input name="number" type="number" min={1} required defaultValue={item?.seat_no}/></label>
    <label className="check"><input type="checkbox" name="accessible" defaultChecked={item?.accessible}/> Accessible</label>
  </Editor>;
}
export function StaffAdministration({data,userId}:{data:StaffData;userId:number}) {
  return <div className="columns dashboard-section">
    <section className="panel"><h2>Users and access</h2>{data.users.map(u=><details key={u.id}><summary>{u.name} · {u.role}</summary><p>{u.email}</p>
      {u.id!==userId&&<Editor action="user" read={f=>({id:u.id,role:f.get('role'),enabled:f.has('enabled')})}>
        <label>Role<select name="role" defaultValue={u.role}><option value="customer">Customer</option><option value="organizer">Organizer</option><option value="admin">Administrator</option></select></label>
        <label className="check"><input type="checkbox" name="enabled" defaultChecked={u.enabled}/> Account enabled</label>
      </Editor>}</details>)}</section>
    <section className="panel"><h2>Venue layouts</h2>
      <details><summary>Add venue</summary><ManageVenue/></details><details><summary>Add section</summary><ManageSection venues={data.venues}/></details>
      <details><summary>Add seat</summary><ManageSeat venues={data.venues} sections={data.sections}/></details>
      {data.venues.map(v=><details key={v.id}><summary>{v.name} · {v.city}</summary><ManageVenue item={v}/>
        {data.sections.filter(s=>s.venue_id===v.id).map(s=><details key={s.id}><summary>{s.name}</summary><ManageSection venues={data.venues} item={s}/>
          {data.seats.filter(x=>x.section_id===s.id).map(x=><details key={x.id}><summary>{x.row_label}{x.seat_no}{x.accessible?' · Accessible':''}</summary><ManageSeat venues={data.venues} sections={data.sections} item={x}/></details>)}
        </details>)}
      </details>)}
    </section>
  </div>;
}
export function ArtistEditor() {
  return <Editor action="artist" label="Add artist" read={f=>({name:f.get('name')})}><label>Artist name<input name="name" required maxLength={100}/></label></Editor>;
}
