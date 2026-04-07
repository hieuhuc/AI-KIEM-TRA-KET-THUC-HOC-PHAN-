import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Test } from '../types';
import { User, GraduationCap, Clock, List, ArrowRight, AlertCircle } from 'lucide-react';

export default function StudentView() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTest = async () => {
      if (!testId) return;
      try {
        const testDoc = await getDoc(doc(db, 'tests', testId));
        if (testDoc.exists()) {
          setTest({ id: testDoc.id, ...testDoc.data() } as Test);
        } else {
          setError('Không tìm thấy bài kiểm tra này.');
        }
      } catch (err) {
        console.error(err);
        setError('Lỗi khi tải thông tin bài kiểm tra.');
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [testId]);

  const handleStart = () => {
    if (!studentName.trim() || !studentId.trim()) {
      setError('Vui lòng nhập đầy đủ Họ tên và Mã sinh viên.');
      return;
    }
    
    // Store student info in session storage for the test taker
    sessionStorage.setItem(`student_${testId}`, JSON.stringify({ studentName, studentId }));
    navigate(`/test/${testId}/take`);
  };

  if (loading) return <div className="p-12 text-center">Đang tải...</div>;

  if (error || !test) {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-6">
        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 mx-auto">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">{error || 'Bài kiểm tra không khả dụng'}</h2>
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-indigo-600 text-white rounded-lg">Quay lại trang chủ</button>
      </div>
    );
  }

  if (test.status === 'closed') {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-6">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mx-auto">
          <Clock size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Bài kiểm tra hiện đang đóng</h2>
        <p className="text-slate-500">Vui lòng liên hệ giảng viên để biết thêm chi tiết.</p>
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-indigo-600 text-white rounded-lg">Quay lại trang chủ</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12">
      <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100 border border-slate-100 overflow-hidden">
        <div className="bg-indigo-600 p-8 text-white text-center">
          <h1 className="text-3xl font-bold mb-2">{test.title}</h1>
          <div className="flex items-center justify-center gap-6 text-indigo-100 text-sm font-medium">
            <div className="flex items-center gap-1.5"><Clock size={16} /> {test.duration} phút</div>
            <div className="flex items-center gap-1.5"><GraduationCap size={16} /> Sinh viên</div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Họ và tên</label>
              <input 
                type="text" 
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Nhập họ và tên đầy đủ..."
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Mã sinh viên</label>
              <input 
                type="text" 
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Nhập mã số sinh viên..."
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-medium flex items-center gap-2">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          <button 
            onClick={handleStart}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
          >
            Bắt đầu kiểm tra <ArrowRight size={20} />
          </button>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center text-slate-400 text-xs">
          Lưu ý: Bạn chỉ có một lượt làm bài duy nhất. Không được tải lại trang khi đang làm bài.
        </div>
      </div>
    </div>
  );
}
