import { createHash,randomBytes,scrypt,timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { identity,type User } from './postgres';

const derive = promisify(scrypt);
const digest = (token:string) => createHash('sha256').update(token).digest('hex');
const cookieName = 'encore_session';
export async function hashPassword(password:string) {
  const salt = randomBytes(16).toString('hex');
  return salt+':'+(await derive(password,salt,64) as Buffer).toString('hex');
}
export async function verifyPassword(password:string, stored?:string) {
  const [salt,encoded] = (stored ?? '00000000000000000000000000000000:'+ '00'.repeat(64)).split(':');
  const expected = Buffer.from(encoded??'','hex');
  const actual = await derive(password,salt,64) as Buffer;
  return !!stored && expected.length===actual.length && timingSafeEqual(expected,actual);
}
export async function currentUser():Promise<User|null> {
  const input = (await cookies()).get(cookieName)?.value;
  if (!input || !/^[a-f0-9]{64}$/.test(input)) return null;
  return (await identity.query<User>('SELECT * FROM encore.session_user_info($1)',[digest(input)])).rows[0] ?? null;
}
export async function startSession(id:number) {
  const store = await cookies();
  const old = store.get(cookieName)?.value;
  const token = randomBytes(32).toString('hex');
  if(old) await identity.query('SELECT encore.end_session($1)',[digest(old)]);
  await identity.query('SELECT encore.new_session($1,$2)',[id,digest(token)]);
  store.set(cookieName,token,{
    httpOnly:true,sameSite:'lax',path:'/',maxAge:43200,
    secure:process.env.APP_ORIGIN?.startsWith('https:') ?? process.env.NODE_ENV==='production'
  });
}
export async function endSession() {
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  if(token) await identity.query('SELECT encore.end_session($1)',[digest(token)]);
  store.delete(cookieName);
}
