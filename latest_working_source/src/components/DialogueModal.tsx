import React, { useEffect, useState } from 'react';
import { SurvivorDialogue } from '../engine/SurvivorRescueManager';

interface Props { dialogue: SurvivorDialogue | null; onClose:()=>void; onChoice:(id:string,choice:string)=>void; }
export function DialogueModal({dialogue,onClose,onChoice}:Props){
 const [reply,setReply]=useState('');
 useEffect(()=>{setReply('');},[dialogue?.id]);
 if(!dialogue)return null;
 const choose=(choice:string)=>{
  onChoice(dialogue.id,choice);
  if(choice==='End conversation'){onClose();return;}
  if(choice==='Help me reach the sanctuary'){onClose();return;}
  if(choice==='Ask what happened')setReply(`${dialogue.name}: ${dialogue.lines[0]} I can share more once we are somewhere safe.`);
  else if(choice==='Ask about nearby resources')setReply('Look for marked supply caches, clean water sources and abandoned field stations. Check the map as you explore.');
  else if(choice==='Ask about the area')setReply('The region changes quickly. Watch the terrain, weather and wildlife before choosing your route.');
  else if(choice==='Handshake')setReply(`${dialogue.name} greeted you with a handshake.`);
  else if(choice==='Hug')setReply(`${dialogue.name} shared a friendly hug.`);
  else if(choice==='Dance')setReply(`${dialogue.name} joined you for a dance.`);
  else if(choice==='Drive')setReply(`${dialogue.name} is ready to ride with you. Enter a vehicle to take your friend along.`);
  else if(choice==='Follow')setReply(`${dialogue.name} is now following you.`);
  else if(choice==='Unfollow')setReply(`${dialogue.name} will stay here.`);
  else if(choice==='I am escorting you to safety')setReply('Stay close. I will follow your route back to the sanctuary.');
  else setReply('We should keep moving.');
 };
 return <div className="fixed inset-0 z-[var(--z-dialogue,50)] flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-sm" onMouseDown={onClose}>
  <div className="w-full max-w-lg max-h-[calc(100dvh-2rem)] flex flex-col rounded-2xl border border-emerald-700/60 bg-neutral-950 p-4 sm:p-5 text-neutral-100 shadow-2xl overflow-hidden animate-in zoom-in-95" onMouseDown={e=>e.stopPropagation()}>
   <div className="flex items-start justify-between gap-3 shrink-0 border-b border-white/10 pb-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400">Survivor contact · {dialogue.role}</p><h2 className="mt-0.5 text-xl sm:text-2xl font-black">{dialogue.name}</h2></div><button onClick={onClose} className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs sm:text-sm font-bold active:scale-95 transition-all">Close</button></div>
   <div className="my-3 space-y-2.5 overflow-y-auto pr-1">{dialogue.lines.map((line,i)=><p key={i} className="rounded-xl bg-white/5 p-2.5 text-xs sm:text-sm leading-relaxed text-neutral-200">“{line}”</p>)}{reply&&<p className="rounded-xl border border-emerald-700/40 bg-emerald-950/30 p-2.5 text-xs sm:text-sm leading-relaxed text-emerald-100">{reply}</p>}</div>
   <div className="grid gap-2 shrink-0 pt-2 border-t border-white/10">{dialogue.choices.map(choice=><button key={choice} onClick={()=>choose(choice)} className="rounded-xl border border-emerald-700/50 bg-emerald-950/40 px-3.5 py-2.5 text-left text-xs sm:text-sm font-semibold hover:bg-emerald-900/60 active:scale-98 transition-all">{choice}</button>)}</div>
   {dialogue.rescued&&<p className="mt-2 text-xs text-emerald-300 shrink-0">This survivor has already been rescued.</p>}
  </div>
 </div>;
}
