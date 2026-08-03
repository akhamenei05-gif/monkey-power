const state={
  all:[],
  filtered:[],
  filter:"All",
  query:"",
  rendered:0,
  batch:16,
  current:-1
};

const grid=document.querySelector(".gallery-grid");
const statusEl=document.querySelector(".gallery-status");
const viewer=document.querySelector(".viewer");
const viewerImg=viewer.querySelector("figure>img");
const viewerTitle=viewer.querySelector(".viewer-heading strong");
const viewerPosition=viewer.querySelector(".viewer-position");
const viewerMeta=viewer.querySelector(".viewer-meta");
const viewerDescription=viewer.querySelector(".viewer-description");
const detailLink=viewer.querySelector(".detail-link");
const shareButton=viewer.querySelector(".share-button");
const searchInput=document.querySelector("#gallery-search");
const searchClear=document.querySelector(".search-clear");
const filters=[...document.querySelectorAll(".filter")];

let loadObserver;
let revealObserver;
let lastFocusedElement=null;
let touchStartX=0;
let touchStartY=0;
let searchTimer;

async function boot(){
  try{
    const res=await fetch("gallery.json",{cache:"no-cache"});
    if(!res.ok) throw new Error(`Gallery request failed: ${res.status}`);
    state.all=await res.json();
    createRevealObserver();
    applyFilters({animate:false});
    observeMore();
  }catch(error){
    console.error(error);
    statusEl.textContent="The gallery could not be loaded. Please refresh the page.";
  }

  if("serviceWorker" in navigator){
    window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));
  }
}

function createRevealObserver(){
  revealObserver?.disconnect();
  revealObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },{rootMargin:"120px 0px",threshold:.04});
}

function filterWorks(){
  const q=state.query.trim().toLowerCase();
  return state.all.filter(work=>{
    const matchesFilter=state.filter==="All"||work.category===state.filter;
    const haystack=`${work.title} ${work.number} ${work.category} ${work.description||""}`.toLowerCase();
    return matchesFilter&&(!q||haystack.includes(q));
  });
}

function applyFilters({animate=true}={}){
  const update=()=>{
    state.filtered=filterWorks();
    state.rendered=0;
    grid.classList.add("is-updating");
    grid.innerHTML="";
    renderBatch();
    requestAnimationFrame(()=>grid.classList.remove("is-updating"));
  };

  if(animate&&document.startViewTransition){
    document.startViewTransition(update);
  }else{
    update();
  }
}

function renderBatch(){
  const slice=state.filtered.slice(state.rendered,state.rendered+state.batch);
  const frag=document.createDocumentFragment();

  slice.forEach((work,index)=>{
    const absoluteIndex=state.rendered+index;
    const card=document.createElement("article");
    card.className="art-card";
    card.tabIndex=0;
    card.setAttribute("role","button");
    card.setAttribute("aria-label",`Open ${work.title}`);
    card.dataset.id=work.id;
    card.style.setProperty("--reveal-delay",`${Math.min(index,8)*35}ms`);

    const priority=absoluteIndex<4?"high":"auto";
    const loading=absoluteIndex<4?"eager":"lazy";

    card.innerHTML=`
      <img
        src="${work.image}"
        alt="${escapeHtml(work.alt)}"
        width="${work.width}"
        height="${work.height}"
        loading="${loading}"
        fetchpriority="${priority}"
        decoding="async">
      <div class="art-meta">
        <div>
          <strong>${escapeHtml(work.title)}</strong>
          <small>${escapeHtml(work.category||"Collection")}</small>
        </div>
        <span>${work.number}</span>
      </div>`;

    const img=card.querySelector("img");
    if(img.complete&&img.naturalWidth){
      card.classList.add("is-loaded");
    }else{
      img.addEventListener("load",()=>card.classList.add("is-loaded"),{once:true});
    }
    img.addEventListener("error",()=>{
      card.classList.add("has-error");
      img.alt=`Image unavailable: ${work.title}`;
    },{once:true});

    card.addEventListener("click",()=>openViewer(work.id,card));
    card.addEventListener("keydown",event=>{
      if(event.key==="Enter"||event.key===" "){
        event.preventDefault();
        openViewer(work.id,card);
      }
    });

    frag.appendChild(card);
    revealObserver.observe(card);
  });

  grid.appendChild(frag);
  state.rendered+=slice.length;
  updateStatus();
}

function updateStatus(){
  if(!state.filtered.length){
    statusEl.innerHTML='<strong>No works found</strong><span>Try another title, number or category.</span>';
    return;
  }

  const visible=Math.min(state.rendered,state.filtered.length);
  statusEl.innerHTML=state.rendered<state.filtered.length
    ? `<span>Showing ${visible} of ${state.filtered.length}</span>`
    : `<span>${state.filtered.length} works</span>`;
}

function observeMore(){
  loadObserver?.disconnect();
  loadObserver=new IntersectionObserver(entries=>{
    if(entries[0].isIntersecting&&state.rendered<state.filtered.length){
      renderBatch();
    }
  },{rootMargin:"800px 0px"});
  loadObserver.observe(statusEl);
}

function openViewer(id,trigger){
  state.current=state.filtered.findIndex(work=>work.id===id);
  if(state.current<0)return;
  lastFocusedElement=trigger||document.activeElement;
  showCurrent();
  viewer.showModal();
  document.body.classList.add("viewer-open");
  viewer.querySelector(".viewer-close").focus({preventScroll:true});
}

function showCurrent(){
  const work=state.filtered[state.current];
  if(!work)return;

  viewerImg.classList.remove("is-ready");
  viewerImg.onload=()=>viewerImg.classList.add("is-ready");
  viewerImg.src=work.image;
  viewerImg.alt=work.alt;

  viewerTitle.textContent=work.title;
  viewerPosition.textContent=`${String(state.current+1).padStart(2,"0")} / ${String(state.filtered.length).padStart(2,"0")}`;
  viewerMeta.textContent=`${work.number} • ${work.year} • ${work.category}`;
  viewerDescription.textContent=work.description||"";
  detailLink.href=work.url;

  const previous=state.filtered[(state.current-1+state.filtered.length)%state.filtered.length];
  const next=state.filtered[(state.current+1)%state.filtered.length];
  [previous,next].filter(Boolean).forEach(item=>{
    const preload=new Image();
    preload.src=item.image;
  });
}

function move(delta){
  if(!state.filtered.length)return;
  state.current=(state.current+delta+state.filtered.length)%state.filtered.length;
  showCurrent();
}

function closeViewer(){
  if(viewer.open)viewer.close();
}

viewer.querySelector(".viewer-close").addEventListener("click",closeViewer);
viewer.querySelector(".viewer-prev").addEventListener("click",()=>move(-1));
viewer.querySelector(".viewer-next").addEventListener("click",()=>move(1));

viewer.addEventListener("click",event=>{
  if(event.target===viewer)closeViewer();
});

viewer.addEventListener("close",()=>{
  document.body.classList.remove("viewer-open");
  viewerImg.src="";
  lastFocusedElement?.focus?.({preventScroll:true});
});

viewer.addEventListener("touchstart",event=>{
  const touch=event.changedTouches[0];
  touchStartX=touch.clientX;
  touchStartY=touch.clientY;
},{passive:true});

viewer.addEventListener("touchend",event=>{
  const touch=event.changedTouches[0];
  const deltaX=touch.clientX-touchStartX;
  const deltaY=touch.clientY-touchStartY;
  if(Math.abs(deltaX)>60&&Math.abs(deltaX)>Math.abs(deltaY)*1.25){
    move(deltaX<0?1:-1);
  }
},{passive:true});

document.addEventListener("keydown",event=>{
  if(!viewer.open)return;
  if(event.key==="Escape")closeViewer();
  if(event.key==="ArrowLeft")move(-1);
  if(event.key==="ArrowRight")move(1);
});

shareButton.addEventListener("click",async()=>{
  const work=state.filtered[state.current];
  const originalText=shareButton.textContent;
  const data={
    title:`${work.title} — Monkey Power`,
    text:work.description,
    url:work.canonical
  };

  try{
    if(navigator.share){
      await navigator.share(data);
    }else{
      await navigator.clipboard.writeText(work.canonical);
      shareButton.textContent="Link copied";
      setTimeout(()=>shareButton.textContent=originalText,1600);
    }
  }catch(error){
    if(error.name!=="AbortError")console.error(error);
  }
});

filters.forEach(button=>button.addEventListener("click",()=>{
  filters.forEach(item=>{
    const active=item===button;
    item.classList.toggle("is-active",active);
    item.setAttribute("aria-pressed",String(active));
  });
  state.filter=button.dataset.filter;
  applyFilters();
}));

searchInput.addEventListener("input",event=>{
  state.query=event.target.value;
  searchClear.hidden=!state.query;
  clearTimeout(searchTimer);
  searchTimer=setTimeout(()=>applyFilters(),120);
});

searchInput.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&searchInput.value){
    clearSearch();
  }
});

searchClear.addEventListener("click",clearSearch);

function clearSearch(){
  searchInput.value="";
  state.query="";
  searchClear.hidden=true;
  applyFilters();
  searchInput.focus();
}

document.querySelector(".search-toggle").addEventListener("click",()=>{
  document.querySelector("#gallery").scrollIntoView({behavior:"smooth"});
  setTimeout(()=>searchInput.focus(),420);
});

function escapeHtml(value){
  return String(value).replace(/[&<>"']/g,char=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[char]));
}

boot();
