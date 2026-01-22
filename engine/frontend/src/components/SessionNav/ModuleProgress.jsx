/**
 * Module Progress Indicators - UX-005
 *
 * Visual indicators showing overall session progress and module completion status.
 * Includes:
 * - Progress bar
 * - Step indicators
 * - Completion summary
 */

import { useSession, useSessionNavigation } from '../../context/SessionContext'

/**
 * Circular progress ring
 */
function ProgressRing({ percentage, size = 48, strokeWidth = 4 }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        className="text-slate-700"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={`
          transition-all duration-500 ease-out
          ${percentage === 100 ? 'text-green-500' : percentage > 50 ? 'text-blue-500' : 'text-amber-500'}
        `}
      />
    </svg>
  )
}

/**
 * Main progress indicator with percentage
 */
export default function ModuleProgress({ className = '' }) {
  const { getCompletionPercentage, moduleStatus, projectName } = useSession()
  const { moduleOrder, moduleInfo } = useSessionNavigation()

  const percentage = getCompletionPercentage()
  const completedModules = moduleOrder.filter(id => moduleStatus[id]?.completed).length

  return (
    <div className={`bg-slate-800 rounded-lg p-4 ${className}`}>
      {/* Header with progress ring */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative">
          <ProgressRing percentage={percentage} size={56} strokeWidth={5} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-white">{percentage}%</span>
          </div>
        </div>
        <div>
          <h3 className="text-white font-semibold">{projectName}</h3>
          <p className="text-slate-400 text-sm">
            {completedModules} of {moduleOrder.length} modules complete
          </p>
        </div>
      </div>

      {/* Module steps */}
      <div className="space-y-2">
        {moduleOrder.map((moduleId, index) => {
          const info = moduleInfo[moduleId]
          const status = moduleStatus[moduleId]
          const isCompleted = status?.completed

          return (
            <div
              key={moduleId}
              className={`
                flex items-center gap-3 p-2 rounded
                ${isCompleted ? 'bg-green-900/20' : 'bg-slate-700/50'}
              `}
            >
              {/* Step number or check */}
              <div className={`
                w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${isCompleted
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-600 text-slate-300'
                }
              `}>
                {isCompleted ? (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>

              {/* Module name */}
              <span className={`
                flex-1 text-sm
                ${isCompleted ? 'text-green-400' : 'text-slate-300'}
              `}>
                {info.name}
              </span>

              {/* Status */}
              {status?.completedAt && (
                <span className="text-xs text-slate-500">
                  {new Date(status.completedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Compact horizontal progress bar
 */
export function ProgressBar({ className = '' }) {
  const { getCompletionPercentage } = useSession()
  const percentage = getCompletionPercentage()

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>Progress</span>
        <span>{percentage}%</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`
            h-full rounded-full transition-all duration-500
            ${percentage === 100 ? 'bg-green-500' : percentage > 50 ? 'bg-blue-500' : 'bg-amber-500'}
          `}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Step indicators (horizontal dots)
 */
export function StepIndicators({ className = '' }) {
  const { currentModule, navigateTo, canAccess, moduleOrder, moduleInfo } = useSessionNavigation()
  const { moduleStatus } = useSession()

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {moduleOrder.map((moduleId, index) => {
        const isCurrent = moduleId === currentModule
        const isCompleted = moduleStatus[moduleId]?.completed
        const isAccessible = canAccess(moduleId)

        return (
          <button
            key={moduleId}
            onClick={() => isAccessible && navigateTo(moduleId)}
            disabled={!isAccessible}
            className={`
              w-3 h-3 rounded-full transition-all duration-200
              ${isCurrent
                ? 'bg-blue-500 ring-2 ring-blue-500/30 scale-125'
                : isCompleted
                  ? 'bg-green-500 hover:bg-green-400'
                  : isAccessible
                    ? 'bg-slate-500 hover:bg-slate-400'
                    : 'bg-slate-700'
              }
            `}
            title={moduleInfo[moduleId].name}
          />
        )
      })}
    </div>
  )
}

/**
 * Mini progress badge for header
 */
export function ProgressBadge({ className = '' }) {
  const { getCompletionPercentage } = useSession()
  const percentage = getCompletionPercentage()

  return (
    <span className={`
      inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
      ${percentage === 100
        ? 'bg-green-600/20 text-green-400'
        : 'bg-blue-600/20 text-blue-400'
      }
      ${className}
    `}>
      {percentage === 100 ? (
        <>
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Complete
        </>
      ) : (
        <>
          <ProgressRing percentage={percentage} size={14} strokeWidth={2} />
          {percentage}%
        </>
      )}
    </span>
  )
}
