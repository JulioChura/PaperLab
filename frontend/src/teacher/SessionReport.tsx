import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Download, Info, Lightbulb, Plus, TriangleAlert } from 'lucide-react';
import { missionById } from '../game/missions';
import { errorLabel } from '../tutor/types';
import { fmtDur, teacher } from '../classroom/teacherStore';
import { computeStats, insights, sessionCsv } from '../classroom/stats';
import type { Session } from '../classroom/types';
import { BarList, Histogram, ProgressChart, Ring } from './charts';
import { Avatar, Card, Empty, Stat, StatusPill } from './parts';

export const SessionReport: React.FC<{ session: Session }> = ({ session }) => {
  const st = useMemo(() => computeStats(session), [session]);
  const notes = useMemo(() => insights(session, st), [session, st]);
  const [sort, setSort] = useState<'name' | 'attempts' | 'errors' | 'solved'>('solved');
  const [view, setView] = useState<'chart' | 'table'>('chart');

  const rows = session.students
    .filter((s) => s.joinedAt !== null)
    .map((s) => ({
      s,
      solved: Object.keys(s.solvedAt).length,
      errors: s.attempts.filter((a) => !a.ok).length,
      time: Object.keys(s.solvedAt).reduce((acc, id) => acc + (s.solvedAt[id] - (s.startedAt[id] ?? s.solvedAt[id])), 0),
    }))
    .sort((a, b) =>
      sort === 'name' ? a.s.name.localeCompare(b.s.name) : sort === 'attempts' ? b.s.attempts.length - a.s.attempts.length : sort === 'errors' ? b.errors - a.errors : b.solved - a.solved || a.time - b.time,
    );

  const download = () => {
    const blob = new Blob(['﻿' + sessionCsv(session)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `paperlab-${session.code}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const ICON = { good: CheckCircle2, warn: TriangleAlert, info: Info } as const;
  const TONE = { good: 'bg-[#cdf5e1] text-[#0b4732]', warn: 'bg-[#fff2c2] text-[#633d11]', info: 'bg-[#dde3ff] text-[#1b2878]' } as const;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 text-left">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <button onClick={() => teacher.close()} className="juicy ink-chip inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-telemetry cursor-pointer mb-4">
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={3} /> Mis sesiones
          </button>
          <p className="font-telemetry text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
            Reporte · {new Date(session.createdAtMs).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })} · {session.code}
          </p>
          <h2 className="font-display text-4xl sm:text-5xl leading-none mt-1">{session.config.name}</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={download} data-juice className="juicy btn-ink px-4 py-2.5 text-sm bg-[var(--surface)] text-[var(--ink)]" data-testid="export-csv">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
          <button onClick={() => teacher.close()} data-juice="big" className="juicy btn-ink px-4 py-2.5 text-sm bg-[var(--riso-yellow)] text-[#211a33]">
            <Plus className="w-4 h-4" /> Nueva sesión
          </button>
        </div>
      </div>

      {/* titular */}
      <div className="ink-card p-5 sm:p-6 mb-5 flex flex-col md:flex-row items-start md:items-center gap-5 pop-in">
        <Ring value={st.joined ? st.solvedAll / st.joined : 0} size={110} label="Completaron todas las misiones" />
        <div className="flex-1">
          <p className="font-heading text-2xl sm:text-3xl leading-tight">
            {st.solvedAll} de {st.joined} alumnos completaron {session.config.missionIds.length > 1 ? 'todas las misiones' : 'la misión'}
          </p>
          <p className="text-[var(--text-secondary)] mt-1">
            en {fmtDur(st.elapsed)} de clase · {st.attempts} escaneos · {st.attempts - st.okAttempts} errores detectados por Lumi
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Stat i={0} label="Al primer intento" value={`${Math.round(st.firstTryRate * 100)}%`} accent="#2f4bf0" />
        <Stat i={1} label="Corrigieron su error" value={`${Math.round(st.recoveryRate * 100)}%`} sub={`${st.recovered}/${st.hadError}`} accent="#12a96e" />
        <Stat i={2} label="Tiempo mediano" value={st.medianSolveSec ? fmtDur(st.medianSolveSec) : '—'} accent="#ffc81f" />
        <Stat i={3} label="Pistas" value={st.hintsLumi + st.hintsTeacher} sub={`${st.hintsLumi} de Lumi · ${st.hintsTeacher} tuyas`} accent="#ff4f9e" />
      </div>

      {/* conclusiones */}
      <Card className="mb-5" title={<span className="flex items-center gap-2"><Lightbulb className="w-4 h-4" /> Lo que te dice esta clase</span>}>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="insights">
          {notes.map((n, k) => {
            const Icon = ICON[n.tone];
            return (
              <li key={k} className={`pop-in rounded-2xl border-2 border-[#211a33] p-4 ${TONE[n.tone]}`} style={{ ['--i' as string]: k }}>
                <p className="font-heading text-base leading-snug flex gap-2"><Icon className="w-5 h-5 shrink-0" />{n.title}</p>
                <p className="text-[13px] mt-1.5 leading-snug">{n.body}</p>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
        <Card
          className="lg:col-span-7"
          title="Progreso durante la clase"
          right={
            <div className="flex gap-1 font-telemetry text-[10px]">
              {(['chart', 'table'] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={`px-2 py-0.5 rounded-full border-[1.5px] border-[var(--ink)] cursor-pointer ${view === v ? 'bg-[var(--ink)] text-[var(--bg-ground)]' : ''}`}>
                  {v === 'chart' ? 'Gráfico' : 'Tabla'}
                </button>
              ))}
            </div>
          }
        >
          {view === 'chart' ? (
            <ProgressChart data={session.timeline} />
          ) : (
            <div className="max-h-[240px] overflow-y-auto">
              <table className="w-full text-[12px] font-telemetry">
                <thead className="text-[var(--text-secondary)]"><tr><th className="text-left py-1">Minuto</th><th className="text-right">Intentos</th><th className="text-right">Resueltas</th></tr></thead>
                <tbody>
                  {session.timeline.filter((_, i) => i % 3 === 0).map((p) => (
                    <tr key={p.t} className="border-t border-[var(--ink)]/10"><td className="py-1">{Math.floor(p.t / 60)}′</td><td className="text-right">{p.attempts}</td><td className="text-right">{p.solved}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card className="lg:col-span-5" title="¿Cuánto tardaron en resolver?">
          <Histogram values={st.solveTimes} />
          <p className="font-telemetry text-[10px] text-[var(--text-secondary)] mt-1">Alumnos por minuto de resolución (por misión)</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
        <Card className="lg:col-span-6" title="Errores de la clase">
          {!st.errors.length && <Empty>No hubo errores. ¡Clase perfecta!</Empty>}
          <BarList
            data={st.errors.slice(0, 7).map((e) => ({
              key: `${e.missionId}:${e.code}`,
              label: e.label,
              sub: e.misconception,
              value: e.students,
              display: `${Math.round(e.share * 100)}%`,
              tip: `Sugerencia: ${e.action}`,
            }))}
            max={Math.max(1, st.attempted)}
          />
        </Card>
        <Card className="lg:col-span-6" title="Por misión">
          <ul className="space-y-3">
            {st.perMission.map((m, k) => (
              <li key={m.id} className="rounded-2xl border-2 border-[var(--ink)] bg-[var(--surface-secondary)] px-4 py-3">
                <p className="font-heading text-sm">{k + 1}. {m.title}</p>
                <p className="text-[12px] text-[var(--text-secondary)]">{missionById(m.id)?.goal}</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex-1 h-2.5 rounded-full bg-[var(--chart-track)] overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--chart-b)]" style={{ width: `${st.joined ? (m.solved / st.joined) * 100 : 0}%` }} />
                  </div>
                  <span className="font-telemetry text-[11px] shrink-0">{m.solved}/{st.joined} · {m.avgSec ? fmtDur(m.avgSec) : '—'}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Detalle por alumno" pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]" data-testid="report-table">
            <thead>
              <tr className="text-left font-telemetry text-[10px] uppercase text-[var(--text-secondary)] border-b-2 border-[var(--ink)]">
                {(
                  [
                    ['name', 'Alumno'],
                    ['solved', 'Misiones'],
                    ['attempts', 'Intentos'],
                    ['errors', 'Errores'],
                  ] as const
                ).map(([k, l]) => (
                  <th key={k} className="px-4 py-2">
                    <button onClick={() => setSort(k)} className={`cursor-pointer uppercase ${sort === k ? 'text-[var(--ink)] underline' : ''}`}>{l}</button>
                  </th>
                ))}
                <th className="px-4 py-2">Tiempo</th>
                <th className="px-4 py-2">Último error</th>
                <th className="px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ s, solved, errors, time }) => (
                <tr key={s.id} className="border-b border-[var(--ink)]/10">
                  <td className="px-4 py-2"><span className="flex items-center gap-2"><Avatar s={s} size={26} />{s.name}</span></td>
                  <td className="px-4 py-2 font-telemetry">{solved}/{session.config.missionIds.length}</td>
                  <td className="px-4 py-2 font-telemetry">{s.attempts.length}</td>
                  <td className="px-4 py-2 font-telemetry">{errors}</td>
                  <td className="px-4 py-2 font-telemetry">{solved ? fmtDur(time) : '—'}</td>
                  <td className="px-4 py-2 text-[var(--text-secondary)]">{s.lastError ? errorLabel(s.lastError) : '—'}</td>
                  <td className="px-4 py-2"><StatusPill status={s.status} small /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
