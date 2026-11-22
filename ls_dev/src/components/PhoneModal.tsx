import React, { useState } from 'react';
import { X, MessageSquare, Radio, CloudSun, Battery, Wifi, Bell, ShieldAlert, ArrowLeft } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface PhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  day?: number;
  currentEventId?: string;
}

export const PhoneModal: React.FC<PhoneModalProps> = ({ isOpen, onClose, day = 1, currentEventId }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'messages' | 'news' | 'weather'>('home');

  if (!isOpen) return null;

  const isDay2 = day >= 2 || (currentEventId && currentEventId.startsWith('D2_'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm pointer-events-auto">
      {/* Smartphone Chassis */}
      <div className="relative w-80 h-[560px] bg-slate-950 border-4 border-slate-700 rounded-[40px] shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Notch / Speaker Earbud */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-20 flex items-center justify-center gap-2">
          <div className="w-10 h-1 bg-slate-800 rounded-full" />
          <div className="w-2 h-2 rounded-full bg-cyan-900" />
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-semibold text-slate-400 z-10 bg-slate-950">
          <span>{isDay2 ? '08:05 AM' : '08:15 AM'}</span>
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3 h-3 text-cyan-400" />
            <Battery className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] text-slate-400">{isDay2 ? '68%' : '92%'}</span>
          </div>
        </div>

        {/* Screen Content */}
        <div className="flex-1 overflow-y-auto px-4 py-2 text-xs">
          {activeTab === 'home' && (
            <div className="flex flex-col h-full justify-between pb-4">
              <div className="pt-6 text-center">
                <span className="text-4xl font-extralight text-slate-100 tracking-tight">{isDay2 ? '08:05' : '08:15'}</span>
                <p className="text-xs text-cyan-400 font-medium mt-1">
                  {isDay2 ? 'Sunday · October 15 (DAY 2)' : 'Saturday · October 14 (DAY 1)'}
                </p>
                <div className={`mt-4 p-3 rounded-2xl flex items-center gap-3 text-left border ${isDay2 ? 'bg-red-950/80 border-red-600/50 text-red-200' : 'bg-slate-900/80 border-slate-800 text-slate-300'}`}>
                  <div className={`p-2 rounded-xl ${isDay2 ? 'bg-red-900 text-red-300' : 'bg-amber-950 border border-amber-600/50 text-amber-400'}`}>
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <span className={`text-[11px] font-bold ${isDay2 ? 'text-red-400' : 'text-amber-300'}`}>
                      {isDay2 ? 'EAS CIVIC EMERGENCY ALERT' : 'Oakridge Dispatch Notice'}
                    </span>
                    <p className="text-[10px] text-slate-400">
                      {isDay2 ? 'Critical bolide descent detected over Sector 4. Take shelter!' : 'Unidentified celestial body detected in deep space.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* App Icon Grid */}
              <div className="grid grid-cols-3 gap-4 px-2 py-6">
                <button
                  onClick={() => {
                    soundEngine.playUIClick();
                    setActiveTab('messages');
                  }}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className="w-12 h-12 bg-emerald-600 group-hover:bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all relative">
                    <MessageSquare className="w-6 h-6" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white">3</span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-300">Messages</span>
                </button>

                <button
                  onClick={() => {
                    soundEngine.playUIClick();
                    setActiveTab('news');
                  }}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all relative ${isDay2 ? 'bg-rose-600 group-hover:bg-rose-500 animate-pulse' : 'bg-rose-600 group-hover:bg-rose-500'}`}>
                    <Radio className="w-6 h-6" />
                    {isDay2 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full text-[9px] font-bold flex items-center justify-center text-slate-900">!</span>}
                  </div>
                  <span className="text-[11px] font-medium text-slate-300">{isDay2 ? 'Emergency' : 'Broadcast'}</span>
                </button>

                <button
                  onClick={() => {
                    soundEngine.playUIClick();
                    setActiveTab('weather');
                  }}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className="w-12 h-12 bg-cyan-600 group-hover:bg-cyan-500 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all">
                    <CloudSun className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-300">Weather</span>
                </button>
              </div>

              {/* Emergency Close Bar */}
              <div className="text-center">
                <button
                  onClick={() => {
                    soundEngine.playUIClick();
                    onClose();
                  }}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-800"
                >
                  Put Phone Down
                </button>
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <button
                  onClick={() => setActiveTab('home')}
                  className="flex items-center gap-1 text-cyan-400 font-medium"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <span className="font-bold text-slate-200">Chat Threads</span>
                <div className="w-4" />
              </div>

              {/* Thread 1: Marcus */}
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100">Marcus Cole</span>
                  <span className="text-[10px] text-slate-500">{isDay2 ? '08:01 AM' : '08:02 AM'}</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  {isDay2
                    ? '“Are you watching the news?! Turn on the TV—everyone is heading to the apartment right now!”'
                    : '“Don\'t sleep in! Chloe and Maya are meeting us at Corner Roast Cafe at 9 sharp.”'}
                </p>
              </div>

              {/* Thread 2: Chloe */}
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100">Chloe Miller</span>
                  <span className="text-[10px] text-slate-500">{isDay2 ? '07:58 AM' : '07:45 AM'}</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  {isDay2
                    ? '“Shortwave telemetry is screaming. High-density entry trajectory right over the ridge. We need high ground to observe.”'
                    : '“Checked the ham radio repeater on Pine Ridge. Power fluctuating, but should hold for our hike.”'}
                </p>
              </div>

              {/* Thread 3: Dr. Maya Lin */}
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100">Dr. Maya Lin</span>
                  <span className="text-[10px] text-slate-500">{isDay2 ? '07:52 AM' : 'Yesterday'}</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  {isDay2
                    ? '“Sirens started down at the hospital. Packing emergency triage kit and heading to you. Stay together!”'
                    : '“Packed the field first-aid supplies and clean water rations. See you all at breakfast!”'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'news' && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <button
                  onClick={() => setActiveTab('home')}
                  className="flex items-center gap-1 text-cyan-400 font-medium"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <span className="font-bold text-slate-200">{isDay2 ? 'Emergency Alert Network' : 'Local Broadcast'}</span>
                <div className="w-4" />
              </div>

              {isDay2 ? (
                <div className="p-3 bg-rose-950/60 border border-rose-500 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider block">
                    CIVILIAN EVACUATION ORDER · LEVEL 4
                  </span>
                  <h4 className="font-bold text-slate-100 text-xs">
                    HIGH-DENSITY BOLIDE IMPACT TRAJECTORY: SECTOR 4
                  </h4>
                  <p className="text-[11px] text-rose-100 leading-relaxed">
                    A celestial fragment has entered terminal descent over Ridge Valley. Seismic and atmospheric shockwave anticipated. All municipal districts evacuate low ground immediately.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                    Oakridge Astronomical Dispatch
                  </span>
                  <h4 className="font-bold text-slate-100 text-xs">
                    Unidentified Celestial Object Passing Inner Solar Orbit
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Observatories confirm tracking data on a deep space celestial body. Expected to safely pass Earth’s orbit. Atmospheric monitoring stations operating normally.
                  </p>
                </div>
              )}

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <span className="text-[10px] font-mono text-cyan-400 block mb-1">Civilian Advisory</span>
                <p className="text-[11px] text-slate-300">
                  {isDay2
                    ? 'Emergency shelters 01–12 active. Medical response teams mobilized to Valley Outpost.'
                    : 'Municipal water and electric services operating nominally across sectors 1 to 4.'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'weather' && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <button
                  onClick={() => setActiveTab('home')}
                  className="flex items-center gap-1 text-cyan-400 font-medium"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <span className="font-bold text-slate-200">Weather Radar</span>
                <div className="w-4" />
              </div>

              <div className="p-4 bg-cyan-950/40 border border-cyan-600/40 rounded-2xl text-center">
                <CloudSun className="w-10 h-10 mx-auto text-amber-300 mb-2" />
                <span className="text-3xl font-bold text-slate-100">72°F</span>
                <p className="text-xs text-cyan-300 font-medium mt-1">Partly Cloudy · Mild Winds</p>
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-cyan-800/40 text-[11px] text-slate-300">
                  <div>Humidity: 48%</div>
                  <div>Barometer: 1012 hPa</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Home Indicator Bar */}
        <div className="pb-3 pt-1 flex justify-center bg-slate-950">
          <button
            onClick={() => setActiveTab('home')}
            className="w-24 h-1 bg-slate-700 hover:bg-cyan-400 rounded-full transition-colors"
          />
        </div>
      </div>
    </div>
  );
};
