import { MongoClient } from 'mongodb';
export type Preference = {userId:number;genres:string[];artists:string[];categories:string[];section:string;budget:number;accessible:boolean;updatedAt:Date};
let client:MongoClient|undefined;
export function preferences() {
  const uri = process.env.MONGODB_URI;
  if(!uri) throw new Error('MONGODB_URI is required');
  client ??= new MongoClient(uri,{serverSelectionTimeoutMS:3500,maxPoolSize:10});
  return client.db(process.env.MONGODB_DB || 'encore').collection<Preference>('preferences');
}
