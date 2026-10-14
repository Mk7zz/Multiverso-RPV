import { Link } from 'react-router';
import type { CourseCard as Course } from '../lib/types';
import { PixelIcon } from './PixelIcon';
import { Progress } from './ui';

export function CourseCard({ course }: { course: Course }) {
  const enrolled = course.enrollment_status != null;
  return (
    <Link to={`/cursos/${course.slug}`} className="course-card">
      <div className="course-cover" style={{ backgroundImage: course.cover_url ? `url(${course.cover_url})` : undefined }}>
        {course.enrollment_status === 'completed' ? (
          <span className="pill success">✓ Concluído</span>
        ) : enrolled ? (
          <span className="pill gold">Em andamento</span>
        ) : (
          <span className="pill">Gratuito</span>
        )}
      </div>
      <div className="course-body">
        {course.trail_title && <span className="muted small">{course.trail_title}</span>}
        <h3>{course.title}</h3>
        {course.summary && <p className="text-2 small" style={{ margin: 0 }}>{course.summary}</p>}
        {enrolled && course.enrollment_status !== 'completed' && (
          <div className="stack" style={{ gap: 4 }}>
            <Progress value={course.enrollment_progress ?? 0} />
            <span className="muted small">{Math.round(course.enrollment_progress ?? 0)}% concluído</span>
          </div>
        )}
        <div className="course-meta">
          <span>
            <PixelIcon name="clock" size={14} /> {course.workload_hours}h
          </span>
          <span>
            <PixelIcon name="books" size={14} /> {course.lessons_count} aulas
          </span>
          {!!course.has_certificate && (
            <span>
              <PixelIcon name="scroll" size={14} /> Certificado
            </span>
          )}
          {course.rating != null && <span>★ {course.rating.toLocaleString('pt-BR')}</span>}
        </div>
      </div>
    </Link>
  );
}
