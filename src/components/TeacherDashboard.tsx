import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Test } from '../types';
import { Plus, Trash2, Edit, ExternalLink, BarChart2, Search, Filter, BookOpen } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { User } from 'firebase/auth';

interface TeacherDashboardProps {
  user: User;
}

export default function TeacherDashboard({ user }: TeacherDashboardProps) {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const q = query(collection(db, 'tests'), where('teacherId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const fetchedTests = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Test[];
        setTests(fetchedTests.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()));
      } catch (error) {
        console.error('Error fetching tests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, [user.uid]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bài kiểm tra này?')) {
      try {
        await deleteDoc(doc(db, 'tests', id));
        setTests(tests.filter(t => t.id !== id));
      } catch (error) {
        console.error('Error deleting test:', error);
      }
    }
  };

  const toggleStatus = async (test: Test) => {
    const newStatus = test.status === 'open' ? 'closed' : 'open';
    try {
      await updateDoc(doc(db, 'tests', test.id), { status: newStatus });
      setTests(tests.map(t => t.id === test.id ? { ...t, status: newStatus } : t));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const filteredTests = tests.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Quản lý Bài kiểm tra</h1>
          <p className="text-slate-500 mt-1">Tạo và quản lý các bài kiểm tra trắc nghiệm của bạn.</p>
        </div>
        <Link 
          to="/teacher/new"
          className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={20} /> Tạo bài mới
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm bài kiểm tra..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Filter size={18} />
            <span>Sắp xếp: Mới nhất</span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600"></div>
          </div>
        ) : filteredTests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm font-medium uppercase tracking-wider">
                  <th className="px-6 py-4">Tên bài kiểm tra</th>
                  <th className="px-6 py-4 text-center">Thời gian</th>
                  <th className="px-6 py-4 text-center">Trạng thái</th>
                  <th className="px-6 py-4 text-center">Ngày tạo</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTests.map((test) => (
                  <tr key={test.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{test.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">ID: {test.id}</div>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600">
                      {test.duration} phút
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => toggleStatus(test)}
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                          test.status === 'open' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {test.status === 'open' ? 'Đang mở' : 'Đã đóng'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-500 text-sm">
                      {test.createdAt.toDate().toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          to={`/teacher/test/${test.id}`}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Chỉnh sửa"
                        >
                          <Edit size={18} />
                        </Link>
                        <Link 
                          to={`/test/${test.id}`}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Xem link bài thi"
                        >
                          <ExternalLink size={18} />
                        </Link>
                        <button 
                          onClick={() => handleDelete(test.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="Xóa"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-4">
              <BookOpen size={32} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Chưa có bài kiểm tra nào</h3>
            <p className="text-slate-500 mt-1">Hãy bắt đầu bằng cách tạo bài kiểm tra đầu tiên của bạn.</p>
          </div>
        )}
      </div>
    </div>
  );
}
