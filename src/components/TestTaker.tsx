import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Test, Question, Submission } from '../types';
import { Clock, AlertCircle, CheckCircle2, ChevronRight, ChevronLeft, Send, List } from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';

export default function TestTaker() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [studentInfo, setStudentInfo] = useState<{ studentName: string, studentId: string } | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!testId) return;
      
      const infoStr = sessionStorage.getItem(`student_${testId}`);
      if (!infoStr) {
        navigate(`/test/${testId}`);
        return;
      }
      setStudentInfo(JSON.parse(infoStr));

      try {
        const testDoc = await getDoc(doc(db, 'tests', testId));
        if (testDoc.exists()) {
          const testData = testDoc.data() as Test;
          setTest(testData);
          setTimeLeft(testData.duration * 60);

          const qSnap = await getDocs(collection(db, 'tests', testId, 'questions'));
          const fetchedQs = qSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question));
          setQuestions(fetchedQs);
          setAnswers(new Array(fetchedQs.length).fill(-1));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [testId]);

  useEffect(() => {
    if (timeLeft > 0 && !submitting) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleSubmit(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, submitting]);

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleSubmit = async (isAuto = false) => {
    if (submitting) return;
    
    setSubmitting(true);
    setShowConfirmModal(false);
    if (timerRef.current) clearInterval(timerRef.current);

    // Calculate score
    let correctCount = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correctAnswer) correctCount++;
    });
    const score = (correctCount / questions.length) * 10;

    const submission: Partial<Submission> = {
      testId,
      studentName: studentInfo?.studentName || 'Unknown',
      studentId: studentInfo?.studentId || 'Unknown',
      score,
      answers,
      submittedAt: Timestamp.now()
    };

    try {
      await addDoc(collection(db, 'tests', testId!, 'submissions'), submission);
      // Store results in session storage for the result page
      sessionStorage.setItem(`result_${testId}`, JSON.stringify({
        score,
        questions,
        answers,
        correctCount
      }));
      navigate(`/test/${testId}/result`);
    } catch (err) {
      console.error('Submission failed:', err);
      alert('Lỗi khi nộp bài. Vui lòng thử lại.');
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleAnswer = (qIndex: number, aIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[qIndex] = aIndex;
    setAnswers(newAnswers);
  };

  const allAnswered = answers.every(a => a !== -1);

  if (loading) return <div className="p-12 text-center">Đang tải câu hỏi...</div>;
  if (!test) return <div className="p-12 text-center">Lỗi tải bài kiểm tra.</div>;

  const currentQ = questions[currentQIndex];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with Timer */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 sticky top-20 z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
            <Clock size={24} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thời gian còn lại</div>
            <div className={`text-2xl font-mono font-bold ${timeLeft < 60 ? 'text-rose-600 animate-pulse' : 'text-slate-900'}`}>
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:block text-right">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tiến độ</div>
            <div className="text-sm font-bold text-slate-900">
              {answers.filter(a => a !== -1).length} / {questions.length} câu
            </div>
          </div>
          {allAnswered && (
            <button 
              onClick={() => setShowConfirmModal(true)}
              disabled={submitting}
              className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-100"
            >
              {submitting ? <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" /> : <Send size={18} />}
              Nộp bài sớm
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mx-auto mb-6">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 text-center mb-4">Xác nhận nộp bài?</h3>
              <p className="text-slate-500 text-center mb-8">
                Bạn đã hoàn thành tất cả các câu hỏi. Bạn có chắc chắn muốn nộp bài ngay bây giờ không? Hệ thống sẽ dừng đồng hồ và chấm điểm ngay lập tức.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3 px-6 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Tiếp tục làm
                </button>
                <button 
                  onClick={() => handleSubmit(false)}
                  className="flex-1 py-3 px-6 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                >
                  Nộp bài ngay
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question Navigation */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <List size={18} /> Danh sách câu
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {questions.map((_, i) => (
                <button 
                  key={i}
                  onClick={() => setCurrentQIndex(i)}
                  className={`w-full aspect-square rounded-lg font-bold text-sm transition-all flex items-center justify-center ${
                    currentQIndex === i 
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' 
                      : answers[i] !== -1 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Question Content */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col">
            <div className="mb-8">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold uppercase tracking-wider">Câu hỏi {currentQIndex + 1}</span>
              <h2 className="text-xl font-bold text-slate-900 mt-4 leading-relaxed">
                {currentQ.text}
              </h2>
            </div>

            <div className="space-y-4 flex-grow">
              {currentQ.options.map((opt, i) => (
                <button 
                  key={i}
                  onClick={() => handleAnswer(currentQIndex, i)}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-4 group ${
                    answers[currentQIndex] === i 
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-900' 
                      : 'bg-white border-slate-100 hover:border-indigo-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all ${
                    answers[currentQIndex] === i 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                  }`}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className="font-medium">{opt}</span>
                </button>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-between">
              <button 
                onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQIndex === 0}
                className="flex items-center gap-2 px-4 py-2 text-slate-500 font-bold hover:text-indigo-600 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={20} /> Câu trước
              </button>
              <button 
                onClick={() => setCurrentQIndex(prev => Math.min(questions.length - 1, prev + 1))}
                disabled={currentQIndex === questions.length - 1}
                className="flex items-center gap-2 px-4 py-2 text-indigo-600 font-bold hover:bg-indigo-50 rounded-xl disabled:opacity-30 transition-all"
              >
                Câu tiếp theo <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
