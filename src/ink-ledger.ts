// Static, reusable stamp variants: no filters, canvas loop or per-cell runtime.
const variants = 7;
export function inkDayDefs() {
  let marks = '';
  for (let n=0;n<variants;n++) {
    const j=(i:number)=>Math.sin(n*12.7+i*2.1)*.18;
    const d='M'+(1.1+j(1))+' '+(1.3+j(2))+' Q5.7 '+(.8+j(3))+' '+(10.7+j(4))+' '+(1.2+j(5))+' L'+(10.5+j(6))+' '+(10.6+j(7))+' Q6 '+(11+j(8))+' '+(1.2+j(9))+' '+(10.5+j(10))+'Z';
    marks+='<g id="at-day-'+n+'"><path class="at-day-pigment" d="'+d+'"/><path class="at-day-edge" d="'+d+'"/><path class="at-day-grain" d="M2.4 3.2 7.5 2.8m-3.1 5.8 4.8-.35"/></g>';
  }
  return '<svg class="at-day-defs" width="0" height="0" aria-hidden="true"><defs>'+marks+'</defs></svg>';
}
export const inkDayMark=(n:number)=>'<svg viewBox="0 0 12 12" aria-hidden="true"><use href="#at-day-'+(n%variants)+'"/></svg>';

type LedgerYear = {markup:string;months:string;total:number;days:number;weeks:number};
const cache=new Map<number,LedgerYear>();
const dayDate=new Intl.DateTimeFormat('en',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
const monthDate=new Intl.DateTimeFormat('en',{month:'short',timeZone:'UTC'});
export function ledgerYear(year:number):LedgerYear {
  const previous=cache.get(year);
  if(previous)return previous;
  const start=Date.UTC(year,0,1),days=new Date(Date.UTC(year,1,29)).getUTCMonth()===1?366:365;
  const pad=new Date(start).getUTCDay(),weeks=Math.ceil((days+pad)/7);
  let seed=year,total=0,markup='';
  const values:{count:number;date:string}[]=[];
  for(let i=0;i<days;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const chance=seed/4294967296,count=chance<.47?0:Math.floor(chance*12);
    total+=count;
    values.push({count,date:dayDate.format(new Date(start+i*86400000))});
  }
  for(let week=0;week<weeks;week++){
    let cells='';
    for(let day=0;day<7;day++){
      const i=week*7+day-pad,v=values[i];
      if(!v){cells+='<span role="gridcell"></span>';continue;}
      const level=v.count===0?0:v.count<5?1:v.count<8?2:v.count<10?3:4;
      cells+='<button class="at-git-cell at-ink-day" role="gridcell" tabindex="'+(i===0?'0':'-1')+'" data-day="'+i+'" data-detail="'+v.count+' contributions · '+v.date+'" data-level="'+level+'" aria-label="'+v.count+' sample contributions on '+v.date+'">'+inkDayMark(i*3+week)+'</button>';
    }
    markup+='<div class="at-git-week" role="row">'+cells+'</div>';
  }
  const months=Array.from({length:12},(_,month)=>{
    const date=Date.UTC(year,month,1),week=Math.floor(((date-start)/86400000+pad)/7);
    return '<span style="left:'+week/weeks*100+'%">'+monthDate.format(new Date(date))+'</span>';
  }).join('');
  const result={markup,months,total,days,weeks};
  cache.set(year,result);
  return result;
}
