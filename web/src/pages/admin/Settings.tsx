import { useEffect, useState } from 'react';
import { ErrorBox, Field, Loader } from '../../components/ui';
import { api } from '../../lib/api';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import { useNotifications } from '../../lib/notifications';

type Settings = Record<string, string>;

const GROUPS: { title: string; fields: { key: string; label: string; hint?: string; type?: 'number' | 'bool' | 'text' }[] }[] = [
  {
    title: 'Plataforma',
    fields: [
      { key: 'platform_name', label: 'Nome da plataforma' },
      { key: 'platform_tagline', label: 'Slogan' },
      { key: 'support_email', label: 'E-mail de suporte' },
      { key: 'allow_registration', label: 'Permitir novos cadastros', type: 'bool' },
    ],
  },
  {
    title: 'Certificado',
    fields: [
      { key: 'certificate_signer_name', label: 'Assinatura (nome)' },
      { key: 'certificate_signer_role', label: 'Assinatura (cargo / instituição)' },
    ],
  },
  {
    title: 'Indicadores',
    fields: [
      { key: 'active_days', label: 'Janela de "aluno ativo" (dias)', type: 'number' },
      { key: 'abandonment_days', label: 'Considerar abandono após (dias sem acesso)', type: 'number' },
    ],
  },
  {
    title: 'Gamificação: pontos por ação',
    fields: [
      { key: 'points_lesson', label: 'Aula concluída', type: 'number' },
      { key: 'points_exercise', label: 'Exercício realizado', type: 'number' },
      { key: 'points_quiz_pass', label: 'Avaliação aprovada', type: 'number' },
      { key: 'points_course_complete', label: 'Curso concluído', type: 'number' },
      { key: 'points_daily_study', label: 'Dia de estudo (streak)', type: 'number' },
    ],
  },
  {
    title: 'Gamificação: missões',
    fields: [
      { key: 'points_quest_daily', label: 'Recompensa de missão diária (XP)', type: 'number' },
      { key: 'points_quest_chest', label: 'Baú do Vale: 3 diárias resgatadas (XP)', type: 'number' },
      { key: 'points_quest_weekly', label: 'Recompensa de missão semanal (XP)', type: 'number' },
    ],
  },
];

export function AdminSettings() {
  useDocumentTitle('Configurações');
  const { data, error } = useApi<{ settings: Settings }>('/admin/settings');
  const [form, setForm] = useState<Settings>({});
  const [err, setErr] = useState<string | null>(null);
  const { toast } = useNotifications();
  useEffect(() => {
    if (data) setForm(data.settings);
  }, [data]);

  async function save() {
    setErr(null);
    try {
      const r = await api.put<{ settings: Settings }>('/admin/settings', form);
      setForm(r.settings);
      toast('Configurações salvas');
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <>
      <div className="section-head">
        <h1 style={{ margin: 0 }}>Configurações</h1>
        <button className="btn" onClick={save}>Salvar alterações</button>
      </div>
      <ErrorBox error={err} />
      <Loader data={data} error={error}>
        {() => (
          <div className="grid grid-2">
            {GROUPS.map((g) => (
              <div key={g.title} className="card stack">
                <h3 style={{ margin: 0 }}>{g.title}</h3>
                {g.fields.map((f) =>
                  f.type === 'bool' ? (
                    <label key={f.key} className="check">
                      <input type="checkbox" checked={form[f.key] === 'true'} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked ? 'true' : 'false' })} /> {f.label}
                    </label>
                  ) : (
                    <Field key={f.key} label={f.label} hint={f.hint}>
                      <input className="input" type={f.type === 'number' ? 'number' : 'text'} min={0} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                    </Field>
                  ),
                )}
              </div>
            ))}
          </div>
        )}
      </Loader>
    </>
  );
}
