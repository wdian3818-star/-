import React, { useState, useEffect } from 'react';
import { Award, Zap, BookOpen, RefreshCw } from 'lucide-react';
import { LeaderboardEntry } from '../types';

interface LeaderboardProps {
  refreshTrigger: number;
}

export default function Leaderboard({ refreshTrigger }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/leaderboard');
      const data = await response.json();
      if (data.success) {
        setEntries(data.leaderboard);
      } else {
        setError("获取排行榜失败");
      }
    } catch (err) {
      console.error(err);
      setError("连接服务器失败，展示离线数据");
      // Fallback offline preloads
      setEntries([
        { username: "中考学霸小明", score: 100, date: "2026-07-01", quizType: "单词测试" },
        { username: "语法小达人小红", score: 100, date: "2026-07-01", quizType: "句子语法测试" },
        { username: "逆袭黑马小林", score: 80, date: "2026-07-01", quizType: "单词测试" },
        { username: "天天向上阿杰", score: 80, date: "2026-07-01", quizType: "句子语法测试" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [refreshTrigger]);

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0:
        return {
          bg: "bg-amber-50 border-amber-200",
          badge: "bg-amber-500 text-white font-black",
          crown: "👑",
          text: "text-amber-800"
        };
      case 1:
        return {
          bg: "bg-slate-50 border-slate-200",
          badge: "bg-slate-400 text-white font-black",
          crown: "🥈",
          text: "text-slate-700"
        };
      case 2:
        return {
          bg: "bg-orange-50 border-orange-100",
          badge: "bg-orange-400 text-white font-black",
          crown: "🥉",
          text: "text-orange-700"
        };
      default:
        return {
          bg: "bg-white border-slate-100 hover:bg-slate-50/50",
          badge: "bg-slate-100 text-slate-500 font-semibold",
          crown: "",
          text: "text-slate-600"
        };
    }
  };

  return (
    <div id="leaderboard-panel" className="bg-white rounded-3xl p-6 shadow-sm border border-indigo-100 overflow-hidden relative">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-100 text-indigo-600 p-2 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-slate-800 animate-pulse-gentle">元气排行榜</h3>
            <p className="text-xs text-slate-400">中考学神集结地，看看谁的分数最高！</p>
          </div>
        </div>

        <button
          onClick={fetchLeaderboard}
          title="刷新排行"
          className="p-2 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-sm">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
          <span>正在排兵布阵中...</span>
        </div>
      ) : error && entries.length === 0 ? (
        <div className="py-8 text-center text-sm text-rose-500 bg-rose-50 rounded-2xl border border-rose-100">
          {error}
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
          {entries.map((entry, index) => {
            const style = getRankStyle(index);
            return (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 ${style.bg}`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank Badge */}
                  <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs ${style.badge}`}>
                    {style.crown ? style.crown : index + 1}
                  </div>
                  
                  {/* Username & Tag */}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-semibold text-sm ${style.text}`}>{entry.username}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                        <BookOpen className="w-2.5 h-2.5" />
                        {entry.quizType}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">{entry.date}</span>
                  </div>
                </div>

                {/* Score */}
                <div className="flex items-center gap-1">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="font-display font-extrabold text-indigo-600 text-lg">{entry.score}</span>
                  <span className="text-xs text-slate-400">分</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {entries.length === 0 && !loading && (
        <div className="py-8 text-center text-sm text-slate-400">
          排行榜空空如也，快去测试拔得头筹吧！🚀
        </div>
      )}
    </div>
  );
}
