import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { User } from 'firebase/auth';
import { UserProfile } from '../types';
import { LogIn, GraduationCap, BookOpen, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HomeProps {
  user: User | null;
  profile: UserProfile | null;
}

export default function Home({ user, profile }: HomeProps) {
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/teacher');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
          Hệ thống Kiểm tra <span className="text-indigo-600">Trắc nghiệm AI</span>
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Giải pháp toàn diện cho giảng viên đại học tạo bài kiểm tra nhanh chóng với sự hỗ trợ của AI và file Word.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Teacher Section */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center hover:shadow-md transition-shadow">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-6">
            <GraduationCap size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Dành cho Giảng viên</h2>
          <p className="text-slate-600 mb-8 flex-grow">
            Đăng nhập để tạo bài kiểm tra, quản lý câu hỏi và xem thống kê kết quả của sinh viên.
          </p>
          
          {user && profile?.role === 'teacher' ? (
            <button 
              onClick={() => navigate('/teacher')}
              className="w-full py-3 px-6 bg-indigo-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
            >
              Vào Dashboard <ArrowRight size={20} />
            </button>
          ) : (
            <button 
              onClick={handleLogin}
              className="w-full py-3 px-6 bg-indigo-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
            >
              <LogIn size={20} /> Đăng nhập với Google
            </button>
          )}
        </div>

        {/* Student Section */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center hover:shadow-md transition-shadow">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-6">
            <BookOpen size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Dành cho Sinh viên</h2>
          <p className="text-slate-600 mb-8 flex-grow">
            Sử dụng đường link hoặc mã QR được giảng viên cung cấp để bắt đầu làm bài kiểm tra.
          </p>
          <div className="w-full p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 italic">
            Vui lòng truy cập qua link bài kiểm tra
          </div>
        </div>
      </div>

      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        <div>
          <h3 className="font-bold text-lg mb-2">Tạo câu hỏi bằng AI</h3>
          <p className="text-slate-500 text-sm">Tự động sinh câu hỏi trắc nghiệm theo chủ đề chỉ trong vài giây.</p>
        </div>
        <div>
          <h3 className="font-bold text-lg mb-2">Nhập từ file Word</h3>
          <p className="text-slate-500 text-sm">Hỗ trợ đọc và chuẩn hóa câu hỏi từ file .docx một cách chính xác.</p>
        </div>
        <div>
          <h3 className="font-bold text-lg mb-2">Thống kê trực quan</h3>
          <p className="text-slate-500 text-sm">Theo dõi phân bố điểm và tỷ lệ đạt/không đạt qua biểu đồ.</p>
        </div>
      </div>
    </div>
  );
}
