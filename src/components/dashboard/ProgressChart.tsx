'use client'

import React, { useState, useMemo, useEffect } from 'react'
import type { Task as ApiTask } from '@/types/task'
import type { DashboardTheme } from '@/hooks/useDashboardTheme'
import { today } from '@/lib/dashboard-utils'

interface ProgressChartProps {
  dark: boolean
  isClient: boolean
  apiTasks: ApiTask[]
  taskDates: Record<string, { created: string; started: string | null; finished: string | null; deadline: string | null; originalDeadline: string | null }>
  taskStatuses: Record<string, 'Pending' | 'InProgress' | 'Done'>
  total: number
  theme: DashboardTheme
}

const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export function ProgressChart({ dark, isClient, apiTasks, taskDates, taskStatuses, total, theme }: ProgressChartProps) {
  const { text, textFaint, cardBg } = theme

  const [chartMonth, setChartMonth] = useState<{ year: number; month: number }>({ year: 0, month: 0 })
  const [chartWeek, setChartWeek] = useState<number>(0)
  const [chartHoverIdx, setChartHoverIdx] = useState<number | null>(null)

  // Initialise chart date on client only — avoids server/client new Date() mismatch
  useEffect(() => {
    const n = new Date()
    setChartMonth({ year: n.getFullYear(), month: n.getMonth() })
    setChartWeek(Math.ceil(n.getDate() / 7))
  }, [])

  function getWeekDates(year: number, month: number, week: number): string[] {
    if (week <= 0 || year <= 0) return []
    const lastDay = new Date(year, month + 1, 0).getDate()
    const start = (week - 1) * 7 + 1
    const end   = Math.min(week * 7, lastDay)
    if (start > lastDay) return []
    const dates: string[] = []
    for (let d = start; d <= end; d++) {
      const iso = new Date(year, month, d)
      dates.push(`${iso.getFullYear()}-${String(iso.getMonth()+1).padStart(2,'0')}-${String(iso.getDate()).padStart(2,'0')}`)
    }
    return dates
  }

  function totalWeeks(year: number, month: number) {
    return Math.ceil(new Date(year, month + 1, 0).getDate() / 7)
  }

  function prevWeek() {
    if (chartWeek > 1) {
      setChartWeek(w => w - 1)
    } else {
      const pm = chartMonth.month === 0
        ? { year: chartMonth.year - 1, month: 11 }
        : { year: chartMonth.year, month: chartMonth.month - 1 }
      setChartMonth(pm)
      setChartWeek(totalWeeks(pm.year, pm.month))
    }
  }

  function nextWeek() {
    if (chartWeek < totalWeeks(chartMonth.year, chartMonth.month)) {
      setChartWeek(w => w + 1)
    } else {
      const nm = chartMonth.month === 11
        ? { year: chartMonth.year + 1, month: 0 }
        : { year: chartMonth.year, month: chartMonth.month + 1 }
      setChartMonth(nm)
      setChartWeek(1)
    }
  }

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const taskYears = new Set(apiTasks.map(t => Number(t.createdAt?.slice(0, 4))).filter(y => y >= 2026))
    for (let y = 2026; y <= currentYear + 1; y++) taskYears.add(y)
    return [...taskYears].sort()
  }, [apiTasks])

  const weekLabel = !isClient
    ? 'Semana 1 — Janeiro 2025'
    : `Semana ${chartWeek} — ${monthNames[chartMonth.month]} ${chartMonth.year}`

  // ── dados dos gráficos ─────────────────────────────────────────
  const chartData = useMemo(() => {
    const points = getWeekDates(chartMonth.year, chartMonth.month, chartWeek)
    if (points.length === 0) return null
    const n = points.length
    const planned  = points.map((_, i) => Math.round((total / Math.max(1, n - 1)) * i))
    const done     = points.map(date => apiTasks.filter(t => {
      const isDone   = taskStatuses[t._id] === 'Done'
      const finished = taskDates[t._id]?.finished ?? (isDone ? today() : null)
      return finished && finished <= date
    }).length)
    const progress = points.map(date => apiTasks.filter(t => {
      if (taskStatuses[t._id] === 'Done') return false
      const started  = taskDates[t._id]?.started
      const finished = taskDates[t._id]?.finished
      return started && started <= date && (!finished || finished > date)
    }).length)
    const labels = points.map(d => { const [,m,day] = d.split('-'); return `${day}/${m}` })
    return { points, planned, done, progress, labels }
  }, [apiTasks, taskDates, taskStatuses, total, chartMonth, chartWeek])

  const GW = 560; const GH = 220; const GP = 44
  const nPoints  = chartData?.labels.length ?? 7
  const plannedSeries  = chartData?.planned  ?? Array(7).fill(0)
  const doneSeries     = chartData?.done     ?? Array(7).fill(0)
  const progressSeries = chartData?.progress ?? Array(7).fill(0)
  const chartLabels    = chartData?.labels   ?? Array(7).fill('')
  const gMax = Math.max(...plannedSeries, ...doneSeries, ...progressSeries, total, 1)
  function gx(i: number) { return GP + i * ((GW - GP * 2) / Math.max(1, nPoints - 1)) }
  function gy(v: number) { return GH - GP - Math.round(((v - 1) / Math.max(1, gMax - 1)) * (GH - GP * 2)) }
  function makePath(series: number[]) {
    return series.map((v, i) => {
      if (i === 0) return `M ${gx(i)} ${gy(v)}`
      const prev = series[i - 1]
      const cx = (gx(i - 1) + gx(i)) / 2
      return `C ${cx} ${gy(prev)} ${cx} ${gy(v)} ${gx(i)} ${gy(v)}`
    }).join(' ')
  }
  const pathPlanned  = makePath(plannedSeries)
  const pathDone     = makePath(doneSeries)
  const pathProgress = makePath(progressSeries)
  const areaDeviation = `${pathDone} L ${gx(nPoints-1)} ${gy(plannedSeries[nPoints-1])} ` +
    [...plannedSeries].reverse().map((v, i) => {
      const ri = nPoints - 1 - i
      if (i === 0) return `L ${gx(ri)} ${gy(v)}`
      const next = plannedSeries[ri + 1]
      const cx = (gx(ri) + gx(ri + 1)) / 2
      return `C ${cx} ${gy(next)} ${cx} ${gy(v)} ${gx(ri)} ${gy(v)}`
    }).join(' ') + ' Z'

  return (
    <div className={`${cardBg} border rounded-2xl overflow-hidden`}>
      {/* cabeçalho */}
      <div className={`px-3 sm:px-5 pt-4 pb-3 border-b ${dark ? 'border-white/5' : 'border-slate-100'}`}>
        {/* linha 1: título + legenda */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div>
            <p className={`text-sm font-semibold ${text}`}>Progresso das Tarefas</p>
            <p className={`text-xs ${textFaint} mt-0.5`}>Concluídas vs. previsto ao longo do tempo</p>
          </div>
          <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
            {[
              { color: '#10b981', label: 'Concluídas', dash: false },
              { color: '#6366f1', label: 'Em andamento', dash: false },
              { color: dark ? 'rgba(255,255,255,.35)' : 'rgba(100,116,139,.55)', label: 'Previsto', dash: true },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <svg width="22" height="8" className="flex-shrink-0">
                  {l.dash
                    ? <line x1="0" y1="4" x2="22" y2="4" stroke={l.color} strokeWidth="1.5" strokeDasharray="4 2.5" />
                    : <line x1="0" y1="4" x2="22" y2="4" stroke={l.color} strokeWidth="2" strokeLinecap="round" />}
                </svg>
                <span className={`text-[11px] font-medium ${textFaint}`}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
        {/* linha 2: navegação semana + filtro mês */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button onClick={prevWeek} aria-label="Semana anterior"
              className={`w-6 h-6 flex items-center justify-center rounded-lg border ${dark ? 'border-white/10 text-white/45 hover:bg-white/8 hover:text-white/75' : 'border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700'} transition`}>
              <svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span aria-live="polite" aria-atomic="true" suppressHydrationWarning className={`text-xs font-semibold ${text} min-w-[180px] text-center`}>{weekLabel}</span>
            <button onClick={nextWeek} aria-label="Próxima semana"
              className={`w-6 h-6 flex items-center justify-center rounded-lg border ${dark ? 'border-white/10 text-white/45 hover:bg-white/8 hover:text-white/75' : 'border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700'} transition`}>
              <svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={chartMonth.month}
              onChange={e => { setChartMonth(prev => ({ ...prev, month: Number(e.target.value) })); setChartWeek(1) }}
              style={{ backgroundColor: dark ? '#0D1117' : undefined }}
              className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer ${dark ? 'border-white/10 text-white/65' : 'bg-white border-slate-200 text-slate-600'} transition`}>
              {monthNames.map((name, i) => (
                <option key={i} value={i} style={{ backgroundColor: dark ? '#0D1117' : 'white' }}>{name}</option>
              ))}
            </select>
            <select
              value={chartMonth.year}
              onChange={e => { setChartMonth(prev => ({ ...prev, year: Number(e.target.value) })); setChartWeek(1) }}
              style={{ backgroundColor: dark ? '#0D1117' : undefined }}
              className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer ${dark ? 'border-white/10 text-white/65' : 'bg-white border-slate-200 text-slate-600'} transition`}>
              {availableYears.map(y => (
                <option key={y} value={y} style={{ backgroundColor: dark ? '#0D1117' : 'white' }}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de dados oculta visualmente — acessível para leitores de tela */}
      <div className="sr-only">
        <table>
          <caption suppressHydrationWarning>Progresso semanal — {weekLabel}</caption>
          <thead>
            <tr><th scope="col">Data</th><th scope="col">Previsto</th><th scope="col">Concluídas</th><th scope="col">Em andamento</th></tr>
          </thead>
          <tbody>
            {chartLabels.map((lbl, i) => (
              <tr key={i}>
                <th scope="row">{lbl}</th>
                <td>{plannedSeries[i]}</td>
                <td>{doneSeries[i]}</td>
                <td>{progressSeries[i]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-3 sm:px-5 pt-4 sm:pt-5 pb-4">
        {isClient ? (
        <svg
          width="100%"
          viewBox={`0 0 ${GW} ${GH + 40}`}
          className="overflow-visible"
          role="img"
          aria-labelledby="chart-title chart-desc"
          onMouseLeave={() => setChartHoverIdx(null)}
        >
          <title id="chart-title">Gráfico de progresso — {weekLabel}</title>
          <desc id="chart-desc">
            Linha de tarefas concluídas, em andamento e previsto por dia da semana.
            {doneSeries[doneSeries.length - 1]} concluídas e {progressSeries[progressSeries.length - 1]} em andamento no último dia visível.
          </desc>
          <defs>
            <linearGradient id="gDone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gProgress" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gDev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.13" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* linhas de grade horizontais + labels eixo Y */}
          {[0, 0.25, 0.5, 0.75, 1].map((f, idx) => {
            const val = Math.round(f * gMax)
            const yg  = gy(Math.max(1, val === 0 ? 1 : val))
            return (
              <g key={idx}>
                <line x1={GP} y1={yg} x2={GW - GP / 2} y2={yg}
                  stroke={dark ? 'rgba(255,255,255,.055)' : 'rgba(0,0,0,.06)'} strokeWidth="1" />
                <text x={GP - 8} y={yg + 4} textAnchor="end"
                  fontSize="10" fontFamily="system-ui,sans-serif" fontWeight="500"
                  fill={dark ? 'rgba(255,255,255,.28)' : '#94a3b8'}>{val}</text>
              </g>
            )
          })}

          {/* linhas de grade verticais em cada ponto */}
          {chartLabels.map((_, i) => (
            <line key={i} x1={gx(i)} y1={GP} x2={gx(i)} y2={GH - GP}
              stroke={dark ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.04)'} strokeWidth="1" />
          ))}

          {/* crosshair de hover */}
          {chartHoverIdx !== null && (
            <line x1={gx(chartHoverIdx)} y1={GP - 4} x2={gx(chartHoverIdx)} y2={GH - GP}
              stroke={dark ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.13)'}
              strokeWidth="1" strokeDasharray="3 2" />
          )}

          {/* baseline */}
          <line x1={GP} y1={GH - GP} x2={GW - GP / 2} y2={GH - GP}
            stroke={dark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.1)'} strokeWidth="1" />

          {/* área de desvio */}
          <path d={areaDeviation} fill="url(#gDev)" />

          {/* área sob concluídas */}
          <path d={`${pathDone} L ${gx(nPoints-1)} ${GH - GP} L ${gx(0)} ${GH - GP} Z`} fill="url(#gDone)" />

          {/* área sob andamento */}
          <path d={`${pathProgress} L ${gx(nPoints-1)} ${GH - GP} L ${gx(0)} ${GH - GP} Z`} fill="url(#gProgress)" />

          {/* linha previsto (tracejada) */}
          <path d={pathPlanned} fill="none"
            stroke={dark ? 'rgba(255,255,255,.28)' : 'rgba(100,116,139,.4)'}
            strokeWidth="1.5" strokeDasharray="6 3" strokeLinecap="round" />

          {/* linha andamento */}
          <path d={pathProgress} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* linha concluídas */}
          <path d={pathDone} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* pontos concluídas */}
          {doneSeries.map((v, i) => {
            const cy = v > 0 ? gy(v) : GH - GP
            return (
              <g key={i}>
                <circle cx={gx(i)} cy={cy} r="8" fill="#10b981" opacity={chartHoverIdx === i ? 0.2 : 0.1} />
                <circle cx={gx(i)} cy={cy} r="3.5" fill="#10b981" />
                <circle cx={gx(i)} cy={cy} r="1.4" fill="white" opacity="0.85" />
              </g>
            )
          })}

          {/* pontos andamento */}
          {progressSeries.map((v, i) => {
            const cy = v > 0 ? gy(v) : GH - GP
            return (
              <g key={i}>
                <circle cx={gx(i)} cy={cy} r="6.5" fill="#6366f1" opacity={chartHoverIdx === i ? 0.2 : 0.1} />
                <circle cx={gx(i)} cy={cy} r="3" fill="#6366f1" />
                <circle cx={gx(i)} cy={cy} r="1.2" fill="white" opacity="0.85" />
              </g>
            )
          })}

          {/* hit targets + labels eixo X */}
          {chartLabels.map((lbl, i) => {
            const colW = nPoints > 1 ? (GW - GP * 2) / (nPoints - 1) : GW - GP * 2
            return (
              <g key={i}>
                <rect
                  x={gx(i) - colW / 2} y={GP}
                  width={colW} height={GH - GP * 2}
                  fill="transparent"
                  onMouseEnter={() => setChartHoverIdx(i)} />
                <text x={gx(i)} y={GH + 17} textAnchor="middle"
                  fontSize="10" fontFamily="system-ui,sans-serif"
                  fontWeight={chartHoverIdx === i ? '600' : '400'}
                  fill={chartHoverIdx === i
                    ? (dark ? 'rgba(255,255,255,.7)' : '#475569')
                    : (dark ? 'rgba(255,255,255,.32)' : '#94a3b8')}>
                  {lbl}
                </text>
              </g>
            )
          })}

          {/* tooltip */}
          {chartHoverIdx !== null && (() => {
            const i = chartHoverIdx
            const tx = gx(i)
            const tw = 118; const th = 68
            const tx2 = tx + tw > GW - GP / 2 ? tx - tw - 10 : tx + 10
            const ty2 = GP
            const bg  = dark ? '#1a2030' : '#f8fafc'
            const bd  = dark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.08)'
            const lbl1 = dark ? 'rgba(255,255,255,.4)' : '#64748b'
            const lbl2 = dark ? 'rgba(255,255,255,.75)' : '#1e293b'
            return (
              <g style={{ pointerEvents: 'none' }}>
                <rect x={tx2} y={ty2} width={tw} height={th} rx="7"
                  fill={bg} stroke={bd} strokeWidth="1" />
                <text x={tx2 + 10} y={ty2 + 14} fontSize="9.5"
                  fontFamily="system-ui,sans-serif" fontWeight="600" fill={lbl1}>
                  {chartLabels[i]}
                </text>
                <circle cx={tx2 + 11} cy={ty2 + 29} r="3.5" fill="#10b981" />
                <text x={tx2 + 20} y={ty2 + 33} fontSize="10"
                  fontFamily="system-ui,sans-serif" fontWeight="500" fill={lbl2}>
                  Concluídas: {doneSeries[i]}
                </text>
                <circle cx={tx2 + 11} cy={ty2 + 48} r="3.5" fill="#6366f1" />
                <text x={tx2 + 20} y={ty2 + 52} fontSize="10"
                  fontFamily="system-ui,sans-serif" fontWeight="500" fill={lbl2}>
                  Andamento: {progressSeries[i]}
                </text>
              </g>
            )
          })()}
        </svg>
        ) : <div className="h-[260px]" />}

        {/* insight */}
        <div className={`mt-1 pt-3 border-t ${dark ? 'border-white/5' : 'border-slate-100'}`}>
          {(() => {
            const lastDone    = doneSeries[doneSeries.length - 1]
            const lastPlanned = plannedSeries[plannedSeries.length - 1]
            const diff = lastDone - lastPlanned
            if (diff >= 0) return (
              <div className="flex items-center gap-2.5">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${dark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Adiantado
                </span>
                <span className={`text-xs ${textFaint}`}>{diff} tarefa{diff !== 1 ? 's' : ''} acima do previsto</span>
              </div>
            )
            return (
              <div className="flex items-center gap-2.5">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${dark ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600'}`}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                  Abaixo do previsto
                </span>
                <span className={`text-xs ${textFaint}`}>{Math.abs(diff)} tarefa{Math.abs(diff) !== 1 ? 's' : ''} abaixo do esperado</span>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
