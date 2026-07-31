
const state={all:[],filtered:[],filter:"All",query:"",rendered:0,batch:18,current:-1};
const grid=document.querySelector(".gallery-grid");
const statusEl=document.querySelector(".gallery-status");
const viewer=document.querySelector(".viewer");
const viewerImg=viewer.querySelector("img");
const viewerTitle=viewer.querySelector("strong");
const viewerMeta=viewer.querySelector("figcaption span");
const detailLink=viewer.querySelector(".detail-link");

async function boot(){
  const res=await fetch("gallery.json");
  state.all=await res.json();
  applyFilters();
  observeMore();
  if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(()=>{});
}
function applyFilters(){
  const q=state.query.trim().toLowerCase();
  state.filtered=state.all.filter(w=>(state.filter==="All"||w.category===state.filter)&&(!q||`${w.title} ${w.number} ${w.category}`.toLowerCase().includes(q)));
  state.rendered=0;grid.innerHTML="";renderBatch();
}
function renderBatch(){
  const slice=state.filtered.slice(state.rendered,state.rendered+state.batch);
  const frag=document.createDocumentFragment();
  slice.forEach(w=>{
    const card=document.createElement("article");
    card.className="art-card";card.tabIndex=0;
    card.innerHTML=`<img src="${w.thumb}" alt="${escapeHtml(w.alt)}" width="${w.width}" height="${w.height}" loading="lazy" decoding="async">
      <div class="art-meta"><strong>${escapeHtml(w.title)}</strong><span>${w.number}</span></div>`;
    card.addEventListener("click",()=>openViewer(w.id));
    card.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openViewer(w.id)}});
    frag.appendChild(card);
  });
  grid.appendChild(frag);state.rendered+=slice.length;
  statusEl.textContent=state.filtered.length===0?"No works found":state.rendered<state.filtered.length?`Showing ${state.rendered} of ${state.filtered.length}`:`${state.filtered.length} works`;
}
function observeMore(){
  const io=new IntersectionObserver(entries=>{if(entries[0].isIntersecting&&state.rendered<state.filtered.length)renderBatch()},{rootMargin:"500px"});
  io.observe(statusEl);
}
function openViewer(id){
  state.current=state.filtered.findIndex(w=>w.id===id);
  showCurrent();viewer.showModal();document.body.style.overflow="hidden";
}
function showCurrent(){
  const w=state.filtered[state.current];if(!w)return;
  viewerImg.src=w.image;viewerImg.alt=w.alt;viewerTitle.textContent=w.title;viewerMeta.textContent=`${w.number} • ${w.year} • ${w.category}`;detailLink.href=w.url;
}
function move(delta){if(!state.filtered.length)return;state.current=(state.current+delta+state.filtered.length)%state.filtered.length;showCurrent()}
function closeViewer(){viewer.close();document.body.style.overflow=""}
viewer.querySelector(".viewer-close").onclick=closeViewer;
viewer.querySelector(".viewer-prev").onclick=()=>move(-1);
viewer.querySelector(".viewer-next").onclick=()=>move(1);
viewer.addEventListener("click",e=>{if(e.target===viewer)closeViewer()});
document.addEventListener("keydown",e=>{if(!viewer.open)return;if(e.key==="Escape")closeViewer();if(e.key==="ArrowLeft")move(-1);if(e.key==="ArrowRight")move(1)});
viewer.querySelector(".share-button").onclick=async()=>{
 const w=state.filtered[state.current];const data={title:`${w.title} — Monkey Power`,text:w.description,url:w.canonical};
 try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(w.canonical);viewer.querySelector(".share-button").textContent="Link copied";setTimeout(()=>viewer.querySelector(".share-button").textContent="Share",1600)}}catch{}
};
document.querySelectorAll(".filter").forEach(btn=>btn.addEventListener("click",()=>{
 document.querySelectorAll(".filter").forEach(b=>b.classList.remove("is-active"));btn.classList.add("is-active");state.filter=btn.dataset.filter;applyFilters();
}));
document.querySelector("#gallery-search").addEventListener("input",e=>{state.query=e.target.value;applyFilters()});
document.querySelector(".search-toggle").addEventListener("click",()=>{document.querySelector("#gallery").scrollIntoView();setTimeout(()=>document.querySelector("#gallery-search").focus(),350)});
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
boot();
