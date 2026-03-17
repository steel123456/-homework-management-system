export interface User {
  id: string;
  email: string;
  name: string;
  role: 'teacher' | 'student';
  avatar?: string;
  created_at: string;
}

export interface Class {
  id: string;
  name: string;
  description?: string;
  code: string;
  teacher_id: string;
  created_at: string;
}

export interface Assignment {
  id: string;
  class_id: string;
  title: string;
  description?: string;
  requirements?: string;
  due_date?: string;
  teacher_id: string;
  status: 'active' | 'closed' | 'archived';
  created_at: string;
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  content?: string;
  image_url?: string;
  image_key?: string;
  status: 'submitted' | 'grading' | 'graded';
  score?: number;
  feedback?: string;
  submitted_at: string;
  graded_at?: string;
}

export interface ClassMember {
  id: string;
  class_id: string;
  student_id: string;
  joined_at: string;
  student?: User;
}
