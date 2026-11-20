import { redirect } from 'next/navigation';
import { currentUser } from './auth';
import type { Role } from './postgres';
export async function pageUser(roles?:Role[]) {
  const user=await currentUser();
  if(!user) redirect('/sign-in');
  if(roles&&!roles.includes(user.role)) redirect('/account');
  return user;
}
