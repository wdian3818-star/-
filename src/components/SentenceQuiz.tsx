import React, { useState, useEffect } from 'react';
import { SentenceQuestion } from '../types';
import { ArrowRight, CheckCircle2, XCircle, RefreshCw, Sparkles } from 'lucide-react';

interface SentenceQuizProps {
  questions: SentenceQuestion[];
  isReviewMode?: boolean;
  onQuizFinished: (userAnswers: { question: SentenceQuestion; selectedAnswer: string; isCorrect: boolean }[]) => void;
  onExit: () => void;
}

export default function SentenceQuiz({ questions, isReviewMode = false, onQuizFinished, onExit }: SentenceQuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fillValue, setFillValue] = useState("");
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [scrambledWords, setScrambledWords] = useState<string[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<{ question: SentenceQuestion; selectedAnswer: string; isCorrect: boolean }[]>([]);

  const activeQuestion = questions[currentIndex];

  // Initialize scrambled words for order type or reset for fill type
  useEffect(() => {
    setIsAnswered(false);
    setFillValue("");
    setSelectedWords([]);

    if (activeQuestion.type === 'order' && activeQuestion.options) {
      // Shuffle the options
      const shuffled = [...activeQuestion.options].sort(() => 0.5 - Math.random());
      setScrambledWords(shuffled);
    }
  }, [currentIndex, activeQuestion]);

  // Word clicking in word order game
  const handleWordClick = (word: string, indexInScrambled: number) => {
    if (isAnswered) return;

    // Add to selected
    setSelectedWords([...selectedWords, word]);
    // Remove from scrambled by index to handle duplicate words correctly
    const updatedScrambled = [...scrambledWords];
    updatedScrambled.splice(indexInScrambled, 1);
    setScrambledWords(updatedScrambled);
  };

  // Remove word from selected sequence
  const handleRemoveWord = (word: string, indexInSelected: number) => {
    if (isAnswered) return;

    // Remove from selected
    const updatedSelected = [...selectedWords];
    updatedSelected.splice(indexInSelected, 1);
    setSelectedWords(updatedSelected);

    // Return to scrambled
    setScrambledWords([...scrambledWords, word]);
  };

  const handleResetOrder = () => {
    if (isAnswered) return;
    if (activeQuestion.options) {
      setSelectedWords([]);
      setScrambledWords([...activeQuestion.options].sort(() => 0.5 - Math.random()));
    }
  };

  const checkAnswer = () => {
    setIsAnswered(true);
  };

  const handleNext = () => {
    let finalAnswerStr = "";
    let correct = false;

    if (activeQuestion.type === 'order') {
      finalAnswerStr = selectedWords.join(" ");
      const expectedAnswerStr = Array.isArray(activeQuestion.answer)
        ? (activeQuestion.answer as string[]).join(" ")
        : (activeQuestion.answer as string);
      
      // Clean punctuation and double spaces for robust matching
      const cleanText = (str: string) => str.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").replace(/\s+/g, " ").trim();
      correct = cleanText(finalAnswerStr) === cleanText(expectedAnswerStr);
    } else {
      finalAnswerStr = fillValue.trim();
      const expected = String(activeQuestion.answer).toLowerCase().trim();
      const student = finalAnswerStr.toLowerCase();
      
      // Some flexibility (e.g., if it has multiple correct answers separated by slash or fallback)
      if (expected.includes("/")) {
        const parts = expected.split("/").map(p => p.trim());
        correct = parts.includes(student);
      } else {
        correct = student === expected;
      }
    }

    const updatedAnswers = [
      ...quizAnswers,
      {
        question: activeQuestion,
        selectedAnswer: finalAnswerStr,
        isCorrect: correct
      }
    ];

    setQuizAnswers(updatedAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Completed all 5 questions
      onQuizFinished(updatedAnswers);
    }
  };

  const progressPercent = ((currentIndex + 1) / questions.length) * 100;
  const isReadyToVerify = activeQuestion.type === 'order' 
    ? selectedWords.length > 0 
    : fillValue.trim().length > 0;

  return (
    <div id="sentence-quiz-container" className="bg-white rounded-3xl p-6 md:p-8 shadow-md border border-emerald-100 max-w-2xl mx-auto">
      {/* Quiz Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-bold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> 句法大挑战
          </span>
        </div>
        <button
          onClick={onExit}
          className="text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
        >
          退出测试
        </button>
      </div>

      {isReviewMode && (
        <div className="mb-5 bg-amber-50 text-amber-700 text-xs px-3 py-2.5 rounded-xl border border-amber-200/60 flex items-center gap-1.5 font-semibold">
          🔄 错题巩固模式 • 答对的题目会自动从您的错题本中移除哦！
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-slate-500 font-bold mb-2">
          <span>挑战进度</span>
          <span>{currentIndex + 1} / {questions.length} 题</span>
        </div>
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-400 to-teal-500 h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question Context Card */}
      <div className="bg-slate-50/70 rounded-2xl p-6 border border-slate-100 mb-6 text-center">
        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">
          {activeQuestion.type === 'order' ? '🧩 连词成句任务' : '✍️ 翻译填空任务'}
        </p>
        <h3 className="font-display font-extrabold text-xl md:text-2xl text-slate-800 leading-relaxed mb-3">
          {activeQuestion.chinese}
        </h3>
        {activeQuestion.type === 'fill' && (
          <p className="font-mono text-base md:text-lg bg-white/80 border border-slate-200/60 inline-block px-4 py-2 rounded-xl text-slate-700 shadow-inner">
            {activeQuestion.englishTemplate}
          </p>
        )}
      </div>

      {/* Scrambled Word Puzzle Mode */}
      {activeQuestion.type === 'order' && (
        <div className="space-y-6">
          {/* Answer Area */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">点击单词拼成正确的句子：</span>
              {selectedWords.length > 0 && !isAnswered && (
                <button
                  onClick={handleResetOrder}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> 重置
                </button>
              )}
            </div>
            
            <div className="min-h-[70px] bg-emerald-50/30 border-2 border-dashed border-emerald-200 rounded-2xl p-4 flex flex-wrap gap-2 items-center">
              {selectedWords.length === 0 ? (
                <span className="text-sm text-slate-400 italic">请在下方点选单词拼装...</span>
              ) : (
                selectedWords.map((word, index) => (
                  <button
                    key={index}
                    disabled={isAnswered}
                    onClick={() => handleRemoveWord(word, index)}
                    className={`bg-emerald-500 text-white font-bold px-3.5 py-1.5 rounded-xl border-b-4 border-emerald-700 text-sm hover:translate-y-0.5 transition-all flex items-center gap-1 cursor-pointer ${isAnswered ? 'opacity-80' : ''}`}
                  >
                    {word}
                    {!isAnswered && <span className="text-[10px] text-emerald-200 ml-1">×</span>}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Scrambled Area */}
          {!isAnswered && (
            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-2">备选单词堆：</span>
              <div className="flex flex-wrap gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                {scrambledWords.length === 0 ? (
                  <span className="text-xs text-slate-400">已全部选完！</span>
                ) : (
                  scrambledWords.map((word, index) => (
                    <button
                      key={index}
                      onClick={() => handleWordClick(word, index)}
                      className="bg-white hover:bg-slate-100 text-slate-700 font-bold px-3.5 py-2 rounded-xl border border-slate-200 text-sm shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer active:scale-95"
                    >
                      {word}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Translation Fill In Blank Mode */}
      {activeQuestion.type === 'fill' && !isAnswered && (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-2">请填入括号中单词的正确形式（注意大小写）：</label>
            <input
              type="text"
              value={fillValue}
              onChange={(e) => setFillValue(e.target.value)}
              placeholder="在这里输入你的答案..."
              className="w-full p-4 rounded-2xl border-2 border-emerald-100 focus:border-emerald-400 focus:outline-none font-mono text-lg text-slate-800 bg-white transition-colors"
            />
          </div>
        </div>
      )}

      {/* Feedback Overlay upon checking answer */}
      {isAnswered && (
        <div className="mt-6 p-4 rounded-2xl border bg-slate-50 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">正确参考答案：</span>
          </div>
          <p className="font-display font-extrabold text-lg text-emerald-700">
            {activeQuestion.englishTemplate || (Array.isArray(activeQuestion.answer) ? (activeQuestion.answer as string[]).join(" ") : activeQuestion.answer)}
          </p>
          <div className="text-xs text-slate-500 bg-white p-3 rounded-xl border border-slate-100 mt-1">
            <span className="font-bold text-slate-700 block mb-0.5">📚 语法解析点：</span>
            {activeQuestion.keyPoint}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex justify-end gap-3">
        {!isAnswered ? (
          <button
            onClick={checkAnswer}
            disabled={!isReadyToVerify}
            className={`px-6 py-3.5 rounded-2xl font-display font-black text-sm shadow-md transition-all duration-200 ${
              isReadyToVerify
                ? 'bg-slate-900 text-white hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            核对答案
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-6 py-3.5 rounded-2xl font-display font-black text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
          >
            {currentIndex < questions.length - 1 ? '下一题' : '完成挑战'}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
