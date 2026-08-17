import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { formatMoney } from '../lib/format'

export default function TargetDonut({ label, achieved, target }) {
  const hasTarget = target > 0
  const pct = hasTarget ? Math.round((achieved / target) * 100) : null
  const ringPct = hasTarget ? Math.min(100, pct) : 0

  const data = hasTarget
    ? [
        { name: 'Achieved', value: Math.min(achieved, target) },
        { name: 'Remaining', value: Math.max(0, target - achieved) },
      ]
    : [{ name: 'No target', value: 1 }]

  const achievedColor = pct >= 100 ? '#0F6E63' : '#B3121B'
  const colors = hasTarget ? [achievedColor, '#E4E1D8'] : ['#E4E1D8']

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-28 w-28">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={38}
              outerRadius={54}
              startAngle={90}
              endAngle={-270}
              stroke="none"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={colors[i]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="figure text-sm font-semibold">{hasTarget ? `${pct}%` : '—'}</span>
        </div>
      </div>
      <p className="mt-2 text-xs font-medium text-ink-soft">{label}</p>
      <p className="text-xs text-ink-faint">
        {hasTarget ? `${formatMoney(achieved)} / ${formatMoney(target)}` : 'No target set'}
      </p>
    </div>
  )
}
