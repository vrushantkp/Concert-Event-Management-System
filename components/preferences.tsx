'use client';
import { useRouter } from 'next/navigation';
import { useState,type FormEvent } from 'react';
import { api } from './actions';
import type { Preference } from '@/lib/mongo';
type Values=Omit<Preference,'updatedAt'|'userId'>;
export default function PreferenceForm({defaults}:{defaults:Values|null}) {
  const router=useRouter();
  const [message,setMessage]=useState('');
  const [pending,setPending]=useState(false);

  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    const list=(key:string)=>String(f.get(key)).split(',').map(v=>v.trim()).filter(Boolean);
    setPending(true);
    try {
      await api('preferences',{genres:list('genres'),artists:list('artists'),categories:list('categories'),section:f.get('section'),budget:Number(f.get('budget')),accessible:f.has('accessible')});
      setMessage('Preferences saved.');router.refresh();
    } catch(e){setMessage((e as Error).message)}finally{setPending(false)}
  }
  return <form className="stack" onSubmit={submit} key={defaults ? 'saved' : 'new'}>
    <p>Separate multiple genres, artists, or categories with commas.</p><div className="form-grid">
      <label>Favourite genres<input name="genres" defaultValue={defaults?.genres.join(', ')} placeholder="Jazz, Indie"/></label>
      <label>Favourite artists<input name="artists" defaultValue={defaults?.artists.join(', ')}/></label>
      <label>Event categories<input name="categories" defaultValue={defaults?.categories.join(', ')}/></label>
      <label>Preferred section<input name="section" defaultValue={defaults?.section}/></label>
      <label>Budget (₹)<input name="budget" type="number" min="0" max="1000000" required defaultValue={defaults?.budget??6000}/></label>
      <label className="check"><input name="accessible" type="checkbox" defaultChecked={defaults?.accessible}/> Prefer an accessible seat</label>
    </div>
    <div className="actions"><button disabled={pending}>Save preferences</button>{defaults&&<button type="button" className="outline" disabled={pending} onClick={async()=>{
      if(!confirm('Delete all event preferences?'))return;
      setPending(true);try{await api('delete-preferences');setMessage('Preferences deleted.');router.refresh()}catch(e){setMessage((e as Error).message)}finally{setPending(false)}
    }}>Delete preferences</button>}</div>
    {message&&<p role="status">{message}</p>}
  </form>;
}
