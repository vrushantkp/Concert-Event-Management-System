import type { Seat } from './catalog';
export type Criteria = {count:number;budget:number;section:string;distance:number;accessible:boolean};
export function recommend(seats:Seat[], criteria:Criteria) {
  const rows = new Map<string,Seat[]>();
  for(const seat of seats) {
    if(seat.state!=='available') continue;
    const key = JSON.stringify([seat.section,seat.row_label]);
    if(!rows.has(key)) rows.set(key,[]);
    rows.get(key)!.push(seat);
  }
  const candidates = [];
  for(const row of rows.values()) {
    row.sort((a,b)=>a.seat_no-b.seat_no);
    for(let index=0;index<=row.length-criteria.count;index++) {
      const group = row.slice(index,index+criteria.count);
      if(group[0].seat_no <= 5 && group.at(-1)!.seat_no > 5) continue;
      if(group.at(-1)!.seat_no-group[0].seat_no!==criteria.count-1) continue;
      const total=group.reduce((sum,seat)=>sum+seat.price,0);
      if(total>criteria.budget || (criteria.accessible && !group.some(s=>s.accessible))) continue;
      const sectionMatch = !criteria.section || group[0].section===criteria.section;
      const score=Math.round(40+25*(1-total/Math.max(criteria.budget,1))+
        (sectionMatch?15:0)+20/(1+Math.abs(group[0].distance-criteria.distance)/8));
      candidates.push({ids:group.map(s=>s.seat_id),label:group[0].section+' · '+group.map(s=>s.row_label+s.seat_no).join(', '),
        total,score,reason:[`${group.length} contiguous seat(s)`, 'within budget', `${group[0].distance} m from stage`,
          ...(criteria.section && sectionMatch?['preferred section']:[]),...(criteria.accessible?['accessible seat included']:[])].join(' · ')});
    }
  }
  return candidates.sort((a,b)=>b.score-a.score || a.total-b.total || a.ids[0]-b.ids[0]).slice(0,3);
}
