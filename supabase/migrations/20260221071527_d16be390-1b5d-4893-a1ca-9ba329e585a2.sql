
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('teacher', 'student');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Attendance sessions table
CREATE TABLE public.attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sessions" ON public.attendance_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can create sessions" ON public.attendance_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = teacher_id AND public.has_role(auth.uid(), 'teacher'));

-- Attendance records table
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.attendance_sessions(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  student_name TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  device_fingerprint TEXT,
  UNIQUE (session_id, student_id)
);
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read records" ON public.attendance_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Students can insert own records" ON public.attendance_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);

-- Enable realtime for live counter
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
