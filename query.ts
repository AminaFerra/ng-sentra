import { getAllComponents } from './server/db.ts';
getAllComponents().then(c=>console.log(c.find((x: any)=>x.slug==='tpot')));
