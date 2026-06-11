'use client'

import React, { useState } from 'react'
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { AnalyticsResult } from '@/types/dashboard'
import type { DashboardTheme } from '@/hooks/useDashboardTheme'
import { translations, type Locale } from '@/lib/i18n'

interface AnalyticsProps {
  dark: boolean
  locale: Locale
  analytics: AnalyticsResult | null
  theme: DashboardTheme
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: color + '22' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] font-bold tabular-nums w-5 text-right" style={{ color }}>{value}</span>
    </div>
  )
}

export function Analytics({ dark, locale, analytics, theme }: AnalyticsProps) {
  const { text, textFaint, cardBg } = theme
  const t = translations[locale]
  const [hideOverview, setHideOverview] = useState(false)
  const [hideChart, setHideChart] = useState(false)
  const [hideSla, setHideSla] = useState(false)

  const st  = analytics?.status?.data
  const pr  = analytics?.priority?.data
  const atd = analytics?.averageTime?.data
  const hasThroughput    = (analytics?.throughput?.data.length    ?? 0) > 0
  const hasResolutionTime = (analytics?.responseTime?.data.length ?? 0) > 0

  const stMax = st ? Math.max(st.PENDING.count, st.IN_PROGRESS.count, st.DONE.count, st.CANCELLED?.count ?? 0, 1) : 1
  const prMax = pr ? Math.max(pr.HIGH.count, pr.MEDIUM.count, pr.LOW.count, 1) : 1

  const border = dark ? 'border-white/8' : 'border-slate-100'

  const tooltipStyle = {
    backgroundColor: dark ? '#111827' : '#fff',
    border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
    borderRadius: 8, fontSize: 11,
    color: dark ? '#fff' : '#1e293b',
  }

  return (
    <div className="flex flex-col gap-3">

      {/* ── Overview: status + priority + avg time ── */}
      <div className={`${cardBg} border rounded-2xl overflow-hidden`}>
        <div className={`flex items-center justify-between px-5 pt-4 pb-3 border-b ${border}`}>
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">📊</span>
            <p className={`text-sm font-semibold ${text}`}>{t.metricsTitle}</p>
          </div>
          <button
            onClick={() => setHideOverview(v => !v)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition ${dark ? 'border-white/10 text-white/50 hover:text-white/80 hover:bg-white/5' : 'border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            <span className={`w-2 h-2 rounded-full ${hideOverview ? 'bg-slate-400' : 'bg-emerald-400'}`} />
            {hideOverview ? t.showDataBtn : t.hideDataBtn}
          </button>
        </div>

        {!hideOverview && (
          <div className="px-4 sm:px-5 py-4">
            {(!st && !pr && !atd) ? (
              <p className={`text-xs ${textFaint} text-center py-6`}>{t.insufficient}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

                {/* Status */}
                {st && (
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${textFaint} mb-3`}>{t.byStatus}</p>
                    <div className="flex flex-col gap-2.5">
                      {[
                        { label: t.statusPending, value: st.PENDING.count,     color: dark ? '#94a3b8' : '#64748b' },
                        { label: t.sInProgress,   value: st.IN_PROGRESS.count, color: '#3b82f6' },
                        { label: t.statusDone,    value: st.DONE.count,        color: '#10b981' },
                        ...(st.CANCELLED ? [{ label: t.sCancelled, value: st.CANCELLED.count, color: '#f43f5e' }] : []),
                      ].map(r => (
                        <div key={r.label}>
                          <span className={`text-[11px] ${textFaint} block mb-0.5`}>{r.label}</span>
                          <MiniBar value={r.value} max={stMax} color={r.color} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Priority */}
                {pr && (
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${textFaint} mb-3`}>{t.byPriority}</p>
                    <div className="flex flex-col gap-2.5">
                      {[
                        { label: t.priorityHigh,   value: pr.HIGH.count,   color: '#ef4444' },
                        { label: t.priorityMedium, value: pr.MEDIUM.count, color: '#f59e0b' },
                        { label: t.priorityLow,    value: pr.LOW.count,    color: '#10b981' },
                      ].map(r => (
                        <div key={r.label}>
                          <span className={`text-[11px] ${textFaint} block mb-0.5`}>{r.label}</span>
                          <MiniBar value={r.value} max={prMax} color={r.color} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Avg time */}
                {atd && (
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${textFaint} mb-3`}>{t.avgCompletionLbl}</p>
                    <p className={`text-3xl font-black ${text} tabular-nums leading-none mb-3`}>
                      {atd.average_time_hours.toFixed(1)}<span className={`text-lg font-semibold ${textFaint} ml-0.5`}>h</span>
                    </p>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-base font-bold ${text} tabular-nums`}>{atd.average_time_days.toFixed(2)}</span>
                        <span className={`text-[11px] ${textFaint}`}>{t.daysLabel.toLowerCase()}</span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-base font-bold ${text} tabular-nums`}>{Math.round(atd.average_time_hours * 60)}</span>
                        <span className={`text-[11px] ${textFaint}`}>{locale === 'pt' ? 'minutos' : 'minutes'}</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Throughput / Produtividade Diária ── */}
      {hasThroughput && (
        <div className={`${cardBg} border rounded-2xl overflow-hidden`}>
          <div className={`flex items-center justify-between px-5 pt-4 pb-3 border-b ${border}`}>
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">📈</span>
              <p className={`text-sm font-semibold ${text}`}>{t.dailyProductivity}</p>
            </div>
            <button
              onClick={() => setHideChart(v => !v)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition ${dark ? 'border-white/10 text-white/50 hover:text-white/80 hover:bg-white/5' : 'border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <span className={`w-2 h-2 rounded-full ${hideChart ? 'bg-slate-400' : 'bg-emerald-400'}`} />
              {hideChart ? t.showLabel : t.hideLabel}
            </button>
          </div>

          {!hideChart && analytics?.throughput && (
            <div className="px-4 sm:px-5 py-4">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={analytics.throughput.data}>
                  <CartesianGrid stroke={dark ? 'rgba(255,255,255,.06)' : '#e2e8f0'} />
                  <XAxis dataKey="day" tick={{ fill: dark ? '#ffffff40' : '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: dark ? '#ffffff40' : '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="count" stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#7c3aed', r: 3 }} name={t.sDonePlural} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── Resolution Time / SLA 90% ── */}
      {hasResolutionTime && (
        <div className={`${cardBg} border rounded-2xl overflow-hidden`}>
          <div className={`flex items-center justify-between px-5 pt-4 pb-3 border-b ${border}`}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base leading-none">⏱</span>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${text}`}>{t.resolutionTimeLbl}</p>
                <p className={`text-[10px] ${textFaint} truncate`}>{t.resolutionTimeDesc}</p>
              </div>
            </div>
            <button
              onClick={() => setHideSla(v => !v)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition flex-shrink-0 ml-2 ${dark ? 'border-white/10 text-white/50 hover:text-white/80 hover:bg-white/5' : 'border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <span className={`w-2 h-2 rounded-full ${hideSla ? 'bg-slate-400' : 'bg-emerald-400'}`} />
              {hideSla ? t.showLabel : t.hideLabel}
            </button>
          </div>

          {!hideSla && analytics?.responseTime && (
            <div className="px-4 sm:px-5 py-4">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={analytics.responseTime.data}>
                  <CartesianGrid stroke={dark ? 'rgba(255,255,255,.06)' : '#e2e8f0'} />
                  <XAxis dataKey="date" tick={{ fill: dark ? '#ffffff40' : '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fill: dark ? '#ffffff40' : '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => typeof v === 'number' ? `${v.toFixed(1)}%` : v} />
                  <ReferenceLine y={90} stroke="#f59e0b" strokeDasharray="5 3" label={{ value: t.slaTargetLbl, fill: '#f59e0b', fontSize: 10 }} />
                  <Line type="monotone" dataKey="slaPercentage" stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#7c3aed', r: 3 }} name={t.resolutionTimeLbl} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
