'use client';
import { useDeferredValue, useState } from 'react';
import { ListFilter, Search, SearchX, X } from 'lucide-react';
import type { Event } from '@/lib/catalog';
import EventCard from './event-card';

const initialFilters = {q:'',genre:'',artist:'',city:'',date:'',price:'',sort:'soonest'};
type Filters = typeof initialFilters;
const localDate = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'});
const availableFilters = ['artist','city','date','price'] as const;

function fromQuery(query: string): Filters {
  const params = new URLSearchParams(query);
  return {...initialFilters,q:params.get('q')?.slice(0,150) ?? '',genre:params.get('genre') ?? '',
    artist:params.get('artist') ?? '',city:params.get('city') ?? '',date:params.get('date') ?? '',
    price:params.get('price') ?? '',sort:params.get('sort') === 'price' ? 'price' : 'soonest'};
}

export default function EventDiscovery({events,query}:{events:Event[];query:string}) {
  const [filters,setFilters] = useState(() => fromQuery(query));
  const [expanded,setExpanded] = useState(() => availableFilters.some(key => fromQuery(query)[key]));
  const typedSearch = useDeferredValue(filters.q);
  const needle = typedSearch.trim().toLowerCase();
  const genres = [...new Set(events.map(e => e.genre))].sort();
  const activeCount = availableFilters.filter(key => filters[key]).length;
  const hasFilters = !!(filters.q || filters.genre || activeCount);
  const results = events.filter(event =>
    (!needle || [event.title,event.artist,event.venue,event.city,event.genre].some(value => value.toLowerCase().includes(needle))) &&
    (!filters.genre || event.genre === filters.genre) &&
    (!filters.artist || event.artist === filters.artist) && (!filters.city || event.city === filters.city) &&
    (!filters.date || localDate.format(new Date(event.starts_at)) === filters.date) &&
    (!filters.price || (event.price !== null && event.price <= Number(filters.price)))
  ).sort((a,b) => (filters.sort === 'price' ? (a.price ?? Infinity) - (b.price ?? Infinity) : 0) || Date.parse(a.starts_at) - Date.parse(b.starts_at));

  function change(next: Filters) {
    setFilters(next);
    const params = new URLSearchParams(Object.entries(next).filter(([key,value]) => value && value !== initialFilters[key as keyof Filters]));
    window.history.replaceState(null,'',params.size ? '/events?' + params : '/events');
  }
  function update(key: keyof Filters,value: string) {
    change({...filters,[key]:value});
  }

  return <>
    <div className="discovery-controls">
      <div className="discovery-search">
        <label className="search-field"><Search size={21}/><span className="sr-only">Search events</span>
          <input type="search" maxLength={150} value={filters.q} placeholder="Search artist, show or venue" onChange={e=>update('q',e.target.value)}/>
        </label>
        {filters.q && <button type="button" className="icon-button" aria-label="Clear search" onClick={()=>update('q','')}><X size={19}/></button>}
      </div>
      <button type="button" className="outline" aria-expanded={expanded} aria-controls="event-filters" onClick={()=>setExpanded(!expanded)}>
        <ListFilter size={18}/> Filters {activeCount > 0 && <span className="filter-count">{activeCount}</span>}
      </button>
    </div>
    <div className="filter-drawer" id="event-filters" hidden={!expanded}>
      {(['artist','city'] as const).map(field => <label key={field}>{field === 'artist' ? 'Artist' : 'City'}
        <select value={filters[field]} onChange={e=>update(field,e.target.value)}>
          <option value="">Any</option>
          {[...new Set(events.map(e=>e[field]))].sort().map(value=><option key={value}>{value}</option>)}
        </select></label>)}
      <label>Date<input type="date" value={filters.date} onChange={e=>update('date',e.target.value)}/></label>
      <label>Max price (₹)<input type="number" min="0" max="1000000" value={filters.price} onChange={e=>update('price',e.target.value)}/></label>
    </div>
    <div className="genres" role="group" aria-label="Filter by genre">
      <button type="button" className="pill" aria-pressed={!filters.genre} onClick={()=>update('genre','')}>All genres</button>
      {genres.map(genre=><button type="button" className="pill" key={genre} aria-pressed={filters.genre === genre} onClick={()=>update('genre',filters.genre === genre ? '' : genre)}>{genre}</button>)}
    </div>
    <div className="result-bar">
      <p role="status">{results.length} {results.length === 1 ? 'event' : 'events'} found</p>
      {hasFilters && <button type="button" className="text-button" onClick={()=>change({...initialFilters,sort:filters.sort})}>Clear filters</button>}
      <label className="sort-control">Sort by <select value={filters.sort} onChange={e=>update('sort',e.target.value)}>
        <option value="soonest">Soonest</option><option value="price">Lowest price</option>
      </select></label>
    </div>
    {results.length > 0 ? <div className="cards">{results.map(event => <EventCard key={event.id} event={event}/>)}</div> :
      <div className="empty empty-search"><SearchX size={27}/><h2>No shows match these filters</h2><p>Try a different search or clear your filters.</p>
        {hasFilters && <button className="outline" onClick={()=>change(initialFilters)}>Show all events</button>}</div>}
  </>;
}
