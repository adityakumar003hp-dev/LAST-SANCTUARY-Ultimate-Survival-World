import React, { useEffect, useMemo, useState } from 'react';
import { SurvivorDialogue } from '../engine/SurvivorRescueManager';

interface Props { dialogue: SurvivorDialogue | null; onClose:()=>void; onChoice:(id:string,choice:string)=>void; }
type ChatLine = { from: 'you' | 'friend'; text: string };

function friendReply(friendId: string, text: string) {
  const value = text.toLowerCase();
  if (/water|food|suppl|medical|health/.test(value)) {
    if (friendId === 'maya') return 'I can help check medical supplies and organise a safe recovery plan.';
    if (friendId === 'chloe') return 'I can check the equipment and supply systems. Let’s make a practical plan.';
    return 'We’ll check what we have and decide what the group needs first.';
  }
  if (/train|rail|station/.test(value)) return 'We should check the station and track conditions before travelling.';
  if (/zombie|infect|danger|safe/.test(value)) return 'Stay alert, keep a safe route behind us, and do not split up unnecessarily.';
  if (/thank|thanks/.test(value)) return 'You’re welcome. We are in this together.';
  if (friendId === 'marcus') return 'I hear you. Let’s think it through and decide our next step together.';
  if (friendId === 'chloe') return 'I can look into that. Give me a moment to think through the practical details.';
  return 'I understand. Let’s take it one step at a time.';
}

export function DialogueModal({dialogue,onClose,onChoice}:Props){
 const [reply,setReply]=useState('');
 const [chatMode,setChatMode]=useState(false);
 const [message,setMessage]=useState('');
 const [chatLines,setChatLines]=useState<ChatLine[]>([]);
 const [choices,setChoices]=useState<string[]>([]);
 const isFriendMenu = Boolean(dialogue?.id.startsWith('friend_'));
 const friendId = dialogue?.id.startsWith('friend_') ? dialogue.id.slice(7) : '';
 const storageKey = useMemo(()=>dialogue ? `lsr_friend_chat_${dialogue.id}` : '',[dialogue?.id]);

 useEffect(()=>{
  setReply(''); setChatMode(false); setMessage('');
  if(!dialogue){setChoices([]);setChatLines([]);return;}
  setChoices([...dialogue.choices]);
  if(dialogue.id.startsWith('friend_')){
   try { const saved=localStorage.getItem(`lsr_friend_chat_${dialogue.id}`); setChatLines(saved?JSON.parse(saved):[]); }
   catch { setChatLines([]); }
  } else setChatLines([]);
 },[dialogue?.id]);
 if(!dialogue)return null;

 const choose=(choice:string)=>{
  if(choice==='End conversation'){onClose();return;}
  if(choice==='Unfriend' && !window.confirm(`Remove ${dialogue.name} from your friend list? They will remain in the world.`))return;
  onChoice(dialogue.id,choice);
  if(choice==='Chat'){setChatMode(true);return;}
  if(choice==='Dance'){
   setChoices(old=>old.includes('Stop Dance')?old:[...old,'Stop Dance']);
   setReply(`${dialogue.name} started dancing. Select Stop Dance when finished.`);return;
  }
  if(choice==='Stop Dance'){
   setChoices(old=>old.filter(x=>x!=='Stop Dance'));
   setReply(`${dialogue.name} stopped dancing.`);return;
  }
  if(choice==='Friend'){setChoices(old=>old.map(x=>x==='Friend'?'Unfriend':x));setReply(`${dialogue.name} was added to your friend list.`);return;}
  if(choice==='Unfriend'){setChoices(old=>old.map(x=>x==='Unfriend'?'Friend':x));setReply(`${dialogue.name} was removed from your friend list. They remain in the world.`);return;}
  if(choice==='Follow'){setChoices(old=>old.map(x=>x==='Follow'?'Unfollow':x));setReply(`${dialogue.name} is now following you.`);return;}
  if(choice==='Unfollow'){setChoices(old=>old.map(x=>x==='Unfollow'?'Follow':x));setReply(`${dialogue.name} will resume independent behaviour.`);return;}
  if(choice==='Handshake')setReply(`${dialogue.name} returned your handshake.`);
  else if(choice==='Clap')setReply(`${dialogue.name} clapped along with you.`);
  else if(choice==='Hug')setReply(`${dialogue.name} shared a friendly hug.`);
  else if(choice==='Drive')setReply(`${dialogue.name} is ready to ride with you. Enter a vehicle to take your friend along.`);
  else if(choice==='Ask what happened')setReply(`${dialogue.name}: ${dialogue.lines[0]} I can share more once we are somewhere safe.`);
  else if(choice==='Ask about nearby resources')setReply('Look for marked supply caches, clean water sources and field stations. Check the map as you explore.');
  else if(choice==='Ask about the area')setReply('The region changes quickly. Watch the terrain, weather and wildlife before choosing your route.');
  else if(choice==='I am escorting you to safety')setReply('Stay close. I will follow your route back to the sanctuary.');
  else setReply('We should keep moving.');
 };
 const sendChat=()=>{
  const text=message.trim(); if(!text)return;
  const next:ChatLine[]=[...chatLines,{from:'you',text},{from:'friend',text:friendReply(friendId,text)}];
  setChatLines(next); setMessage('');
  try{localStorage.setItem(storageKey,JSON.stringify(next.slice(-80)));}catch{/* Storage may be unavailable in private browsing. */}
 };

 return <div className="fixed inset-0 z-[var(--z-dialogue,50)] flex items-center justify-center bg-black/85 p-3 sm:p-4" onMouseDown={onClose}>
  <div className="w-full max-w-lg max-h-[calc(100dvh-2rem)] flex flex-col rounded-2xl border border-emerald-700/60 bg-neutral-950 p-4 sm:p-5 text-neutral-100 shadow-2xl overflow-hidden animate-in zoom-in-95" onMouseDown={e=>e.stopPropagation()}>
   <div className="flex items-center justify-between gap-3 shrink-0 border-b border-white/10 pb-3">
    <div className="flex min-w-0 items-center gap-3">
     <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-emerald-400/40 bg-gradient-to-br from-emerald-700 to-slate-800 text-sm font-black text-white shadow-lg" aria-label={`${dialogue.name} portrait`}>{dialogue.name.split(' ').map(part=>part[0]).slice(0,2).join('')}</div>
     <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400">{isFriendMenu?'Friend interaction':'Survivor contact'} · {dialogue.role}</p><h2 className="mt-0.5 truncate text-xl sm:text-2xl font-black">{dialogue.name}</h2></div>
    </div>
    <button onClick={onClose} className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs sm:text-sm font-bold active:scale-95 transition-all">Close</button>
   </div>
   {chatMode ? <>
    <div className="my-3 flex-1 min-h-0 overflow-y-auto space-y-2 pr-1" aria-live="polite">
     {chatLines.length===0&&<p className="rounded-xl bg-white/5 p-3 text-sm text-neutral-300">Start a conversation with {dialogue.name}.</p>}
     {chatLines.map((line,i)=><div key={i} className={`max-w-[88%] rounded-xl p-3 text-sm ${line.from==='you'?'ml-auto bg-emerald-900/60 text-emerald-50':'mr-auto bg-white/10 text-neutral-100'}`}><p className="mb-1 text-[9px] font-bold uppercase tracking-wider opacity-60">{line.from==='you'?'You':dialogue.name}</p>{line.text}</div>)}
    </div>
    <form className="flex gap-2 border-t border-white/10 pt-3" onSubmit={e=>{e.preventDefault();sendChat();}}><input value={message} onChange={e=>setMessage(e.target.value)} maxLength={300} placeholder={`Message ${dialogue.name}…`} className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-3 text-sm outline-none focus:border-emerald-500"/><button type="submit" className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white">Send</button></form>
    <button onClick={()=>setChatMode(false)} className="mt-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold">Back to friend actions</button>
   </> : <>
    <div className="my-3 space-y-2.5 overflow-y-auto pr-1"><p className="rounded-xl bg-white/5 p-2.5 text-xs sm:text-sm leading-relaxed text-neutral-200">“{dialogue.lines[0]}”</p>{reply&&<p className="rounded-xl border border-emerald-700/40 bg-emerald-950/30 p-2.5 text-xs sm:text-sm leading-relaxed text-emerald-100">{reply}</p>}</div>
    <div className="grid grid-cols-2 gap-2 shrink-0 pt-2 border-t border-white/10">{choices.map(choice=><button key={choice} onClick={()=>choose(choice)} className={`rounded-xl border px-3 py-3 text-left text-xs sm:text-sm font-semibold active:scale-[.98] transition-all ${choice==='Unfriend'?'border-rose-700/50 bg-rose-950/30 hover:bg-rose-900/50':'border-emerald-700/50 bg-emerald-950/40 hover:bg-emerald-900/60'}`}>{choice}</button>)}</div>
   </>}
   {dialogue.rescued&&!isFriendMenu&&<p className="mt-2 text-xs text-emerald-300 shrink-0">This survivor has already been rescued.</p>}
  </div>
 </div>;
}
