import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { AdminLayout } from './components/AdminLayout';
import { Layout } from './components/Layout';
import { Spinner } from './components/ui';
import { useAuth } from './lib/auth';
import { AdminAssessments } from './pages/admin/Assessments';
import { AdminCertificates } from './pages/admin/Certificates';
import { AdminCommunication } from './pages/admin/Communication';
import { AdminContent } from './pages/admin/Content';
import { AdminCourseEditor } from './pages/admin/CourseEditor';
import { AdminEmails } from './pages/admin/Emails';
import { AdminLogs } from './pages/admin/Logs';
import { AdminOverview } from './pages/admin/Overview';
import { AdminQuestions } from './pages/admin/Questions';
import { AdminReports } from './pages/admin/Reports';
import { AdminSettings } from './pages/admin/Settings';
import { AdminUsers } from './pages/admin/Users';
import { ForgotPassword, Login, Register, ResetPassword } from './pages/public/Auth';
import { Catalog } from './pages/public/Catalog';
import { CourseDetail } from './pages/public/CourseDetail';
import { Events } from './pages/public/Events';
import { NotFound } from './pages/public/NotFound';
import { TrailDetail } from './pages/public/TrailDetail';
import { ValidateCertificate } from './pages/public/ValidateCertificate';
import { AssessmentPage } from './pages/student/Assessment';
import { Certificates } from './pages/student/Certificates';
import { Compare } from './pages/student/Compare';
import { Connections } from './pages/student/Connections';
import { Dashboard } from './pages/student/Dashboard';
import { Journey } from './pages/student/Journey';
import { Learn } from './pages/student/Learn';
import { LessonPage } from './pages/student/Lesson';
import { Messages } from './pages/student/Messages';
import { Notifications } from './pages/student/Notifications';
import { Profile } from './pages/student/Profile';
import { Quests } from './pages/student/Quests';
import { Ranking } from './pages/student/Ranking';
import { Onboarding } from './pages/start/Onboarding';
import { TitleScreen } from './pages/start/TitleScreen';

function RequireAuth({ children, admin }: { children: ReactNode; admin?: boolean }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <Spinner />;
  if (!user) return <Navigate to={`/entrar?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/painel" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      {/* Telas de jogo em tela cheia: início, novo jogo e acesso */}
      <Route index element={<TitleScreen />} />
      <Route path="comecar" element={<Onboarding />} />
      <Route path="entrar" element={<Login />} />
      <Route path="cadastro" element={<Register />} />
      <Route path="esqueci-senha" element={<ForgotPassword />} />
      <Route path="redefinir-senha" element={<ResetPassword />} />

      <Route element={<Layout />}>
        {/* Visitante */}
        <Route path="cursos" element={<Catalog />} />
        <Route path="cursos/:slug" element={<CourseDetail />} />
        <Route path="trilhas/:slug" element={<TrailDetail />} />
        <Route path="eventos" element={<Events />} />
        <Route path="validar" element={<ValidateCertificate />} />
        <Route path="validar/:code" element={<ValidateCertificate />} />

        {/* Aluno */}
        <Route path="painel" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="jornada" element={<RequireAuth><Journey /></RequireAuth>} />
        <Route path="missoes" element={<RequireAuth><Quests /></RequireAuth>} />
        <Route path="aprender/:slug" element={<RequireAuth><Learn /></RequireAuth>} />
        <Route path="aprender/:slug/aula/:lessonId" element={<RequireAuth><LessonPage /></RequireAuth>} />
        <Route path="avaliacoes/:id" element={<RequireAuth><AssessmentPage /></RequireAuth>} />
        <Route path="certificados" element={<RequireAuth><Certificates /></RequireAuth>} />
        <Route path="perfil" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="ranking" element={<RequireAuth><Ranking /></RequireAuth>} />
        <Route path="conexoes" element={<RequireAuth><Connections /></RequireAuth>} />
        <Route path="conexoes/comparar/:id" element={<RequireAuth><Compare /></RequireAuth>} />
        <Route path="notificacoes" element={<RequireAuth><Notifications /></RequireAuth>} />
        <Route path="mensagens" element={<RequireAuth><Messages /></RequireAuth>} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Administrador */}
      <Route path="admin" element={<RequireAuth admin><AdminLayout /></RequireAuth>}>
        <Route index element={<AdminOverview />} />
        <Route path="usuarios" element={<AdminUsers />} />
        <Route path="conteudo" element={<AdminContent />} />
        <Route path="conteudo/cursos/:id" element={<AdminCourseEditor />} />
        <Route path="questoes" element={<AdminQuestions />} />
        <Route path="avaliacoes" element={<AdminAssessments />} />
        <Route path="comunicacao" element={<AdminCommunication />} />
        <Route path="certificados" element={<AdminCertificates />} />
        <Route path="relatorios" element={<AdminReports />} />
        <Route path="logs" element={<AdminLogs />} />
        <Route path="emails" element={<AdminEmails />} />
        <Route path="configuracoes" element={<AdminSettings />} />
      </Route>
    </Routes>
  );
}
