'use client';
import { Bookmark, LogOut } from 'lucide-react';
import { useState } from 'react';

export async function api<T>(action:string,data:unknown={}) {
  const response = await fetch('/api/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const result = await response.json();
  if(!response.ok) throw new Error(result.error ?? 'Request failed.');
  return result as T;
}

export function Logout() {
  const [message,setMessage] = useState('');
  const [pending,setPending] = useState(false);
  return <><button className="button outline" disabled={pending} onClick={async()=>{
    setPending(true);
    try {
      await api('logout');
      window.location.replace('/');
    } catch(e) {
      setMessage((e as Error).message);
      setPending(false);
    }
  }}><LogOut size={16}/> Sign out</button>{message&&<span role="alert">{message}</span>}</>;
}

export function SaveEvent({id,initial}:{id:number;initial:boolean}) {
  const [saved,setSaved] = useState(initial);
  const [message,setMessage] = useState('');
  const [pending,setPending] = useState(false);
  return <><button disabled={pending} className="button outline" aria-pressed={saved} onClick={async()=>{
    setPending(true);
    try {
      await api('save-event',{eventId:id,saved:!saved});
      setSaved(!saved);
      setMessage('');
    } catch(e) {
      setMessage((e as Error).message);
    } finally {
      setPending(false);
    }
  }}><Bookmark size={17} fill={saved?'currentColor':'none'}/> {saved?'Saved to My Encore':'Save show'}</button>{message&&<p className="error" role="alert">{message}</p>}</>;
}
