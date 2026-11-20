import { Pool, type PoolClient } from 'pg';
export type Role = 'customer' | 'organizer' | 'admin';
export type User = {id:number;name:string;email:string;role:Role};
const runtime = new Pool({ connectionString: process.env.DATABASE_URL, max: 10, connectionTimeoutMillis: 4000 });
runtime.on('error', error => console.error('PostgreSQL idle connection', error.message));
const roles = { customer:'encore_customer', organizer:'encore_organizer', admin:'encore_admin', guest:'encore_guest' };
export const identity = runtime;
export async function database<T>(user:User|null, work:(client:PoolClient)=>Promise<T>):Promise<T> {
  const client = await runtime.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE '+roles[user?.role ?? 'guest']);
    await client.query("SELECT set_config('encore.actor',$1,true)",[String(user?.id ?? '')]);
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
