import React, { useEffect, useMemo, useState } from 'react';
import { StoryCompanion } from '../types/prologue';
import { soundEngine } from '../utils/audio';

export interface FriendInteractionModalProps {
  friend: StoryCompanion | null;
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: 'Handshake' | 'Clap' | 'Dance' | 'Stop Dance' | 'Follow' | 'Unfollow' | 'Friend' | 'Unfriend') => void;
}

type ChatLine = { from: 'you' | 'friend'; text: string; time: string };

function getFriendReply(friendId: string, text: string): string {
  const value = text.toLowerCase();
  if (/water|clean water|thirst|drink/.test(value)) {
    if (friendId === 'maya') return 'Our clean water reserves are on Floor 4. Always filter rainwater before drinking.';
    if (friendId === 'chloe') return 'The roof tanks and filtration plumbing are holding steady. I can run an inspection.';
    return 'Water is life. Let’s keep our containers filled and check the storage filters.';
  }
  if (/food|hunger|eat|crop|farm/.test(value)) {
    if (friendId === 'chloe') return 'The Floor 4 indoor farm has fresh crops growing. We’ll have a harvest soon.';
    if (friendId === 'maya') return 'Nutrition maintains immune strength. Keep rations balanced between protein and clean water.';
    return 'We have canned provisions and crop beds. Ration wisely until our perimeter is secure.';
  }
  if (/medical|health|hurt|injury|wound|bandage/.test(value)) {
    if (friendId === 'maya') return 'The Floor 2 clinic has trauma beds, IV bags and sterile supplies. Rest on a medical bed if you’re injured.';
    return 'Dr. Maya has the medical station prepped on the second floor. Take no unnecessary risks.';
  }
  if (/power|electric|generator|solar/.test(value)) {
    if (friendId === 'chloe') return 'The rooftop solar panels and basement generator grid provide emergency power. Everything is wired up!';
    return 'The sanctuary power grid is operational. Keep the diesel backup topped off.';
  }
  if (/weapon|gun|ammo|defense|turret|sentry/.test(value)) {
    if (friendId === 'marcus') return 'Both rooftop sentry turrets are online. The Floor 3 armory vault has weapons ready.';
    if (friendId === 'chloe') return 'Turret sensors are synced with the 5km radar in the security center. Watch the monitor.';
    return 'Keep firearms loaded and check ammo counts before opening the main gate.';
  }
  if (/zombie|infected|horde|danger|safe/.test(value)) {
    return 'Stay behind the reinforced compound walls at night. The perimeter gates must remain locked.';
  }
  if (/thank|thanks/.test(value)) {
    return 'Anytime, partner. We’re in this together until the sanctuary is rebuilt.';
  }
  if (friendId === 'marcus') {
    return 'Good call. I’ll coordinate the watch schedule and keep our defenses tight.';
  }
  if (friendId === 'chloe') {
    return 'Understood! I’ll check the diagnostics and make sure all mechanical systems are running smoothly.';
  }
  return 'Stay sharp. Let’s make sure everyone in the sanctuary remains safe and well-supplied.';
}

export const FriendInteractionModal: React.FC<FriendInteractionModalProps> = ({
  friend,
  isOpen,
  onClose,
  onAction,
}) => {
  const [activeTab, setActiveTab] = useState<'actions' | 'chat'>('actions');
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatLine[]>([]);
  const [isDancing, setIsDancing] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const storageKey = useMemo(() => (friend ? `lsr_companion_chat_${friend.id}` : ''), [friend?.id]);

  useEffect(() => {
    if (friend && storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          setChatHistory(JSON.parse(saved));
        } else {
          setChatHistory([
            {
              from: 'friend',
              text: `Hey there! Ready to hold down the sanctuary together. What do you need?`,
              time: 'Just now',
            },
          ]);
        }
      } catch {
        setChatHistory([]);
      }
    }
  }, [friend, storageKey]);

  if (!isOpen || !friend) return null;

  const handleActionClick = (action: 'Handshake' | 'Clap' | 'Dance' | 'Stop Dance' | 'Follow' | 'Unfollow' | 'Friend' | 'Unfriend') => {
    soundEngine.playUIClick();
    if (action === 'Dance') setIsDancing(true);
    if (action === 'Stop Dance') setIsDancing(false);

    let feedback = '';
    if (action === 'Handshake') feedback = `${friend.name} returned your warm handshake.`;
    else if (action === 'Clap') feedback = `${friend.name} cheered and clapped with you!`;
    else if (action === 'Dance') feedback = `${friend.name} joined you in dancing!`;
    else if (action === 'Stop Dance') feedback = `Finished dancing with ${friend.name}.`;
    else if (action === 'Follow') feedback = `${friend.name} is now following your lead.`;
    else if (action === 'Unfollow') feedback = `${friend.name} will guard this position.`;
    else if (action === 'Friend') feedback = `${friend.name} is now registered as a close companion.`;
    else if (action === 'Unfriend') feedback = `${friend.name} removed from close companion list.`;

    setStatusFeedback(feedback);
    onAction(action);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatMessage.trim();
    if (!text) return;

    soundEngine.playUIClick();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const replyText = getFriendReply(friend.id, text);

    const updated: ChatLine[] = [
      ...chatHistory,
      { from: 'you', text, time: timeStr },
      { from: 'friend', text: replyText, time: timeStr },
    ];

    setChatHistory(updated);
    setChatMessage('');

    try {
      localStorage.setItem(storageKey, JSON.stringify(updated.slice(-60)));
    } catch {}
  };

  const getRoleBadgeColor = () => {
    if (friend.id === 'marcus') return 'from-blue-600 to-indigo-800 text-blue-200 border-blue-500/40';
    if (friend.id === 'chloe') return 'from-amber-600 to-orange-800 text-amber-200 border-amber-500/40';
    return 'from-emerald-600 to-teal-800 text-emerald-200 border-emerald-500/40';
  };

  const initials = friend.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl border border-neutral-700 bg-neutral-950 text-neutral-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with portrait and metadata */}
        <div className="flex items-center justify-between gap-3 border-b border-neutral-800 bg-neutral-900/60 p-4 sm:p-5">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${getRoleBadgeColor()} border text-lg font-black tracking-wider shadow-lg`}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  {friend.title}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    friend.isFollowing
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                  }`}
                >
                  {friend.isFollowing ? 'Following' : 'Stationed'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white truncate">{friend.name}</h2>
              <p className="text-xs text-neutral-400">
                Role: <span className="text-neutral-200 font-semibold">{friend.role}</span> · Trust:{' '}
                <span className="text-amber-400 font-bold">{friend.relationshipScore}%</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundEngine.playUIClick();
              onClose();
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Tab switcher: Quick Actions vs Direct Chat */}
        <div className="grid grid-cols-2 border-b border-neutral-800 bg-neutral-900/40 p-1.5 gap-1.5 text-xs font-bold uppercase tracking-wider">
          <button
            onClick={() => {
              soundEngine.playUIClick();
              setActiveTab('actions');
            }}
            className={`py-2.5 rounded-xl transition-all ${
              activeTab === 'actions'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            Social Actions
          </button>
          <button
            onClick={() => {
              soundEngine.playUIClick();
              setActiveTab('chat');
            }}
            className={`py-2.5 rounded-xl transition-all ${
              activeTab === 'chat'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            Direct Chat
          </button>
        </div>

        {/* Body */}
        {activeTab === 'actions' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {statusFeedback && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 px-3.5 py-2.5 text-xs sm:text-sm text-emerald-200 leading-snug">
                {statusFeedback}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {/* 1. Handshake */}
              <button
                onClick={() => handleActionClick('Handshake')}
                className="flex flex-col items-start gap-1 rounded-2xl border border-neutral-800 bg-neutral-900/80 hover:bg-neutral-800/90 active:scale-[0.98] p-3.5 text-left transition-all group"
              >
                <div className="flex items-center gap-2 text-blue-400">
                  <span className="text-xl">🤝</span>
                  <span className="text-xs font-black uppercase tracking-wider text-neutral-200 group-hover:text-white">
                    Handshake
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-tight">
                  Greet {friend.name} with a respectful survivor handshake.
                </p>
              </button>

              {/* 2. Clap */}
              <button
                onClick={() => handleActionClick('Clap')}
                className="flex flex-col items-start gap-1 rounded-2xl border border-neutral-800 bg-neutral-900/80 hover:bg-neutral-800/90 active:scale-[0.98] p-3.5 text-left transition-all group"
              >
                <div className="flex items-center gap-2 text-amber-400">
                  <span className="text-xl">👏</span>
                  <span className="text-xs font-black uppercase tracking-wider text-neutral-200 group-hover:text-white">
                    Clap
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-tight">
                  Cheer and applaud your group accomplishments.
                </p>
              </button>

              {/* 3. Dance / Stop Dance */}
              <button
                onClick={() => handleActionClick(isDancing ? 'Stop Dance' : 'Dance')}
                className={`flex flex-col items-start gap-1 rounded-2xl border active:scale-[0.98] p-3.5 text-left transition-all group ${
                  isDancing
                    ? 'border-purple-500/50 bg-purple-950/50 hover:bg-purple-900/60'
                    : 'border-neutral-800 bg-neutral-900/80 hover:bg-neutral-800/90'
                }`}
              >
                <div className="flex items-center gap-2 text-purple-400">
                  <span className="text-xl">💃</span>
                  <span className="text-xs font-black uppercase tracking-wider text-neutral-200 group-hover:text-white">
                    {isDancing ? 'Stop Dance' : 'Dance'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-tight">
                  {isDancing
                    ? `Click to stop dancing with ${friend.name}.`
                    : `Celebrate survival with an animated dance rhythm.`}
                </p>
              </button>

              {/* 4. Follow / Unfollow */}
              <button
                onClick={() => handleActionClick(friend.isFollowing ? 'Unfollow' : 'Follow')}
                className={`flex flex-col items-start gap-1 rounded-2xl border active:scale-[0.98] p-3.5 text-left transition-all group ${
                  friend.isFollowing
                    ? 'border-emerald-500/50 bg-emerald-950/50 hover:bg-emerald-900/60'
                    : 'border-neutral-800 bg-neutral-900/80 hover:bg-neutral-800/90'
                }`}
              >
                <div className="flex items-center gap-2 text-emerald-400">
                  <span className="text-xl">{friend.isFollowing ? '🛑' : '👣'}</span>
                  <span className="text-xs font-black uppercase tracking-wider text-neutral-200 group-hover:text-white">
                    {friend.isFollowing ? 'Station Here' : 'Follow Me'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-tight">
                  {friend.isFollowing
                    ? `Order ${friend.name} to hold their ground.`
                    : `Have ${friend.name} accompany you in formation.`}
                </p>
              </button>

              {/* 5. Friend / Unfriend */}
              <button
                onClick={() => handleActionClick(friend.isFriend ? 'Unfriend' : 'Friend')}
                className={`flex flex-col items-start gap-1 rounded-2xl border active:scale-[0.98] p-3.5 text-left transition-all group ${
                  friend.isFriend
                    ? 'border-rose-800/40 bg-neutral-900/80 hover:bg-rose-950/30'
                    : 'border-emerald-600/40 bg-emerald-950/30 hover:bg-emerald-900/40'
                }`}
              >
                <div className="flex items-center gap-2 text-rose-400">
                  <span className="text-xl">{friend.isFriend ? '💔' : '❤️'}</span>
                  <span className="text-xs font-black uppercase tracking-wider text-neutral-200 group-hover:text-white">
                    {friend.isFriend ? 'Unfriend' : 'Add Friend'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-tight">
                  {friend.isFriend
                    ? `Remove ${friend.name} from your trusted inner circle.`
                    : `Bond with ${friend.name} to boost companion synergy.`}
                </p>
              </button>

              {/* 6. Chat */}
              <button
                onClick={() => {
                  soundEngine.playUIClick();
                  setActiveTab('chat');
                }}
                className="flex flex-col items-start gap-1 rounded-2xl border border-neutral-800 bg-neutral-900/80 hover:bg-neutral-800/90 active:scale-[0.98] p-3.5 text-left transition-all group"
              >
                <div className="flex items-center gap-2 text-cyan-400">
                  <span className="text-xl">💬</span>
                  <span className="text-xs font-black uppercase tracking-wider text-neutral-200 group-hover:text-white">
                    Open Chat
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-tight">
                  Ask about supplies, weapons, medical aid, or base defenses.
                </p>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-[300px] max-h-[500px] p-4 sm:p-5">
            {/* Conversation Log */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mb-3">
              {chatHistory.map((line, idx) => (
                <div
                  key={idx}
                  className={`max-w-[85%] rounded-2xl p-3 text-xs sm:text-sm leading-relaxed ${
                    line.from === 'you'
                      ? 'ml-auto bg-blue-600/90 text-white'
                      : 'mr-auto bg-neutral-800/90 text-neutral-200 border border-neutral-700/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1 opacity-70 text-[9px] uppercase font-bold tracking-wider">
                    <span>{line.from === 'you' ? 'You' : friend.name}</span>
                    <span>{line.time}</span>
                  </div>
                  <p>{line.text}</p>
                </div>
              ))}
            </div>

            {/* Chat Input Form */}
            <form onSubmit={handleSendChat} className="flex gap-2 shrink-0">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder={`Ask ${friend.name} about weapons, food, clinic, water...`}
                maxLength={200}
                className="flex-1 rounded-xl border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition-colors cursor-pointer"
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
