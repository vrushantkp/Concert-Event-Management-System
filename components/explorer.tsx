'use client';
import { useState } from 'react';
import { api } from './actions';
export default function Explorer({examples}:{examples:Record<string,string>}) {
  const [name,setName]=useState('JOIN and occupancy');
  const [output,setOutput]=useState<{command:string;rows:unknown[]}|null>(null);
  const [pending,setPending]=useState(false);
  const [message,setMessage]=useState('');
  return <div className="panel stack"><h2>Run a database example</h2>
    <label>Example<select value={name} onChange={e=>{setName(e.target.value);setOutput(null);setMessage('')}}>{Object.keys(examples).map(key=><option key={key}>{key}</option>)}<option>MongoDB genre counts</option><option>MongoDB CRUD</option></select></label>
    <pre className="code">{examples[name]??(name==='MongoDB CRUD'?'Temporary preference document: insert, read, update, delete':'db.preferences.aggregate(…)')} </pre>
    <button disabled={pending} onClick={async()=>{
      setMessage('');setPending(true);setOutput(null);
      try{
        const result=await api<{command:string;rows:unknown[]}>(name.startsWith('MongoDB')?'mongo-demo':'demo',{name,mode:name==='MongoDB CRUD'?'crud':'aggregate'});
        setOutput(result);
      }catch(e){setMessage((e as Error).message)}finally{setPending(false)}
    }}>Run example</button>
    {message&&<p role="alert">{message}</p>}
    {output&&<><p role="status">{name==='Expire holds'?'Procedure executed. Open Trigger audit to inspect status changes.':output.rows.length+' rows returned'}</p>
    <pre className="code">{output.command}</pre><pre className="code">{JSON.stringify(output.rows,null,2)}</pre></>}
  </div>;
}
