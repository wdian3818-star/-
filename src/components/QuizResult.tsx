import React, { useState } from 'react';
import { WordQuestion, SentenceQuestion } from '../types';
import { Award, RotateCcw, AlertCircle, PlayCircle, BookOpen, Volume2, Sparkles, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface QuizResultProps {
  quizType: 'word' | 'sentence' | 'phrase';
  wordAnswers?: { question: WordQuestion; selectedAnswer: string; isCorrect: boolean }[];
  sentenceAnswers?: { question: SentenceQuestion; selectedAnswer: string; isCorrect: boolean }[];
  username: string;
  onRestart: () => void;
  onLeaderboardSubmit: () => void; // Trigger ranking refresh in main app
}

export default function QuizResult({
  quizType,
  wordAnswers = [],
  sentenceAnswers = [],
  username,
  onRestart,
  onLeaderboardSubmit
}: QuizResultProps) {
  const [loadingExplanationId, setLoadingExplanationId] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [explanationError, setExplanationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const totalQuestions = quizType === 'sentence' ? sentenceAnswers.length : wordAnswers.length;
  const correctCount = quizType === 'sentence' 
    ? sentenceAnswers.filter(a => a.isCorrect).length 
    : wordAnswers.filter(a => a.isCorrect).length;
  
  // Calculate score on a scale of 100
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // Sound pronun for word result page
  const handleSpeak = (word: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  const submitScore = async () => {
    if (submitted) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/leaderboard/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          score,
          quizType: quizType === 'word' ? '单词测试' : quizType === 'phrase' ? '常用短语测试' : '句子语法测试'
        })
      });
      const data = await response.json();
      if (data.success) {
        setSubmitted(true);
        onLeaderboardSubmit(); // Notify App to refresh leaderboard entries
      } else {
        alert("提交失败: " + data.error);
      }
    } catch (e) {
      console.error(e);
      alert("网络问题，无法提交至服务器排行榜，分数保存在您的战绩中！");
    } finally {
      setSubmitting(false);
    }
  };

  const getExplanation = async (id: string, questionObj: any, userAnswer: string) => {
    if (explanations[id]) {
      // Toggle off if already loaded
      const updated = { ...explanations };
      delete updated[id];
      setExplanations(updated);
      return;
    }

    setLoadingExplanationId(id);
    setExplanationError(null);

    try {
      const response = await fetch('/api/ai-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questionObj,
          userAnswer,
          type: quizType
        })
      });
      const data = await response.json();
      if (data.success) {
        setExplanations(prev => ({ ...prev, [id]: data.explanation }));
      } else {
        setExplanationError(data.error || "获取讲解失败。");
      }
    } catch (err: any) {
      console.error(err);
      setExplanationError("连接服务器解析端失败，请确保后端服务正常运行且配置了 GEMINI_API_KEY。");
    } finally {
      setLoadingExplanationId(null);
    }
  };

  // Helper to highlight markdown-like lines or structure from AI answer
  const formatAiOutput = (text: string) => {
    return text.split('\n').map((line, idx) => {
      if (line.startsWith('【') || line.includes('：')) {
        // Highlight titles
        return (
          <p key={idx} className="text-slate-800 font-bold mb-1.5 mt-2 text-sm flex items-center gap-1">
            <span className="w-1.5 h-3.5 bg-sky-500 rounded-full inline-block"></span>
            {line}
          </p>
        );
      }
      return <p key={idx} className="text-slate-600 text-sm leading-relaxed mb-1 pl-2.5">{line}</p>;
    });
  };

  const scoreMessage = () => {
    if (score === 100) return { title: "学神降临！全对通关！👑", desc: "太棒了！初中英语对你来说就是小菜一碟！继续保持！", color: "text-amber-500" };
    if (score >= 80) return { title: "优秀学霸！再接再厉！✨", desc: "只差一点就满分啦，快让 AI 老师讲讲错题，争取下次全对！", color: "text-emerald-500" };
    if (score >= 60) return { title: "合格战士！冲刺冲刺！📚", desc: "已经及格啦！初中的知识点正逐步被你掌握，加油攻克错题！", color: "text-sky-500" };
    return { title: "元气少年，别气馁！🛡️", desc: "这几道题有点小坑，点击下方的 AI 老师讲解，秒懂背后的知识点！", color: "text-rose-500" };
  };

  const msg = scoreMessage();

  return (
    <div id="quiz-result-container" className="space-y-6 max-w-2xl mx-auto">
      {/* Score Summary Card */}
      <div className="bg-white rounded-[32px] p-8 shadow-md border-b-8 border-sky-400 text-center relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -left-12 -top-12 w-32 h-32 bg-sky-50 rounded-full pointer-events-none" />
        <div className="absolute -right-12 -bottom-12 w-32 h-32 bg-amber-50 rounded-full pointer-events-none" />

        <div className="inline-flex items-center justify-center w-20 h-20 bg-sky-50 text-sky-500 rounded-3xl mb-4 animate-bounce">
          <Award className="w-10 h-10" />
        </div>

        <h2 className="font-display font-black text-2xl text-slate-800 mb-1">
          测试报告单
        </h2>
        
        <div className="my-6">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">本次得分</p>
          <div className="flex items-baseline justify-center gap-1 mt-1">
            <span className="font-display font-black text-6xl text-sky-500">{score}</span>
            <span className="text-xl font-bold text-slate-500">分</span>
          </div>
        </div>

        <h3 className={`font-display font-extrabold text-lg ${msg.color} mb-2`}>
          {msg.title}
        </h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          {msg.desc}
        </p>

        {/* Board Submit Button */}
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <button
            id="btn-submit-score"
            onClick={submitScore}
            disabled={submitted || submitting}
            className={`px-5 py-2.5 rounded-xl font-display font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              submitted
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                : 'bg-amber-400 hover:bg-amber-500 text-slate-900 shadow-md shadow-amber-100'
            }`}
          >
            {submitting ? '正在登记...' : submitted ? '✅ 已成功登榜' : '🚀 成绩晒上战力榜'}
          </button>
          
          <button
            onClick={onRestart}
            className="px-5 py-2.5 rounded-xl font-display font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> 再测一次
          </button>
        </div>
      </div>

      {/* Answer Review Section */}
      <div className="space-y-4">
        <h3 className="font-display font-extrabold text-lg text-slate-800 px-1 flex items-center gap-2">
          <span>📝 答题明细与 AI 精讲</span>
          <span className="text-xs font-normal text-slate-400">(点击 <Sparkles className="w-3 h-3 text-sky-500 inline" /> 即可召唤幽默 AI 老师)</span>
        </h3>

        {explanationError && (
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex gap-3 text-rose-700 text-xs items-start">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">AI 讲解通道阻塞：</p>
              <p className="mt-1">{explanationError}</p>
            </div>
          </div>
        )}

        {/* For Word or Phrase Quiz Answers */}
        {(quizType === 'word' || quizType === 'phrase') && wordAnswers.map((item, idx) => {
          const q = item.question;
          const id = q.id;
          const isOpen = !!explanations[id];
          const isLoading = loadingExplanationId === id;

          return (
            <div
              key={id}
              className={`bg-white rounded-3xl p-5 border-2 transition-all duration-300 ${
                item.isCorrect 
                  ? 'border-emerald-100 hover:border-emerald-200' 
                  : 'border-rose-100 bg-rose-50/10 hover:border-rose-200'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {/* Status Indicator */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-1 font-bold ${
                    item.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {idx + 1}
                  </div>
                  
                  <div>
                    {/* Word info */}
                    <div className="flex items-center gap-2">
                      <span className="font-display font-extrabold text-lg text-slate-800">{q.word}</span>
                      <button 
                        onClick={() => handleSpeak(q.word)}
                        className="text-slate-400 hover:text-sky-500 transition-colors"
                        title="朗读"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{q.phonetic} • {q.partOfSpeech}</p>
                    
                    {/* Choices details */}
                    <div className="mt-2.5 space-y-1">
                      <p className="text-xs text-slate-600">
                        正确翻译: <span className="font-semibold text-emerald-600">{q.options[q.answerIndex]}</span>
                      </p>
                      {!item.isCorrect && (
                        <p className="text-xs text-slate-600">
                          你的选择: <span className="font-semibold text-rose-500">{item.selectedAnswer || "（未作答）"}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Explanation Button */}
                <button
                  id={`btn-explain-${id}`}
                  onClick={() => getExplanation(id, q, item.selectedAnswer)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold font-display flex items-center gap-1 transition-all cursor-pointer ${
                    isOpen
                      ? 'bg-sky-50 text-sky-600 border border-sky-200'
                      : 'bg-sky-500 hover:bg-sky-600 text-white shadow-sm shadow-sky-100'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      老师备课中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      {isOpen ? '收起讲解' : 'AI 老师详细讲解'}
                    </>
                  )}
                </button>
              </div>

              {/* Collapsible Explanations Box */}
              {isOpen && (
                <div className="mt-4 pt-4 border-t border-slate-100 bg-sky-50/40 rounded-2xl p-4 animate-fade-in">
                  <div className="flex items-center gap-1.5 mb-2 text-sky-700 font-bold text-xs">
                    <BookOpen className="w-4 h-4" />
                    <span>大麦老师的幽默课堂：</span>
                  </div>
                  <div className="space-y-1">
                    {formatAiOutput(explanations[id])}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* For Sentence Quiz Answers */}
        {quizType === 'sentence' && sentenceAnswers.map((item, idx) => {
          const q = item.question;
          const id = q.id;
          const isOpen = !!explanations[id];
          const isLoading = loadingExplanationId === id;

          return (
            <div
              key={id}
              className={`bg-white rounded-3xl p-5 border-2 transition-all duration-300 ${
                item.isCorrect 
                  ? 'border-emerald-100 hover:border-emerald-200' 
                  : 'border-rose-100 bg-rose-50/10 hover:border-rose-200'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {/* Status Indicator */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-1 font-bold ${
                    item.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {idx + 1}
                  </div>
                  
                  <div>
                    {/* Chinese prompt */}
                    <span className="font-semibold text-sm text-slate-800">{q.chinese}</span>
                    <p className="text-xs text-slate-400 mt-0.5">类型：{q.type === 'order' ? '连词成句' : '翻译填空'}</p>
                    
                    {/* Choices details */}
                    <div className="mt-2.5 space-y-1">
                      <p className="text-xs text-slate-600">
                        正确英文: <span className="font-mono bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded text-emerald-600 font-bold text-[13px]">{Array.isArray(q.answer) ? (q.answer as string[]).join(" ") : q.answer}</span>
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        你的回答: <span className={`font-mono bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded text-[13px] ${item.isCorrect ? 'text-emerald-600' : 'text-rose-500 font-bold'}`}>{item.selectedAnswer || "（未作答）"}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* AI Explanation Button */}
                <button
                  id={`btn-explain-${id}`}
                  onClick={() => getExplanation(id, q, item.selectedAnswer)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold font-display flex items-center gap-1 transition-all cursor-pointer ${
                    isOpen
                      ? 'bg-sky-50 text-sky-600 border border-sky-200'
                      : 'bg-sky-500 hover:bg-sky-600 text-white shadow-sm shadow-sky-100'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      老师备课中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      {isOpen ? '收起讲解' : 'AI 老师详细讲解'}
                    </>
                  )}
                </button>
              </div>

              {/* Collapsible Explanations Box */}
              {isOpen && (
                <div className="mt-4 pt-4 border-t border-slate-100 bg-sky-50/40 rounded-2xl p-4 animate-fade-in">
                  <div className="flex items-center gap-1.5 mb-2 text-sky-700 font-bold text-xs">
                    <BookOpen className="w-4 h-4" />
                    <span>大麦老师的幽默课堂：</span>
                  </div>
                  <div className="space-y-1">
                    {formatAiOutput(explanations[id])}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Navigation */}
      <div className="text-center pt-2">
        <button
          onClick={onRestart}
          className="px-8 py-3.5 bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-display font-extrabold text-sm rounded-full shadow-lg shadow-sky-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
        >
          返回能量站首页 🚀
        </button>
      </div>
    </div>
  );
}
