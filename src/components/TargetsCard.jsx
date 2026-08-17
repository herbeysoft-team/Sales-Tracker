import { Link } from 'react-router-dom'
import TargetDonut from './TargetDonut'

export default function TargetsCard({ weeklyTarget, monthlyTarget, weekSales, monthSales, isAdmin }) {
  return (
    <div className="card p-5">
      <h2 className="mb-4 text-sm font-semibold">Targets</h2>
      <div className="grid grid-cols-2 gap-4">
        <TargetDonut label="This week" achieved={weekSales} target={weeklyTarget} />
        <TargetDonut label="This month" achieved={monthSales} target={monthlyTarget} />
      </div>
      <p className="mt-4 text-xs text-ink-faint">
        {isAdmin ? (
          <>
            This is the sum of every marketer's individual target. Set them from{' '}
            <Link to="/marketers" className="font-medium text-brand hover:underline">
              Marketers
            </Link>{' '}
            → select a marketer → Targets.
          </>
        ) : (
          'Set by your admin.'
        )}
      </p>
    </div>
  )
}
