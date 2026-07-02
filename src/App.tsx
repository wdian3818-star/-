import React, { useState, useEffect } from 'react';
import { BookOpen, Sparkles, Trophy, Award, Calendar, Flame, AlertCircle, Edit2, Check, User, Heart, Sparkle } from 'lucide-react';
import { WordQuestion, SentenceQuestion } from './types';
import CheckIn from './components/CheckIn';
import Leaderboard from './components/Leaderboard';
import WordQuiz from './components/WordQuiz';
import SentenceQuiz from './components/SentenceQuiz';
import QuizResult from './components/QuizResult';

export default function App() {
  const [username, setUsername] = useState<string>("初中狂飙学霸");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  
  const [view, setView] = useState<'home' | 'quiz' | 'result'>('home');
  const [quizType, setQuizType] = useState<'word' | 'sentence' | 'phrase'>('word');
  
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Question lists fetched from backend
  const [wordQuestions, setWordQuestions] = useState<WordQuestion[]>([]);
  const [sentenceQuestions, setSentenceQuestions] = useState<SentenceQuestion[]>([]);

  // Answers recorded
  const [wordAnswers, setWordAnswers] = useState<{ question: WordQuestion; selectedAnswer: string; isCorrect: boolean }[]>([]);
  const [sentenceAnswers, setSentenceAnswers] = useState<{ question: SentenceQuestion; selectedAnswer: string; isCorrect: boolean }[]>([]);

  // Trigger to reload Leaderboard
  const [leaderboardTrigger, setLeaderboardTrigger] = useState(0);

  // Stats Counters
  const [heartsCount, setHeartsCount] = useState(5);
  const [diamondCount, setDiamondCount] = useState(1280);

  // Custom quiz exit confirmation modal state
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Mistakes state
  const [wordMistakes, setWordMistakes] = useState<WordQuestion[]>([]);
  const [phraseMistakes, setPhraseMistakes] = useState<WordQuestion[]>([]);
  const [sentenceMistakes, setSentenceMistakes] = useState<SentenceQuestion[]>([]);
  const [isReviewMode, setIsReviewMode] = useState(false);

  // Fetch user mistakes from database
  const fetchUserMistakes = async (name: string) => {
    try {
      const res = await fetch(`/api/wrong-book?username=${encodeURIComponent(name)}`).then(r => r.json());

      if (res.success) {
        setWordMistakes(res.wordMistakes || []);
        setPhraseMistakes(res.phraseMistakes || []);
        setSentenceMistakes(res.sentenceMistakes || []);
        localStorage.setItem('english_power_word_mistakes', JSON.stringify(res.wordMistakes || []));
        localStorage.setItem('english_power_phrase_mistakes', JSON.stringify(res.phraseMistakes || []));
        localStorage.setItem('english_power_sentence_mistakes', JSON.stringify(res.sentenceMistakes || []));
      }
    } catch (err) {
      console.error("Failed to fetch mistakes from Firestore:", err);
    }
  };

  // Load username and mistakes from local storage if available
  useEffect(() => {
    const savedName = localStorage.getItem('english_power_username');
    if (savedName) {
      setUsername(savedName);
      fetchUserMistakes(savedName);
    }
    const savedWords = localStorage.getItem('english_power_word_mistakes');
    const savedPhrases = localStorage.getItem('english_power_phrase_mistakes');
    const savedSentences = localStorage.getItem('english_power_sentence_mistakes');
    if (savedWords) setWordMistakes(JSON.parse(savedWords));
    if (savedPhrases) setPhraseMistakes(JSON.parse(savedPhrases));
    if (savedSentences) setSentenceMistakes(JSON.parse(savedSentences));
  }, []);

  const saveUsername = () => {
    const trimmed = tempName.trim();
    if (trimmed) {
      setUsername(trimmed);
      localStorage.setItem('english_power_username', trimmed);
      fetchUserMistakes(trimmed);
    }
    setIsEditingName(false);
  };

  const addMistakes = async (type: 'word' | 'phrase' | 'sentence', items: any[]) => {
    if (items.length === 0) return;

    if (type === 'word') {
      setWordMistakes(prev => {
        const updated = [...prev];
        items.forEach(m => {
          if (!updated.some(x => x.id === m.id)) {
            updated.push(m);
          }
        });
        localStorage.setItem('english_power_word_mistakes', JSON.stringify(updated));
        return updated;
      });
    } else if (type === 'phrase') {
      setPhraseMistakes(prev => {
        const updated = [...prev];
        items.forEach(m => {
          if (!updated.some(x => x.id === m.id)) {
            updated.push(m);
          }
        });
        localStorage.setItem('english_power_phrase_mistakes', JSON.stringify(updated));
        return updated;
      });
    } else if (type === 'sentence') {
      setSentenceMistakes(prev => {
        const updated = [...prev];
        items.forEach(m => {
          if (!updated.some(x => x.id === m.id)) {
            updated.push(m);
          }
        });
        localStorage.setItem('english_power_sentence_mistakes', JSON.stringify(updated));
        return updated;
      });
    }

    // Call backend API to record mistakes in Firestore
    try {
      const activeUser = username || localStorage.getItem('english_power_username') || "访客同学";
      await fetch('/api/mistakes/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: activeUser,
          quizType: type,
          questions: items
        })
      });
    } catch (err) {
      console.error("Failed to add mistakes on server:", err);
    }
  };

  const handleStartReview = (type: 'word' | 'phrase' | 'sentence') => {
    setQuizType(type);
    setIsReviewMode(true);
    setErrorMsg(null);
    
    if (type === 'word') {
      if (wordMistakes.length === 0) return;
      const selected = [...wordMistakes].sort(() => 0.5 - Math.random()).slice(0, 5);
      setWordQuestions(selected);
      setWordAnswers([]);
    } else if (type === 'phrase') {
      if (phraseMistakes.length === 0) return;
      const selected = [...phraseMistakes].sort(() => 0.5 - Math.random()).slice(0, 5);
      setWordQuestions(selected);
      setWordAnswers([]);
    } else if (type === 'sentence') {
      if (sentenceMistakes.length === 0) return;
      const selected = [...sentenceMistakes].sort(() => 0.5 - Math.random()).slice(0, 5);
      setSentenceQuestions(selected);
      setSentenceAnswers([]);
    }
    setView('quiz');
  };

  const handleStartQuiz = async (type: 'word' | 'sentence' | 'phrase') => {
    setQuizType(type);
    setIsReviewMode(false);
    setLoadingQuestions(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/questions?type=${type}`);
      const data = await res.json();
      if (data.success) {
        if (type === 'word' || type === 'phrase') {
          setWordQuestions(data.questions);
          setWordAnswers([]);
        } else {
          setSentenceQuestions(data.questions);
          setSentenceAnswers([]);
        }
        setView('quiz');
      } else {
        setErrorMsg("服务器无法生成题目，请检查数据库配置。");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("无法连接至英语测试服务器，请稍后再试。");
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleWordQuizFinished = async (answers: { question: WordQuestion; selectedAnswer: string; isCorrect: boolean }[]) => {
    setWordAnswers(answers);
    const score = Math.round((answers.filter(a => a.isCorrect).length / answers.length) * 100);
    // Reward/deduction simulation
    setDiamondCount(prev => prev + score * 2);
    if (score < 60) {
      setHeartsCount(prev => Math.max(1, prev - 1));
    } else {
      setHeartsCount(prev => Math.min(5, prev + 1));
    }

    const currentType = quizType === 'phrase' ? 'phrase' : 'word';
    const activeUser = username || localStorage.getItem('english_power_username') || "访客同学";

    // Call submit endpoint on the backend
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: activeUser,
          quizType: currentType,
          answers: answers.map(a => ({
            question: a.question,
            selectedAnswer: a.selectedAnswer
          }))
        })
      }).then(r => r.json());

      if (res.success) {
        // Reload fresh wrong book from server to keep local state fully synchronized!
        fetchUserMistakes(activeUser);
      }
    } catch (err) {
      console.error("Failed to submit results to server:", err);
    }

    setView('result');
  };

  const handleSentenceQuizFinished = async (answers: { question: SentenceQuestion; selectedAnswer: string; isCorrect: boolean }[]) => {
    setSentenceAnswers(answers);
    const score = Math.round((answers.filter(a => a.isCorrect).length / answers.length) * 100);
    setDiamondCount(prev => prev + score * 2);
    if (score < 60) {
      setHeartsCount(prev => Math.max(1, prev - 1));
    } else {
      setHeartsCount(prev => Math.min(5, prev + 1));
    }

    const activeUser = username || localStorage.getItem('english_power_username') || "访客同学";

    // Call submit endpoint on the backend
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: activeUser,
          quizType: 'sentence',
          answers: answers.map(a => ({
            question: a.question,
            selectedAnswer: a.selectedAnswer
          }))
        })
      }).then(r => r.json());

      if (res.success) {
        // Reload fresh wrong book from server to keep local state fully synchronized!
        fetchUserMistakes(activeUser);
      }
    } catch (err) {
      console.error("Failed to submit results to server:", err);
    }

    setView('result');
  };

  const handleLeaderboardSubmit = () => {
    // Increment trigger to refresh leaderboard entries
    setLeaderboardTrigger(prev => prev + 1);
  };

  const handleExitQuiz = () => {
    setShowExitConfirm(true);
  };

  return (
    <div className="min-h-screen bg-[#F0F9FF] text-slate-800 flex flex-col md:flex-row font-sans">
      
      {/* LEFT SIDEBAR - Responsive Collapsible */}
      <aside className="w-full md:w-80 bg-white border-b-4 md:border-b-0 md:border-r-4 border-sky-100 p-6 flex flex-col gap-6 shrink-0">
        
        {/* App Logo Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shadow-sky-200 animate-pulse-gentle">
            ⚡
          </div>
          <div>
            <h1 className="font-display font-black text-xl text-sky-900 leading-tight">英语能量站</h1>
            <p className="text-[10px] text-sky-400 font-bold tracking-widest uppercase">Junior English Power</p>
          </div>
        </div>

        {/* User profile details with name editing */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div className="flex-1 overflow-hidden">
              {isEditingName ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    maxLength={14}
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="w-full bg-white border border-indigo-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-800 font-bold"
                    placeholder={username}
                  />
                  <button onClick={saveUsername} className="p-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors cursor-pointer">
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-sm text-slate-800 truncate" title={username}>{username}</p>
                  <button
                    onClick={() => {
                      setTempName(username);
                      setIsEditingName(true);
                    }}
                    className="text-slate-400 hover:text-indigo-500 cursor-pointer"
                    title="修改昵称"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <p className="text-[10px] text-indigo-500 font-semibold flex items-center gap-0.5 mt-0.5">
                <Sparkle className="w-3 h-3 text-amber-400 fill-amber-400 inline" /> 初中生专属冲关平台
              </p>
            </div>
          </div>
        </div>

        {/* Daily Check-in Panel */}
        <CheckIn username={username} />

        {/* Leaderboard Panel */}
        <Leaderboard refreshTrigger={leaderboardTrigger} />

        {/* Info label */}
        <div className="text-center text-[10px] text-slate-400 mt-auto pt-4 border-t border-slate-100">
          <p>© 2026 英语能量站 • Gemini 幽默精讲版</p>
        </div>
      </aside>

      {/* MAIN CONTENT WORKSPACE */}
      <main className="flex-1 p-6 md:p-10 flex flex-col max-w-5xl mx-auto w-full overflow-y-auto">
        
        {/* Top Header Row */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-display font-black text-slate-900 flex items-center gap-2">
              哈喽，{username}！🚀
            </h2>
            <p className="text-slate-500 text-sm font-medium mt-1">
              今天打算挑战哪个模块？AI 老师已经准备好幽默段子和讲解啦！
            </p>
          </div>
          
          {/* Status Counter Bubbles */}
          <div className="flex gap-3">
            <div className="bg-white px-4 py-2.5 rounded-2xl shadow-sm flex items-center gap-2 border border-slate-100">
              <span className="text-rose-500 animate-pulse" title="能量体力">❤️</span>
              <span className="font-display font-black text-slate-700 text-sm">x{heartsCount}</span>
            </div>
            <div className="bg-white px-4 py-2.5 rounded-2xl shadow-sm flex items-center gap-2 border border-slate-100">
              <span className="text-amber-500" title="获取积分">💎</span>
              <span className="font-display font-black text-slate-700 text-sm">{diamondCount}</span>
            </div>
          </div>
        </header>

        {/* ERROR HANDLER */}
        {errorMsg && (
          <div className="mb-6 bg-rose-50 border border-rose-100 rounded-2xl p-4 flex gap-3 text-rose-700 text-sm items-center">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="font-semibold">{errorMsg}</p>
          </div>
        )}

        {/* LOADING INDICATOR */}
        {loadingQuestions && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-500">
            <div className="w-16 h-16 bg-sky-100 text-sky-500 rounded-full flex items-center justify-center mb-4 animate-spin">
              ⚡
            </div>
            <h4 className="font-display font-bold text-lg text-slate-800">正在为你挑选初中必考真题...</h4>
            <p className="text-sm text-slate-400 mt-1">AI 老师正在梳理考点，马上开始！</p>
          </div>
        )}

        {/* VIEW CONDITIONAL RENDERING */}
        {!loadingQuestions && (
          <>
            {view === 'home' && (
              <div className="space-y-8 flex-1 flex flex-col justify-between">
                
                {/* Mode Select Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                  
                  {/* Vocabulary Card */}
                  <div className="group relative bg-white border-b-8 border-sky-400 rounded-[32px] p-6 flex flex-col items-center justify-between text-center cursor-pointer hover:translate-y-[-4px] transition-all duration-300 shadow-md hover:shadow-lg shadow-sky-100/50">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-sky-50 rounded-full flex items-center justify-center text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                        📖
                      </div>
                      <h3 className="text-xl font-display font-black text-sky-900 mb-1">单词大冒险</h3>
                      <p className="text-slate-500 text-xs mb-4 max-w-[200px] leading-relaxed">
                        看英文选中文，5题一关。快速积累初中大纲必备词汇量！
                      </p>
                    </div>
                    <button
                      id="btn-start-words"
                      onClick={() => handleStartQuiz('word')}
                      className="w-full py-3 bg-sky-500 hover:bg-sky-600 text-white font-display font-black rounded-full text-sm shadow-md shadow-sky-100 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    >
                      立即开始
                    </button>
                  </div>

                  {/* Phrase Card */}
                  <div className="group relative bg-white border-b-8 border-amber-400 rounded-[32px] p-6 flex flex-col items-center justify-between text-center cursor-pointer hover:translate-y-[-4px] transition-all duration-300 shadow-md hover:shadow-lg shadow-amber-100/50">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                        🔗
                      </div>
                      <h3 className="text-xl font-display font-black text-amber-900 mb-1">短语大闯关</h3>
                      <p className="text-slate-500 text-xs mb-4 max-w-[200px] leading-relaxed">
                        精选初中必背短语。具体场景展示并深度区分易混短语！
                      </p>
                    </div>
                    <button
                      id="btn-start-phrases"
                      onClick={() => handleStartQuiz('phrase')}
                      className="w-full py-3 bg-amber-550 hover:bg-amber-650 bg-amber-500 hover:bg-amber-600 text-white font-display font-black rounded-full text-sm shadow-md shadow-amber-100 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    >
                      开始闯关
                    </button>
                  </div>

                  {/* Sentence Card */}
                  <div className="group relative bg-white border-b-8 border-emerald-400 rounded-[32px] p-6 flex flex-col items-center justify-between text-center cursor-pointer hover:translate-y-[-4px] transition-all duration-300 shadow-md hover:shadow-lg shadow-emerald-100/50">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                        🧩
                      </div>
                      <h3 className="text-xl font-display font-black text-emerald-900 mb-1">句法大挑战</h3>
                      <p className="text-slate-500 text-xs mb-4 max-w-[200px] leading-relaxed">
                        连词成句 & 翻译填空。攻克初中动词时态与核心句型！
                      </p>
                    </div>
                    <button
                      id="btn-start-sentences"
                      onClick={() => handleStartQuiz('sentence')}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-display font-black rounded-full text-sm shadow-md shadow-emerald-100 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    >
                      接受挑战
                    </button>
                  </div>

                </div>

                {/* 错题巩固营 section */}
                <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 border-2 border-orange-100 rounded-[32px] p-6 md:p-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                      <h3 className="text-xl md:text-2xl font-display font-black text-amber-950 flex items-center gap-2">
                        <span>📚</span> 专属错题巩固营
                      </h3>
                      <p className="text-amber-800 text-xs md:text-sm font-medium mt-1">
                        自动记录您在练习中答错的题目。反复练习并彻底攻克它们吧！
                      </p>
                    </div>
                    {/* Overall status badge */}
                    <span className="bg-amber-100 text-amber-800 text-xs px-3 py-1.5 rounded-full font-bold self-start sm:self-auto">
                      待消灭：{wordMistakes.length + phraseMistakes.length + sentenceMistakes.length} 题
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Word Mistakes Card */}
                    <div className="bg-white rounded-2xl p-5 border border-orange-100/60 flex flex-col justify-between shadow-sm">
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-bold text-slate-800 text-base">📖 单词错题本</span>
                          <span className="bg-rose-50 text-rose-600 text-xs px-2.5 py-1 rounded-full font-black">
                            {wordMistakes.length}
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs leading-relaxed mb-4">
                          记错的单词都会收集在这里，随时挑战巩固记忆。
                        </p>
                      </div>
                      <button
                        disabled={wordMistakes.length === 0}
                        onClick={() => handleStartReview('word')}
                        className={`w-full py-2.5 rounded-full text-xs font-display font-black transition-all cursor-pointer ${
                          wordMistakes.length > 0
                            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md active:scale-95'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {wordMistakes.length > 0 ? '消灭错题' : '太棒了，暂无错题'}
                      </button>
                    </div>

                    {/* Phrase Mistakes Card */}
                    <div className="bg-white rounded-2xl p-5 border border-orange-100/60 flex flex-col justify-between shadow-sm">
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-bold text-slate-800 text-base">🔗 短语错题本</span>
                          <span className="bg-rose-50 text-rose-600 text-xs px-2.5 py-1 rounded-full font-black">
                            {phraseMistakes.length}
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs leading-relaxed mb-4">
                          收集不熟悉的初中大纲常考短语，深度搞懂具体场景和易混短语！
                        </p>
                      </div>
                      <button
                        disabled={phraseMistakes.length === 0}
                        onClick={() => handleStartReview('phrase')}
                        className={`w-full py-2.5 rounded-full text-xs font-display font-black transition-all cursor-pointer ${
                          phraseMistakes.length > 0
                            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md active:scale-95'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {phraseMistakes.length > 0 ? '消灭错题' : '太棒了，暂无错题'}
                      </button>
                    </div>

                    {/* Sentence Mistakes Card */}
                    <div className="bg-white rounded-2xl p-5 border border-orange-100/60 flex flex-col justify-between shadow-sm">
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-bold text-slate-800 text-base">🧩 句法错题本</span>
                          <span className="bg-rose-50 text-rose-600 text-xs px-2.5 py-1 rounded-full font-black">
                            {sentenceMistakes.length}
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs leading-relaxed mb-4">
                          时态混淆或词序拼错的句子，带你重组掌握正确语感！
                        </p>
                      </div>
                      <button
                        disabled={sentenceMistakes.length === 0}
                        onClick={() => handleStartReview('sentence')}
                        className={`w-full py-2.5 rounded-full text-xs font-display font-black transition-all cursor-pointer ${
                          sentenceMistakes.length > 0
                            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md active:scale-95'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {sentenceMistakes.length > 0 ? '消灭错题' : '太棒了，暂无错题'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bottom Recent Stats Deck */}
                <div className="bg-white/60 border-2 border-white p-6 rounded-[24px] shadow-sm backdrop-blur-sm grid grid-cols-1 sm:grid-cols-3 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                  
                  {/* Stat 1 */}
                  <div className="flex items-center gap-4 pt-4 sm:pt-0 sm:px-2">
                    <div className="p-3 bg-violet-100 text-violet-600 rounded-xl shrink-0">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">本周攻克词汇</p>
                      <p className="text-xl font-display font-black text-slate-800">+142 <span className="text-xs text-emerald-500 font-bold">↑ 12%</span></p>
                    </div>
                  </div>

                  {/* Stat 2 */}
                  <div className="flex items-center gap-4 pt-4 sm:pt-0 sm:pl-6">
                    <div className="p-3 bg-orange-100 text-orange-600 rounded-xl shrink-0">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">累计学习时长</p>
                      <p className="text-xl font-display font-black text-slate-800">18.5 <span className="text-xs text-slate-500">小时</span></p>
                    </div>
                  </div>

                  {/* Stat 3 */}
                  <div className="flex items-center gap-4 pt-4 sm:pt-0 sm:pl-6">
                    <div className="p-3 bg-sky-100 text-sky-600 rounded-xl shrink-0">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">最高等级段位</p>
                      <p className="text-xl font-display font-black text-slate-800">No. 12 <span className="text-xs text-sky-500 font-bold">Top 1%</span></p>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {view === 'quiz' && (
              <div className="flex-1 flex flex-col justify-center py-4">
                {quizType === 'word' || quizType === 'phrase' ? (
                  <WordQuiz
                    questions={wordQuestions}
                    quizType={quizType}
                    isReviewMode={isReviewMode}
                    onQuizFinished={handleWordQuizFinished}
                    onExit={handleExitQuiz}
                  />
                ) : (
                  <SentenceQuiz
                    questions={sentenceQuestions}
                    isReviewMode={isReviewMode}
                    onQuizFinished={handleSentenceQuizFinished}
                    onExit={handleExitQuiz}
                  />
                )}
              </div>
            )}

            {view === 'result' && (
              <QuizResult
                quizType={quizType}
                wordAnswers={wordAnswers}
                sentenceAnswers={sentenceAnswers}
                username={username}
                onRestart={() => setView('home')}
                onLeaderboardSubmit={handleLeaderboardSubmit}
              />
            )}
          </>
        )}

      </main>

      {/* CUSTOM CONFIRMATION MODAL */}
      {showExitConfirm && (
        <div id="exit-confirm-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border-b-8 border-amber-400 text-center relative overflow-hidden transform scale-100 transition-all duration-300">
            {/* Background decoration */}
            <div className="absolute -left-12 -top-12 w-32 h-32 bg-amber-50 rounded-full opacity-60 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-2xl flex items-center justify-center mb-5 animate-pulse">
                <AlertCircle className="w-8 h-8" />
              </div>
              
              <h3 className="text-2xl font-display font-black text-slate-800 mb-2">确定要退出挑战吗？</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-[280px] mx-auto">
                当前的测试进度还没有保存哦！再坚持一下就能通关啦，加油！💪
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  id="btn-confirm-exit-cancel"
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-3 bg-sky-500 hover:bg-sky-600 active:scale-[0.98] text-white font-display font-black rounded-full text-sm shadow-md shadow-sky-100 transition-all cursor-pointer"
                >
                  继续挑战（冲鸭！）
                </button>
                <button
                  id="btn-confirm-exit-ok"
                  onClick={() => {
                    setShowExitConfirm(false);
                    setView('home');
                  }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-full text-sm transition-all cursor-pointer active:scale-[0.98]"
                >
                  狠心退出
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
