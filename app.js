const CHUNKS=6;
const parts=await Promise.all(Array.from({length:CHUNKS},(_,i)=>fetch(`/chunks/runtime.${String(i+1).padStart(3,'0')}.b64`,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`Runtime chunk ${i+1} failed`);return r.text();})));
const raw=atob(parts.join(''));
const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
if(!('DecompressionStream' in window))throw new Error('This browser needs DecompressionStream support.');
const text=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
const url=URL.createObjectURL(new Blob([text],{type:'text/javascript'}));
try{await import(url)}finally{URL.revokeObjectURL(url)}
