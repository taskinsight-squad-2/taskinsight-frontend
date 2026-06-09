'use client'

import React from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { AnalyticsResult } from '@/types/dashboard'
import type { DashboardTheme } from '@/hooks/useDashboardTheme'

interface AnalyticsProps {
  dark: boolean
  analytics: AnalyticsResult
  theme: DashboardTheme
}

export function Analytics({ dark, analytics, theme }: AnalyticsProps) {
  const { text, textFaint, cardBg } = theme

  return (
    <div className={`${cardBg} border rounded-2xl overflow-hidden`}>
      <div className={`px-5 pt-4 pb-3 border-b ${dark ? 'border-white/5' : 'border-slate-100'}`}>
        <p className={`text-sm font-semibold ${text}`}>Analytics</p>
        <p className={`text-xs ${textFaint} mt-0.5`}>Métricas geradas pela FastAPI</p>
      </div>

      <div className="px-3 sm:px-5 py-4 sm:py-5 space-y-6">

        {/* Status */}
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${textFaint} mb-3`}>Por Status</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total',     value: analytics.status!.data.total_tasks,      accent: 'text-violet-500' },
              { label: 'Pendente',  value: analytics.status!.data.PENDING.count,    accent: dark ? 'text-white/55' : 'text-slate-500', sub: `${analytics.status!.data.PENDING.percent}%` },
              { label: 'Andamento', value: analytics.status!.data.IN_PROGRESS.count, accent: 'text-blue-400', sub: `${analytics.status!.data.IN_PROGRESS.percent}%` },
              { label: 'Concluída', value: analytics.status!.data.DONE.count,       accent: 'text-emerald-400', sub: `${analytics.status!.data.DONE.percent}%` },
            ].map(s => (
              <div key={s.label} className={`${dark ? 'bg-white/[0.03] border-white/8' : 'bg-slate-50 border-slate-200'} border rounded-xl px-4 py-3`}>
                <p className={`text-[10px] font-semibold ${textFaint} uppercase tracking-widest`}>{s.label}</p>
                <p className={`text-xl font-black ${s.accent} leading-tight mt-1`}>{s.value}</p>
                {s.sub && <p className={`text-[10px] ${textFaint} mt-0.5`}>{s.sub}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Prioridade */}
        {analytics.priority && (
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${textFaint} mb-3`}>Por Prioridade</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Alta',  value: analytics.priority.data.HIGH.count,   sub: `${analytics.priority.data.HIGH.percent}%`,   accent: 'text-red-400'     },
                { label: 'Média', value: analytics.priority.data.MEDIUM.count, sub: `${analytics.priority.data.MEDIUM.percent}%`, accent: 'text-amber-400'   },
                { label: 'Baixa', value: analytics.priority.data.LOW.count,    sub: `${analytics.priority.data.LOW.percent}%`,    accent: 'text-emerald-400' },
              ].map(s => (
                <div key={s.label} className={`${dark ? 'bg-white/[0.03] border-white/8' : 'bg-slate-50 border-slate-200'} border rounded-xl px-4 py-3`}>
                  <p className={`text-[10px] font-semibold ${textFaint} uppercase tracking-widest`}>{s.label}</p>
                  <p className={`text-xl font-black ${s.accent} leading-tight mt-1`}>{s.value}</p>
                  <p className={`text-[10px] ${textFaint} mt-0.5`}>{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tempo médio */}
        {analytics.averageTime && (
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${textFaint} mb-3`}>Tempo Médio de Conclusão</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Horas', value: analytics.averageTime.data.average_time_hours.toFixed(1) },
                { label: 'Dias',  value: analytics.averageTime.data.average_time_days.toFixed(1)  },
              ].map(s => (
                <div key={s.label} className={`${dark ? 'bg-white/[0.03] border-white/8' : 'bg-slate-50 border-slate-200'} border rounded-xl px-4 py-3`}>
                  <p className={`text-[10px] font-semibold ${textFaint} uppercase tracking-widest`}>{s.label}</p>
                  <p className={`text-xl font-black ${text} leading-tight mt-1`}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Throughput */}
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${textFaint} mb-3`}>Throughput — Tarefas por Dia</p>
          {analytics.throughput?.data.length ? (
            <div className={`${dark ? 'bg-white/[0.03] border-white/8' : 'bg-slate-50 border-slate-200'} border rounded-xl p-4`}>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={analytics.throughput.data}>
                  <CartesianGrid stroke={dark ? 'rgba(255,255,255,.06)' : '#e2e8f0'} />
                  <XAxis dataKey="day" stroke={dark ? 'rgba(255,255,255,.3)' : '#94a3b8'} tick={{ fontSize: 11, fill: dark ? 'rgba(255,255,255,.4)' : '#64748b' }} />
                  <YAxis stroke={dark ? 'rgba(255,255,255,.3)' : '#94a3b8'} tick={{ fontSize: 11, fill: dark ? 'rgba(255,255,255,.4)' : '#64748b' }} />
                  <Tooltip contentStyle={{ backgroundColor: dark ? '#1a2030' : '#fff', border: `1px solid ${dark ? 'rgba(255,255,255,.1)' : '#e2e8f0'}`, borderRadius: '8px', color: dark ? '#fff' : '#1e293b', fontSize: 12 }} />
                  <Line type="monotone" dataKey="count" stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#7c3aed', r: 3 }} name="Concluídas" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={`${dark ? 'border-white/8 text-white/25' : 'border-slate-200 text-slate-400'} border border-dashed rounded-xl px-4 py-3 text-xs`}>Dados insuficientes</div>
          )}
        </div>

        {/* Backlog */}
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${textFaint} mb-3`}>Evolução do Backlog</p>
          {analytics.backlog?.data.length ? (
            <div className={`${dark ? 'bg-white/[0.03] border-white/8' : 'bg-slate-50 border-slate-200'} border rounded-xl p-4`}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.backlog.data}>
                  <CartesianGrid stroke={dark ? 'rgba(255,255,255,.06)' : '#e2e8f0'} />
                  <XAxis dataKey="date" stroke={dark ? 'rgba(255,255,255,.3)' : '#94a3b8'} tick={{ fontSize: 11, fill: dark ? 'rgba(255,255,255,.4)' : '#64748b' }} />
                  <YAxis stroke={dark ? 'rgba(255,255,255,.3)' : '#94a3b8'} tick={{ fontSize: 11, fill: dark ? 'rgba(255,255,255,.4)' : '#64748b' }} />
                  <Tooltip contentStyle={{ backgroundColor: dark ? '#1a2030' : '#fff', border: `1px solid ${dark ? 'rgba(255,255,255,.1)' : '#e2e8f0'}`, borderRadius: '8px', color: dark ? '#fff' : '#1e293b', fontSize: 12 }} />
                  <Bar dataKey="criadas"    fill="#6366f1" name="Criadas"    radius={[3,3,0,0]} />
                  <Bar dataKey="finalizadas" fill="#10b981" name="Finalizadas" radius={[3,3,0,0]} />
                  <Bar dataKey="backlog"    fill="#ef4444" name="Backlog"    radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={`${dark ? 'border-white/8 text-white/25' : 'border-slate-200 text-slate-400'} border border-dashed rounded-xl px-4 py-3 text-xs`}>Dados insuficientes</div>
          )}
        </div>

        {/* Response Time */}
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${textFaint} mb-3`}>SLA de Tempo de Resposta</p>
          {analytics.responseTime?.data.length ? (
            <div className={`${dark ? 'bg-white/[0.03] border-white/8' : 'bg-slate-50 border-slate-200'} border rounded-xl p-4`}>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={analytics.responseTime.data}>
                  <CartesianGrid stroke={dark ? 'rgba(255,255,255,.06)' : '#e2e8f0'} />
                  <XAxis dataKey="date" stroke={dark ? 'rgba(255,255,255,.3)' : '#94a3b8'} tick={{ fontSize: 11, fill: dark ? 'rgba(255,255,255,.4)' : '#64748b' }} />
                  <YAxis stroke={dark ? 'rgba(255,255,255,.3)' : '#94a3b8'} tick={{ fontSize: 11, fill: dark ? 'rgba(255,255,255,.4)' : '#64748b' }} unit="%" />
                  <Tooltip contentStyle={{ backgroundColor: dark ? '#1a2030' : '#fff', border: `1px solid ${dark ? 'rgba(255,255,255,.1)' : '#e2e8f0'}`, borderRadius: '8px', color: dark ? '#fff' : '#1e293b', fontSize: 12 }} formatter={(v) => typeof v === 'number' ? `${v}%` : ''} />
                  <Line type="monotone" dataKey="slaPercentage" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} name="SLA %" />
                  <Line type="monotone" dataKey="target" stroke={dark ? 'rgba(255,255,255,.3)' : '#94a3b8'} strokeWidth={1.5} strokeDasharray="5 3" dot={false} name="Meta" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={`${dark ? 'border-white/8 text-white/25' : 'border-slate-200 text-slate-400'} border border-dashed rounded-xl px-4 py-3 text-xs`}>Dados insuficientes</div>
          )}
        </div>

      </div>
    </div>
  )
}
