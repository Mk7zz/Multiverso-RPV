import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { BRAND } from '../../brand';
import { PixelIcon } from '../../components/PixelIcon';
import { ErrorBox, Field } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { MUNICIPALITIES } from '../../lib/format';
import { useDocumentTitle } from '../../lib/hooks';
import { homeFor, maskCnpj, SIZE_LABEL } from '../../lib/partners';
import type { User } from '../../lib/types';
import { GameShell } from '../start/TitleScreen';

const SECTORS = ['Tecnologia da informação', 'Indústria', 'Agronegócio', 'Comércio e varejo', 'Serviços', 'Energia', 'Saúde', 'Educação', 'Construção', 'Logística', 'Design e comunicação'];

export function CompanyRegister() {
  useDocumentTitle('Cadastro de empresa parceira');
  const { user, acceptToken } = useAuth();
  const navigate = useNavigate();
  const [company, setCompany] = useState({ name: '', legal_name: '', cnpj: '', sector: '', size: '', municipality: '', website: '', contact_phone: '', description: '' });
  const [resp, setResp] = useState({ name: '', job_title: '', email: '', password: '', confirm: '' });
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const setC = (k: keyof typeof company) => (e: { target: { value: string } }) =>
    setCompany({ ...company, [k]: k === 'cnpj' ? maskCnpj(e.target.value) : e.target.value });
  const setR = (k: keyof typeof resp) => (e: { target: { value: string } }) => setResp({ ...resp, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (resp.password !== resp.confirm) return setError('As senhas não conferem.');
    setBusy(true);
    try {
      const website = company.website && !/^https?:\/\//.test(company.website) ? `https://${company.website}` : company.website;
      const r = await api.post<{ token: string; user: User }>('/partners/register', {
        company: { ...company, website, size: company.size || undefined },
        responsible: { name: resp.name, job_title: resp.job_title, email: resp.email, password: resp.password },
        accept_terms: terms,
      });
      acceptToken(r.token, r.user);
      navigate('/empresa', { replace: true });
    } catch (err) {
      setError((err as Error).message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <GameShell wide>
      <form className="px-panel stack" onSubmit={submit}>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <PixelIcon name="building" size={40} />
          <div>
            <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Cadastro de empresa parceira</h1>
            <p className="muted" style={{ margin: 0 }}>
              Depois da aprovação da equipe do {BRAND.name}, sua empresa acessa a vitrine de talentos e publica oportunidades.
            </p>
          </div>
        </div>
        <ErrorBox error={error} />

        <h3 style={{ margin: '8px 0 0' }}>Empresa</h3>
        <div className="form-grid">
          <Field label="Nome da empresa">
            <input className="input" required value={company.name} onChange={setC('name')} autoFocus />
          </Field>
          <Field label="CNPJ">
            <input className="input" required inputMode="numeric" placeholder="00.000.000/0000-00" value={company.cnpj} onChange={setC('cnpj')} />
          </Field>
          <Field label="Razão social" hint="Opcional">
            <input className="input" value={company.legal_name} onChange={setC('legal_name')} />
          </Field>
          <Field label="Setor de atuação">
            <input className="input" required list="sectors" value={company.sector} onChange={setC('sector')} />
            <datalist id="sectors">{SECTORS.map((s) => <option key={s} value={s} />)}</datalist>
          </Field>
          <Field label="Porte">
            <select className="input" value={company.size} onChange={setC('size')}>
              <option value="">Selecione</option>
              {Object.entries(SIZE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Município">
            <input className="input" required list="mun-company" value={company.municipality} onChange={setC('municipality')} />
            <datalist id="mun-company">{MUNICIPALITIES.map((m) => <option key={m} value={m} />)}</datalist>
          </Field>
          <Field label="Site" hint="Opcional">
            <input className="input" placeholder="www.suaempresa.com.br" value={company.website} onChange={setC('website')} />
          </Field>
          <Field label="Telefone de contato" hint="Mostrado só para quem aceitar seu convite">
            <input className="input" type="tel" value={company.contact_phone} onChange={setC('contact_phone')} />
          </Field>
          <Field label="Sobre a empresa" hint="O que vocês fazem e que tipo de talento procuram" className="full">
            <textarea className="input" maxLength={1000} value={company.description} onChange={setC('description')} />
          </Field>
        </div>

        <h3 style={{ margin: '8px 0 0' }}>Responsável pelo acesso</h3>
        <div className="form-grid">
          <Field label="Nome completo">
            <input className="input" required autoComplete="name" value={resp.name} onChange={setR('name')} />
          </Field>
          <Field label="Cargo">
            <input className="input" placeholder="RH, sócio(a), gestor(a)…" value={resp.job_title} onChange={setR('job_title')} />
          </Field>
          <Field label="E-mail corporativo" className="full">
            <input className="input" type="email" required autoComplete="email" value={resp.email} onChange={setR('email')} />
          </Field>
          <Field label="Senha" hint="Mínimo de 8 caracteres">
            <input className="input" type="password" required minLength={8} autoComplete="new-password" value={resp.password} onChange={setR('password')} />
          </Field>
          <Field label="Confirmar senha">
            <input className="input" type="password" required minLength={8} autoComplete="new-password" value={resp.confirm} onChange={setR('confirm')} />
          </Field>
        </div>

        <label className="terms-box">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
          <span className="small">
            Declaro que as informações são verdadeiras e que a empresa vai usar os dados dos talentos <strong>somente para recrutamento</strong>, de acordo com a
            LGPD, sem qualquer tipo de discriminação, e respeitando a legislação de estágio e aprendizagem.
          </span>
        </label>

        <button className="btn block lg accent" disabled={busy || !terms}>
          {busy ? 'Enviando…' : 'Enviar cadastro para aprovação'}
        </button>
        <p className="center small" style={{ margin: 0 }}>
          Já tem acesso? <Link to="/entrar?next=/empresa">Entrar</Link> · <Link to="/empresas">Voltar para a página de empresas</Link>
        </p>
      </form>
    </GameShell>
  );
}
