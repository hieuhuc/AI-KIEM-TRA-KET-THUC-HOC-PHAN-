import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Question } from '../types';
import { CheckCircle2, XCircle, Trophy, ArrowRight, Home, AlertCircle } from 'lucide-react';

interface ResultData {
  score: number;
  questions: Question[];
  answers: number[];
  correctCount: number;
}

export default function TestResult() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<ResultData | null>(null);

  useEffect(() => {
    const dataStr = sessionStorage.getItem(`result_${testId}`);
    if (dataStr) {
      setResult(JSON.parse(dataStr));
    } else {
      navigate(`/test/${testId}`);
    }
  }, [testId]);

  if (!result) return <div className="p-12 text-center">Đang tải kết quả...</div>;

  const { score, questions, answers, correctCount } = result;

  return (
    <div className="max-w-3xl mx-auto py-12 space-y-8">
      <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100 border border-slate-100 overflow-hidden text-center p-12">
        <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mx-auto mb-6">
          <Trophy size={48} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Kết quả bài kiểm tra</h1>
        <p className="text-slate-500 mb-8">Bạn đã hoàn thành bài kiểm tra thành công!</p>
        
        <div className="inline-block p-8 bg-indigo-50 rounded-3xl border border-indigo-100 mb-8">
          <div className="text-6xl font-black text-indigo-600 mb-2">{score.toFixed(1)}</div>
          <div className="text-sm font-bold text-indigo-400 uppercase tracking-widest">Điểm số của bạn</div>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <div className="text-2xl font-bold text-emerald-600">{correctCount}</div>
            <div className="text-xs font-bold text-emerald-400 uppercase">Câu đúng</div>
          </div>
          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
            <div className="text-2xl font-bold text-rose-600">{questions.length - correctCount}</div>
            <div className="text-xs font-bold text-rose-400 uppercase">Câu sai</div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <AlertCircle size={24} className="text-indigo-600" /> Chi tiết bài làm
        </h2>
        
        <div className="space-y-4">
          {questions.map((q, i) => {
            const isCorrect = answers[i] === q.correctAnswer;
            return (
              <div key={i} className={`p-6 rounded-2xl border-2 transition-all ${
                isCorrect ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold ${
                    isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                  }`}>
                    {isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-bold text-slate-900 leading-relaxed">
                      {i + 1}. {q.text}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {q.options.map((opt, oIndex) => {
                        const isSelected = answers[i] === oIndex;
                        const isCorrectOption = q.correctAnswer === oIndex;
                        
                        return (
                          <div key={oIndex} className={`px-4 py-2 rounded-xl text-sm font-medium border ${
                            isCorrectOption 
                              ? 'bg-emerald-100 border-emerald-200 text-emerald-700 font-bold' 
                              : isSelected 
                                ? 'bg-rose-100 border-rose-200 text-rose-700' 
                                : 'bg-white border-slate-100 text-slate-400'
                          }`}>
                            {String.fromCharCode(65 + oIndex)}. {opt}
                            {isCorrectOption && <span className="ml-2 text-[10px] uppercase font-black tracking-tighter">(Đáp án đúng)</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-center pt-8">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg"
        >
          <Home size={20} /> Quay lại trang chủ
        </button>
      </div>
    </div>
  );
}
