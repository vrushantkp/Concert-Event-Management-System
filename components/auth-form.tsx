'use client';
import { useState,type FormEvent } from 'react';
import { api } from './actions';
export default function AuthForm({next}:{next:string}) {
  const [create,setCreate]=useState(false);
  const [visible,setVisible]=useState(false);
  const [message,setMessage]=useState('');
  const [pending,setPending]=useState(false);
  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();setPending(true);setMessage('');
    try {
      await api(create?'register':'login',Object.fromEntries(new FormData(e.currentTarget)));
      window.location.replace(next);
    } catch(error) {
      setMessage((error as Error).message);
      setPending(false);
    }
  }
  return <div className="panel"><h1>{create?'Create your account':'Sign in'}</h1>
    <form className="stack" onSubmit={submit}>
      {create&&<label>Name<input name="name" autoComplete="name" required maxLength={100}/></label>}
      <label>Email<input name="email" type="email" autoComplete="email" required/></label>
      <label>Password<input name="password" type={visible?'text':'password'} autoComplete={create?'new-password':'current-password'} required minLength={12} maxLength={128}/></label>
      <label className="check"><input type="checkbox" checked={visible} onChange={e=>setVisible(e.target.checked)}/> Show password</label>
      {message&&<p role="alert" className="error">{message}</p>}
      <button disabled={pending}>{pending?'Please wait…':create?'Create account':'Sign in'}</button>
    </form><button className="text-button" onClick={()=>{setCreate(!create);setMessage('')}}>{create?'I already have an account':'Create a customer account'}</button>
  </div>;
}
