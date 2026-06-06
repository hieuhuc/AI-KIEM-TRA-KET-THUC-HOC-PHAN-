import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'teacher' | 'student';
}

export interface Test {
  id: string;
  title: string;
  duration: number; // in minutes
  status: 'open' | 'closed';
  teacherId: string;
  createdAt: Timestamp;
}

export interface Question {
  id: string;
  testId: string;
  text: string;
  options: string[];
  correctAnswer: number; // 0-3
}

export interface Submission {
  id: string;
  testId: string;
  studentName: string;
  studentId: string;
  score: number;
  answers: number[];
  submittedAt: Timestamp;
}
