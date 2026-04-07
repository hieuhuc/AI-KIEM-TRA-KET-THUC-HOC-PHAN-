import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, setDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, Timestamp, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Test, Question, Submission } from '../types';
import { User } from 'firebase/auth';
import { 
  ArrowLeft, Save, Plus, Trash2, Sparkles, FileText, 
  Settings, List, BarChart2, QrCode, Download, Copy, Check, X, ChevronDown, ChevronUp, Clock, Users, AlertCircle
} from 'lucide-react';
import { generateQuestions } from '../services/aiService';
import mammoth from 'mammoth';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';

interface TestCreatorProps {
  user: User;
}

export default function TestCreator({ user }: TestCreatorProps) {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'info' | 'questions' | 'results' | 'share'>('info');
  
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(60);
  const [status, setStatus] = useState<'open' | 'closed'>('closed');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState(5);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!testId) {
        setLoading(false);
        return;
      }

      try {
        const testDoc = await getDoc(doc(db, 'tests', testId));
        if (testDoc.exists()) {
          const data = testDoc.data() as Test;
          setTitle(data.title);
          setDuration(data.duration);
          setStatus(data.status);

          const qSnap = await getDocs(collection(db, 'tests', testId, 'questions'));
          setQuestions(qSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question)));

          const sSnap = await getDocs(collection(db, 'tests', testId, 'submissions'));
          setSubmissions(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Submission)));
        }
      } catch (error) {
        console.error('Error fetching test data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [testId]);

  const handleSaveTest = async () => {
    setSaving(true);
    try {
      const id = testId || doc(collection(db, 'tests')).id;
      const testData: Partial<Test> = {
        title,
        duration,
        status,
        teacherId: user.uid,
        createdAt: Timestamp.now(),
      };

      await setDoc(doc(db, 'tests', id), testData, { merge: true });
      
      // Save questions
      for (const q of questions) {
        const qId = q.id || doc(collection(db, 'tests', id, 'questions')).id;
        await setDoc(doc(db, 'tests', id, 'questions', qId), {
          text: q.text,
          options: q.options,
          correctAnswer: q.correctAnswer,
          testId: id
        });
      }

      if (!testId) navigate(`/teacher/test/${id}`);
      alert('Đã lưu bài kiểm tra thành công!');
    } catch (error) {
      console.error('Error saving test:', error);
      alert('Lỗi khi lưu bài kiểm tra.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestion = () => {
    const newQ: Question = {
      id: '',
      testId: testId || '',
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 0
    };
    setQuestions([...questions, newQ]);
  };

  const handleUpdateQuestion = (index: number, field: keyof Question, value: any) => {
    const newQs = [...questions];
    newQs[index] = { ...newQs[index], [field]: value };
    setQuestions(newQs);
  };

  const handleUpdateOption = (qIndex: number, oIndex: number, value: string) => {
    const newQs = [...questions];
    const newOptions = [...newQs[qIndex].options];
    newOptions[oIndex] = value;
    newQs[qIndex].options = newOptions;
    setQuestions(newQs);
  };

  const handleRemoveQuestion = async (index: number) => {
    const q = questions[index];
    if (q.id && testId) {
      if (window.confirm('Xóa câu hỏi này khỏi cơ sở dữ liệu?')) {
        await deleteDoc(doc(db, 'tests', testId, 'questions', q.id));
      }
    }
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleGenerateAI = async () => {
    if (!aiTopic) return;
    setAiLoading(true);
    try {
      const newQs = await generateQuestions(aiTopic, aiCount);
      const formattedQs: Question[] = newQs.map((q: any) => ({
        id: '',
        testId: testId || '',
        ...q
      }));
      setQuestions([...questions, ...formattedQs]);
      setAiTopic('');
    } catch (error) {
      console.error('AI Generation failed:', error);
      alert('Không thể tạo câu hỏi bằng AI.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      try {
        const result = await mammoth.extractRawText({ arrayBuffer });
        const text = result.value;
        
        // Simple parser for Word files
        // Expects format: Question text? A. Option 1 B. Option 2 C. Option 3 D. Option 4 Answer: A
        const lines = text.split('\n').filter(l => l.trim());
        const parsedQs: Question[] = [];
        let currentQ: Partial<Question> | null = null;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.match(/^\d+[\.\)]/)) { // New question starting with number
            if (currentQ && currentQ.text && currentQ.options?.length === 4) {
              parsedQs.push(currentQ as Question);
            }
            currentQ = {
              text: line.replace(/^\d+[\.\)]\s*/, ''),
              options: [],
              correctAnswer: 0,
              testId: testId || ''
            };
          } else if (line.match(/^[A-D][\.\)]/)) {
            currentQ?.options?.push(line.replace(/^[A-D][\.\)]\s*/, ''));
          } else if (line.toLowerCase().startsWith('đáp án:') || line.toLowerCase().startsWith('answer:')) {
            const ansChar = line.split(':')[1].trim().toUpperCase();
            const index = ['A', 'B', 'C', 'D'].indexOf(ansChar);
            if (currentQ) currentQ.correctAnswer = index !== -1 ? index : 0;
          }
        }
        if (currentQ && currentQ.text && currentQ.options?.length === 4) {
          parsedQs.push(currentQ as Question);
        }

        setQuestions([...questions, ...parsedQs]);
        alert(`Đã nhập thành công ${parsedQs.length} câu hỏi.`);
      } catch (error) {
        console.error('Word parsing failed:', error);
        alert('Lỗi khi đọc file Word. Vui lòng kiểm tra định dạng.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const exportToExcel = () => {
    const data = submissions.map((s, i) => ({
      'STT': i + 1,
      'Họ và tên': s.studentName,
      'Mã sinh viên': s.studentId,
      'Điểm số': s.score,
      'Thời gian nộp': s.submittedAt.toDate().toLocaleString('vi-VN')
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kết quả');
    XLSX.writeFile(wb, `KetQua_${title.replace(/\s+/g, '_')}.xlsx`);
  };

  const copyLink = () => {
    const url = `${window.location.origin}/test/${testId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="p-12 text-center">Đang tải...</div>;

  const testUrl = `${window.location.origin}/test/${testId}`;

  // Stats calculation
  const scoreDistribution = [
    { name: '0-2', value: submissions.filter(s => s.score < 2).length },
    { name: '2-4', value: submissions.filter(s => s.score >= 2 && s.score < 4).length },
    { name: '4-6', value: submissions.filter(s => s.score >= 4 && s.score < 6).length },
    { name: '6-8', value: submissions.filter(s => s.score >= 6 && s.score < 8).length },
    { name: '8-10', value: submissions.filter(s => s.score >= 8).length },
  ];

  const passFailData = [
    { name: 'Đạt (>=5)', value: submissions.filter(s => s.score >= 5).length },
    { name: 'Không đạt (<5)', value: submissions.filter(s => s.score < 5).length },
  ];

  const failedQuestionsStats = questions.map((q, qIdx) => {
    const failCount = submissions.filter(s => s.answers[qIdx] !== q.correctAnswer).length;
    return {
      text: q.text,
      failCount,
      failRate: submissions.length > 0 ? (failCount / submissions.length) * 100 : 0
    };
  }).sort((a, b) => b.failCount - a.failCount).slice(0, 5);

  const COLORS = ['#10b981', '#f43f5e'];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/teacher')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-slate-900">{testId ? 'Chỉnh sửa Bài kiểm tra' : 'Tạo Bài kiểm tra mới'}</h1>
        </div>
        <button 
          onClick={handleSaveTest}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm"
        >
          {saving ? <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" /> : <Save size={20} />}
          Lưu bài kiểm tra
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('info')}
            className={`px-6 py-4 flex items-center gap-2 font-medium transition-colors border-b-2 ${activeTab === 'info' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Settings size={18} /> Thông tin chung
          </button>
          <button 
            onClick={() => setActiveTab('questions')}
            className={`px-6 py-4 flex items-center gap-2 font-medium transition-colors border-b-2 ${activeTab === 'questions' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <List size={18} /> Câu hỏi ({questions.length})
          </button>
          {testId && (
            <>
              <button 
                onClick={() => setActiveTab('results')}
                className={`px-6 py-4 flex items-center gap-2 font-medium transition-colors border-b-2 ${activeTab === 'results' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <BarChart2 size={18} /> Kết quả ({submissions.length})
              </button>
              <button 
                onClick={() => setActiveTab('share')}
                className={`px-6 py-4 flex items-center gap-2 font-medium transition-colors border-b-2 ${activeTab === 'share' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <QrCode size={18} /> Chia sẻ
              </button>
            </>
          )}
        </div>

        <div className="p-8">
          {activeTab === 'info' && (
            <div className="max-w-2xl space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Tên bài kiểm tra</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nhập tên bài kiểm tra..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Thời gian làm bài (phút)</label>
                  <input 
                    type="number" 
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Trạng thái</label>
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'open' | 'closed')}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  >
                    <option value="closed">Đóng (Ẩn với sinh viên)</option>
                    <option value="open">Mở (Cho phép làm bài)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="space-y-8">
              <div className="flex flex-wrap gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex-grow flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Chủ đề tạo bằng AI (VD: Lịch sử AI, Python cơ bản...)"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    className="flex-grow px-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                  />
                  <select 
                    value={aiCount}
                    onChange={(e) => setAiCount(parseInt(e.target.value))}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none"
                  >
                    <option value={5}>5 câu</option>
                    <option value={10}>10 câu</option>
                    <option value={20}>20 câu</option>
                  </select>
                  <button 
                    onClick={handleGenerateAI}
                    disabled={aiLoading || !aiTopic}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {aiLoading ? <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" /> : <Sparkles size={18} />}
                    Tạo bằng AI
                  </button>
                </div>
                <div className="h-10 w-px bg-slate-200 hidden md:block" />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg font-medium hover:bg-slate-50"
                >
                  <FileText size={18} /> Nhập từ Word
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".docx" 
                  className="hidden" 
                />
              </div>

              <div className="space-y-6">
                {questions.map((q, qIndex) => (
                  <div key={qIndex} className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 relative group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-grow space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Câu hỏi {qIndex + 1}</label>
                        <textarea 
                          value={q.text}
                          onChange={(e) => handleUpdateQuestion(qIndex, 'text', e.target.value)}
                          placeholder="Nhập nội dung câu hỏi..."
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none min-h-[80px]"
                        />
                      </div>
                      <button 
                        onClick={() => handleRemoveQuestion(qIndex)}
                        className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {q.options.map((opt, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-3">
                          <button 
                            onClick={() => handleUpdateQuestion(qIndex, 'correctAnswer', oIndex)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all ${
                              q.correctAnswer === oIndex 
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' 
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            {String.fromCharCode(65 + oIndex)}
                          </button>
                          <input 
                            type="text" 
                            value={opt}
                            onChange={(e) => handleUpdateOption(qIndex, oIndex, e.target.value)}
                            placeholder={`Phương án ${String.fromCharCode(65 + oIndex)}`}
                            className={`flex-grow px-4 py-2 rounded-xl border outline-none transition-all ${
                              q.correctAnswer === oIndex 
                                ? 'bg-emerald-50 border-emerald-200 focus:border-emerald-500' 
                                : 'bg-slate-50 border-slate-100 focus:border-indigo-500'
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <button 
                  onClick={handleAddQuestion}
                  className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-medium hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={20} /> Thêm câu hỏi thủ công
                </button>
              </div>
            </div>
          )}

          {activeTab === 'results' && (
            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                  <div className="flex items-center gap-3 text-indigo-600 mb-2">
                    <Users size={20} />
                    <span className="font-semibold">Tổng số sinh viên</span>
                  </div>
                  <div className="text-3xl font-bold text-slate-900">{submissions.length}</div>
                </div>
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                  <div className="flex items-center gap-3 text-emerald-600 mb-2">
                    <Check size={20} />
                    <span className="font-semibold">Điểm trung bình</span>
                  </div>
                  <div className="text-3xl font-bold text-slate-900">
                    {submissions.length > 0 
                      ? (submissions.reduce((acc, s) => acc + s.score, 0) / submissions.length).toFixed(2) 
                      : 0}
                  </div>
                </div>
                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                  <div className="flex items-center gap-3 text-amber-600 mb-2">
                    <Clock size={20} />
                    <span className="font-semibold">Tỷ lệ đạt ({'>='}5)</span>
                  </div>
                  <div className="text-3xl font-bold text-slate-900">
                    {submissions.length > 0 
                      ? ((submissions.filter(s => s.score >= 5).length / submissions.length) * 100).toFixed(1) 
                      : 0}%
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                  <h3 className="font-bold text-slate-900 mb-6">Phân bố điểm số</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={scoreDistribution}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                  <h3 className="font-bold text-slate-900 mb-6">Tỷ lệ Đạt / Không đạt</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={passFailData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {passFailData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <AlertCircle className="text-rose-500" size={20} />
                  Thống kê các câu hỏi bị sai nhiều nhất
                </h3>
                <div className="space-y-4">
                  {failedQuestionsStats.length > 0 ? failedQuestionsStats.map((stat, i) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                      <div className="flex-grow pr-4">
                        <div className="text-sm font-medium text-slate-900 line-clamp-2">{stat.text}</div>
                        <div className="text-xs text-slate-500 mt-1">Tỷ lệ sai: {stat.failRate.toFixed(1)}%</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold text-rose-600">{stat.failCount}</div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Lượt sai</div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-slate-400 italic">Chưa có dữ liệu thống kê</div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Danh sách chi tiết</h3>
                  <button 
                    onClick={exportToExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                  >
                    <Download size={18} /> Xuất Excel
                  </button>
                </div>
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Họ và tên</th>
                        <th className="px-6 py-4">Mã sinh viên</th>
                        <th className="px-6 py-4 text-center">Điểm số</th>
                        <th className="px-6 py-4 text-right">Thời gian nộp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {submissions.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-medium text-slate-900">{s.studentName}</td>
                          <td className="px-6 py-4 text-slate-600">{s.studentId}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`font-bold ${s.score >= 5 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {s.score.toFixed(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-slate-400 text-sm">
                            {s.submittedAt.toDate().toLocaleString('vi-VN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'share' && (
            <div className="max-w-md mx-auto py-8 space-y-8 text-center">
              <div className="bg-white p-8 rounded-3xl shadow-xl shadow-indigo-100 border border-slate-100 inline-block">
                <QRCodeSVG value={testUrl} size={200} level="H" includeMargin />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Link bài kiểm tra</h3>
                <div className="flex gap-2 p-2 bg-slate-100 rounded-xl border border-slate-200">
                  <input 
                    type="text" 
                    readOnly 
                    value={testUrl}
                    className="flex-grow bg-transparent px-3 py-2 text-sm text-slate-600 outline-none"
                  />
                  <button 
                    onClick={copyLink}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                      copied ? 'bg-emerald-500 text-white' : 'bg-white text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Đã chép' : 'Sao chép'}
                  </button>
                </div>
              </div>

              <p className="text-slate-500 text-sm">
                Sinh viên có thể quét mã QR hoặc truy cập đường link trên để bắt đầu làm bài. 
                Đảm bảo trạng thái bài kiểm tra là <strong>"Đang mở"</strong>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
