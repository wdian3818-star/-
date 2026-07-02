import React, { useState } from 'react';
import { WordQuestion } from '../types';
import { ArrowRight, CheckCircle2, XCircle, Volume2 } from 'lucide-react';

interface WordQuizProps {
  questions: WordQuestion[];
  quizType?: 'word' | 'phrase';
  isReviewMode?: boolean;
  onQuizFinished: (userAnswers: { question: WordQuestion; selectedAnswer: string; isCorrect: boolean }[]) => void;
  onExit: () => void;
}

export default function WordQuiz({ questions, quizType = 'word', isReviewMode = false, onQuizFinished, onExit }: WordQuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<{ question: WordQuestion; selectedAnswer: string; isCorrect: boolean }[]>([]);

  const activeQuestion = questions[currentIndex];

  const handleOptionClick = (optionIndex: number) => {
    if (selectedOptionIndex !== null) return; // Prevent double selecting

    setSelectedOptionIndex(optionIndex);
  };

  const handleNext = () => {
    if (selectedOptionIndex === null) return;

    // Record answer
    const isCorrect = selectedOptionIndex === activeQuestion.answerIndex;
    const selectedAnswerText = activeQuestion.options[selectedOptionIndex];

    const updatedAnswers = [
      ...quizAnswers,
      {
        question: activeQuestion,
        selectedAnswer: selectedAnswerText,
        isCorrect,
      },
    ];

    setQuizAnswers(updatedAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOptionIndex(null);
    } else {
      // Quiz finished
      onQuizFinished(updatedAnswers);
    }
  };

  // Text-to-speech option using native web speech API for high value
  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(activeQuestion.word);
      utterance.lang = 'en-US';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  const progressPercent = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div id="word-quiz-container" className="bg-white rounded-3xl p-6 md:p-8 shadow-md border border-sky-100 max-w-2xl mx-auto">
      {/* Quiz Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-xs bg-sky-100 text-sky-700 px-3 py-1.5 rounded-full font-bold">
            ⚡ {quizType === 'phrase' ? '短语大闯关' : '单词大冒险'}
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
      <div className="mb-8">
        <div className="flex justify-between text-xs text-slate-500 font-bold mb-2">
          <span>当前进度</span>
          <span>{currentIndex + 1} / {questions.length} 题</span>
        </div>
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-sky-400 to-indigo-500 h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="text-center bg-slate-50/50 rounded-2xl p-6 md:p-8 border border-slate-100 mb-8 relative">
        {/* Speak button */}
        <button
          onClick={handleSpeak}
          title="点击发音"
          className="absolute right-4 top-4 bg-white hover:bg-sky-50 text-sky-500 p-2 rounded-full border border-sky-100 hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <Volume2 className="w-4 h-4" />
        </button>

        <h2 className="font-display font-extrabold text-3xl md:text-4xl text-slate-800 tracking-tight mb-2">
          {activeQuestion.word}
        </h2>
        
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="text-xs font-mono bg-sky-50 text-sky-600 px-2 py-0.5 rounded-md border border-sky-100/50 font-medium">
            {activeQuestion.phonetic}
          </span>
          <span className="text-xs bg-slate-200/60 text-slate-600 px-2.5 py-0.5 rounded-md font-semibold">
            {activeQuestion.partOfSpeech}
          </span>
        </div>
      </div>

      {/* Instructions */}
      <p className="text-sm font-semibold text-slate-500 mb-4 text-center">
        请选择最准确的中文翻译：
      </p>

      {/* Options List */}
      <div className="space-y-3.5">
        {activeQuestion.options.map((option, idx) => {
          const isSelected = selectedOptionIndex === idx;
          const isCorrectAnswer = idx === activeQuestion.answerIndex;
          const isLocked = selectedOptionIndex !== null;

          let btnStyle = "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99]";
          let icon = null;

          if (isLocked) {
            if (isCorrectAnswer) {
              btnStyle = "bg-green-50 border-green-300 text-green-700 font-medium shadow-sm shadow-green-100";
              icon = <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />;
            } else if (isSelected) {
              btnStyle = "bg-rose-50 border-rose-300 text-rose-700 font-medium shadow-sm shadow-rose-100";
              icon = <XCircle className="w-5 h-5 text-rose-500 shrink-0" />;
            } else {
              btnStyle = "bg-white border-slate-100 text-slate-300 cursor-not-allowed";
            }
          }

          return (
            <button
              key={idx}
              id={`option-${currentIndex}-${idx}`}
              onClick={() => handleOptionClick(idx)}
              disabled={isLocked}
              className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all duration-200 cursor-pointer ${btnStyle}`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 flex items-center justify-center rounded-lg text-xs font-bold ${
                  isLocked ? (isCorrectAnswer ? 'bg-green-200 text-green-700' : isSelected ? 'bg-rose-200 text-rose-700' : 'bg-slate-100 text-slate-300') : 'bg-slate-100 text-slate-500'
                }`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-sm font-semibold">{option}</span>
              </div>
              {icon}
            </button>
          );
        })}
      </div>

      {/* Action Button */}
      <div className="mt-8 flex justify-end">
        <button
          id="btn-next-question"
          onClick={handleNext}
          disabled={selectedOptionIndex === null}
          className={`px-6 py-3 rounded-2xl font-display font-bold flex items-center gap-1.5 transition-all duration-200 ${
            selectedOptionIndex === null
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              : 'bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white shadow-md shadow-sky-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
          }`}
        >
          {currentIndex < questions.length - 1 ? '下一题' : '完成测试'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
