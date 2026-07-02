import React, { useState, useEffect } from 'react';
import { Calendar, Flame, Trophy, CheckCircle2 } from 'lucide-react';
import { CheckInStatus } from '../types';

interface CheckInProps {
  username: string;
}

export default function CheckIn({ username }: CheckInProps) {
  const [status, setStatus] = useState<CheckInStatus>({
    lastCheckInDate: null,
    streak: 0,
    totalCheckIns: 0,
  });
  const [checkedToday, setCheckedToday] = useState(false);
  const [justChecked, setJustChecked] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(`checkin_${username}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CheckInStatus;
        setStatus(parsed);
        
        // Check if last check-in was today
        const todayStr = new Date().toISOString().split('T')[0];
        if (parsed.lastCheckInDate === todayStr) {
          setCheckedToday(true);
        }
      } catch (e) {
        console.error("Failed to parse checkin status", e);
      }
    } else {
      // Initialize if first time
      setStatus({
        lastCheckInDate: null,
        streak: 0,
        totalCheckIns: 0,
      });
      setCheckedToday(false);
    }
  }, [username]);

  const handleCheckIn = () => {
    if (checkedToday) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    let newStreak = 1;
    if (status.lastCheckInDate === yesterdayStr) {
      newStreak = status.streak + 1;
    } else if (status.lastCheckInDate === todayStr) {
      // Already checked in (safety check)
      return;
    } else {
      // Streak broken or first checkin
      newStreak = 1;
    }

    const newStatus: CheckInStatus = {
      lastCheckInDate: todayStr,
      streak: newStreak,
      totalCheckIns: status.totalCheckIns + 1,
    };

    localStorage.setItem(`checkin_${username}`, JSON.stringify(newStatus));
    setStatus(newStatus);
    setCheckedToday(true);
    setJustChecked(true);

    // Reset confetti celebration notification after 3 seconds
    setTimeout(() => {
      setJustChecked(false);
    }, 3500);
  };

  return (
    <div id="check-in-panel" className="bg-white rounded-3xl p-6 shadow-sm border border-orange-100 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute -right-8 -top-8 w-24 h-24 bg-orange-50 rounded-full opacity-60 pointer-events-none" />
      
      <div className="flex flex-col sm:flex-row md:flex-col xl:flex-row gap-3 sm:items-center md:items-start xl:items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-orange-100 text-orange-600 p-2 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-slate-800">每日打卡</h3>
            <p className="text-xs text-slate-400">坚持打卡，让单词滚瓜烂熟！</p>
          </div>
        </div>

        {checkedToday ? (
          <span className="flex items-center gap-1 bg-green-50 text-green-600 text-xs font-semibold px-3 py-1.5 rounded-full border border-green-100 self-start sm:self-auto md:self-start xl:self-auto">
            <CheckCircle2 className="w-4 h-4" /> 今日已打卡
          </span>
        ) : (
          <span className="bg-amber-50 text-amber-600 text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-100 self-start sm:self-auto md:self-start xl:self-auto">
            今日未打卡
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-3 my-4">
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-2xl flex items-center gap-3 border border-orange-100/50">
          <div className="bg-orange-500 text-white p-2.5 rounded-xl">
            <Flame className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <p className="text-xs text-slate-500">连续打卡</p>
            <p className="font-display font-extrabold text-2xl text-orange-600">
              {status.streak} <span className="text-xs font-normal text-slate-600">天</span>
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-2xl flex items-center gap-3 border border-emerald-100/50">
          <div className="bg-emerald-500 text-white p-2.5 rounded-xl">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">累计打卡</p>
            <p className="font-display font-extrabold text-2xl text-emerald-600">
              {status.totalCheckIns} <span className="text-xs font-normal text-slate-600">天</span>
            </p>
          </div>
        </div>
      </div>

      <button
        id="btn-check-in"
        onClick={handleCheckIn}
        disabled={checkedToday}
        className={`w-full py-3.5 rounded-2xl font-display font-bold text-center transition-all duration-300 ${
          checkedToday
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
        }`}
      >
        {checkedToday ? '今天打卡成功啦！明天下课再来哦' : '点我立即打卡得元气！'}
      </button>

      {justChecked && (
        <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center text-center animate-fade-in p-4">
          <div className="w-14 h-14 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mb-3 animate-bounce">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h4 className="font-display font-extrabold text-xl text-orange-600">打卡成功！能量+100%</h4>
          <p className="text-sm text-slate-500 mt-1">恭喜你，连续打卡达 {status.streak} 天！继续加油！🌟</p>
        </div>
      )}
    </div>
  );
}
