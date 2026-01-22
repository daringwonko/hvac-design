/**
 * Session Breadcrumb Navigation - UX-004
 *
 * Shows the current position in the design workflow with clickable breadcrumbs.
 * Displays module completion status and enables quick navigation.
 */

import { useSessionNavigation, useSession } from '../../context/SessionContext'

// Module icons (simple SVG paths)
const ModuleIcons = {
  'floor-plan': (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="9" x2="9" y2="21" />
    </svg>
  ),
  'hvac': (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  ),
  'electrical': (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  'plumbing': (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v6M12 22v-6M6 12H2M22 12h-4M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0" />
    </svg>
  ),
  'review': (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
}

// Chevron separator
function ChevronRight() {
  return (
    <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

// Check icon for completed modules
function CheckIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function SessionBreadcrumb({ className = '' }) {
  const { currentModule, navigateTo, canAccess, moduleOrder, moduleInfo } = useSessionNavigation()
  const { moduleStatus } = useSession()

  return (
    <nav className={`flex items-center space-x-1 ${className}`} aria-label="Breadcrumb">
      {moduleOrder.map((moduleId, index) => {
        const info = moduleInfo[moduleId]
        const status = moduleStatus[moduleId]
        const isCurrent = moduleId === currentModule
        const isCompleted = status?.completed
        const isAccessible = canAccess(moduleId)
        const isLast = index === moduleOrder.length - 1

        return (
          <div key={moduleId} className="flex items-center">
            <button
              onClick={() => isAccessible && navigateTo(moduleId)}
              disabled={!isAccessible}
              className={`
                flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-medium
                transition-all duration-200
                ${isCurrent
                  ? 'bg-blue-600 text-white'
                  : isCompleted
                    ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                    : isAccessible
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }
              `}
              title={info.description}
            >
              {/* Icon */}
              <span className={`
                ${isCurrent ? 'text-white' : isCompleted ? 'text-green-400' : 'text-slate-400'}
              `}>
                {ModuleIcons[moduleId]}
              </span>

              {/* Name */}
              <span className="hidden sm:inline">{info.name}</span>

              {/* Completion indicator */}
              {isCompleted && !isCurrent && (
                <span className="ml-1 text-green-400">
                  <CheckIcon />
                </span>
              )}
            </button>

            {/* Separator */}
            {!isLast && (
              <span className="mx-1">
                <ChevronRight />
              </span>
            )}
          </div>
        )
      })}
    </nav>
  )
}

/**
 * Compact breadcrumb for mobile/small screens
 */
export function SessionBreadcrumbCompact({ className = '' }) {
  const { currentModule, navigateBack, moduleInfo } = useSessionNavigation()
  const { moduleStatus } = useSession()

  const currentInfo = moduleInfo[currentModule]
  const status = moduleStatus[currentModule]

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={navigateBack}
        className="p-1 rounded hover:bg-slate-700 text-slate-400"
        title="Go back"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="flex items-center gap-2">
        <span className="text-blue-400">{ModuleIcons[currentModule]}</span>
        <span className="font-medium text-white">{currentInfo.name}</span>
        {status?.completed && (
          <span className="text-green-400">
            <CheckIcon />
          </span>
        )}
      </div>
    </div>
  )
}
