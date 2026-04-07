import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from './types';
import Layout from './components/Layout';
import Home from './components/Home';
import TeacherDashboard from './components/TeacherDashboard';
import TestCreator from './components/TestCreator';
import StudentView from './components/StudentView';
import TestTaker from './components/TestTaker';
import TestResult from './components/TestResult';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        } else {
          // Default to teacher for first login if needed, or handle role selection
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            role: 'teacher',
          };
          await setDoc(doc(db, 'users', user.uid), newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home user={user} profile={profile} />} />
          
          {/* Teacher Routes */}
          <Route 
            path="/teacher" 
            element={user && profile?.role === 'teacher' ? <TeacherDashboard user={user} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/teacher/test/:testId" 
            element={user && profile?.role === 'teacher' ? <TestCreator user={user} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/teacher/new" 
            element={user && profile?.role === 'teacher' ? <TestCreator user={user} /> : <Navigate to="/" />} 
          />

          {/* Student Routes */}
          <Route path="/test/:testId" element={<StudentView />} />
          <Route path="/test/:testId/take" element={<TestTaker />} />
          <Route path="/test/:testId/result" element={<TestResult />} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
}
