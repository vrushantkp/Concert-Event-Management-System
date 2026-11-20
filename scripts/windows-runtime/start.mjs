import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import { MongoClient } from 'mongodb';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const data = resolve('.local/windows');
mkdirSync(data, { recursive: true });
const secrets = join(data, 'credentials.json');
if (!existsSync(secrets)) {
  const password = () => randomBytes(24).toString('hex');
  writeFileSync(secrets, JSON.stringify({ owner: password(), runtime: password(), demo: password() }), { flag: 'wx' });
}
const auth = JSON.parse(readFileSync(secrets, 'utf8'));
const dbDir = join(data, 'postgres');
const mongoDir = join(data, 'mongo');
const origin = 'http://127.0.0.1:3100';
const owner = 'postgres://postgres:' + auth.owner + '@127.0.0.1:55432/';
const env = { ...process.env, DATABASE_URL: 'postgres://encore_runtime:' + auth.runtime + '@127.0.0.1:55432/encore',
  MIGRATION_DATABASE_URL: owner + 'encore', DEMO_PASSWORD: auth.demo, APP_ORIGIN: origin,
  MONGODB_URI: 'mongodb://127.0.0.1:27027', MONGODB_DB: 'encore' };
const cluster = new EmbeddedPostgres({databaseDir: dbDir, user:'postgres', password:auth.owner,
  port:55432, persistent:true, authMethod:'scram-sha-256', postgresFlags:['-c','listen_addresses=127.0.0.1']});
let startedPg = false;
let mongoProcess;
let next;
const finished = child => new Promise((ok, fail) => {
  child.once('error', fail);
  child.once('exit', (code,signal) => code === 0 ? ok() : fail(new Error('Process stopped: ' + (code ?? signal))));
});
async function connectOwner() {
  const client = new pg.Client({connectionString:owner+'postgres', connectionTimeoutMillis:1500});
  try { await client.connect(); return client; } catch(e) { await client.end().catch(()=>{}); throw e; }
}
async function postgres() {
  let client;
  try { client = await connectOwner(); }
  catch(e) {
    if (e.code !== 'ECONNREFUSED') throw e;
    if (!existsSync(join(dbDir,'PG_VERSION'))) await cluster.initialise();
    await cluster.start(); startedPg = true;
    client = await connectOwner();
  }
  try {
    const actual = (await client.query('SHOW data_directory')).rows[0].data_directory;
    if(resolve(actual).toLowerCase() !== dbDir.toLowerCase()) throw new Error('PostgreSQL port 55432 is occupied by another cluster.');
    if (!(await client.query("SELECT 1 FROM pg_database WHERE datname='encore'")).rowCount) await client.query('CREATE DATABASE encore');
  } finally { await client.end(); }
}
async function mongoReady() {
  const client = new MongoClient(env.MONGODB_URI,{serverSelectionTimeoutMS:800});
  try {
    await client.connect();
    const opts = await client.db('admin').command({getCmdLineOpts:1});
    if (resolve(opts.parsed.storage.dbPath).toLowerCase() !== mongoDir.toLowerCase()) throw new Error('MongoDB port 27027 belongs to another instance.');
    return true;
  } catch(e) { if(e.name==='MongoServerSelectionError' && e.message.includes('ECONNREFUSED')) return false; throw e; }
  finally { await client.close(); }
}
async function mongo() {
  if(await mongoReady()) return;
  const root = join(process.env.ProgramFiles,'MongoDB','Server');
  const binary = readdirSync(root).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true})).map(v=>join(root,v,'bin','mongod.exe')).find(existsSync);
  if (!binary) throw new Error('MongoDB Server executable missing.');
  mkdirSync(mongoDir,{recursive:true});
  mongoProcess=spawn(binary,['--dbpath',mongoDir,'--bind_ip','127.0.0.1','--port','27027','--logpath',join(data,'mongo.log'),'--logappend'],{windowsHide:true});
  let failure;
  mongoProcess.once('error',e=>{failure=e;});
  for(let i=0;i<45;i++) {
    if(failure) throw failure;
    if(mongoProcess.exitCode!==null) throw new Error('MongoDB stopped. See '+join(data,'mongo.log'));
    if(await mongoReady()) return;
    await delay(500);
  }
  throw new Error('Timed out waiting for MongoDB.');
}
async function run() {
  await postgres(); await mongo();
  await finished(spawn(process.execPath,['scripts/setup.mjs'],{env,stdio:'inherit'}));
  next=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','3100'],{env,stdio:'inherit'});
  const serving=finished(next);
  const verify=async()=>{
    for(let i=0;i<120;i++){
      if(next.exitCode!==null) return;
      try {
        const response=await fetch(origin,{signal:AbortSignal.timeout(3000)});
        if(response.ok && (await response.text()).includes('Upcoming shows')){
          console.log('Encore is ready at '+origin+'\nCustomer: customer@encore.test\nLocal demo password: '+auth.demo);
          spawn('explorer.exe',[origin],{windowsHide:true}).unref();
          return;
        }
      } catch { /* The first request can trigger compilation. */ }
      await delay(1000);
    }
    throw new Error('Encore did not serve the homepage.');
  };
  await Promise.race([verify(),serving]); await serving;
}
let closing;
function close() {
  return closing ??= (async()=>{
    if(next && next.exitCode===null) next.kill();
    if(mongoProcess && mongoProcess.exitCode===null && await mongoReady().catch(()=>false)){
      const client=new MongoClient(env.MONGODB_URI,{serverSelectionTimeoutMS:1000});
      try {await client.db('admin').command({shutdown:1});} catch { /* Successful shutdown disconnects the client. */ }
      finally {await client.close();}
    }
    if(startedPg) await cluster.stop();
  })();
}
process.once('SIGINT',()=>close().finally(()=>process.exit(0)));
try { await run(); } catch(e) { console.error(e.message); process.exitCode=1; } finally { await close(); }
