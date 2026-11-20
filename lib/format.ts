export const money = (value:number|string) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(value));
export const eventDate = (value:string) => new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(value));
export const eventTime = (value:Date) => new Intl.DateTimeFormat('en-IN',{timeStyle:'short',timeZone:'Asia/Kolkata'}).format(value);
