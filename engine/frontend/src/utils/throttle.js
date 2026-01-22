/**
 * Creates a throttled function that only invokes the provided function
 * at most once per specified time period, with trailing edge execution.
 *
 * Unlike a simple leading-edge throttle, this implementation captures
 * the last call made during the throttle period and executes it after
 * the cooldown, ensuring the final position/state is never lost.
 *
 * @param {Function} func - The function to throttle
 * @param {number} limit - The time period in milliseconds
 * @returns {Function} The throttled function
 *
 * @example
 * const throttledMouseMove = throttle((e) => {
 *   updatePosition(e.clientX, e.clientY)
 * }, 16) // 60fps
 */
export const throttle = (func, limit) => {
  let inThrottle = false
  let pendingArgs = null

  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
        if (pendingArgs) {
          func.apply(this, pendingArgs)
          pendingArgs = null
        }
      }, limit)
    } else {
      pendingArgs = args
    }
  }
}

/**
 * Creates a debounced function that delays invoking the provided function
 * until after the specified wait time has elapsed since the last call.
 *
 * @param {Function} func - The function to debounce
 * @param {number} wait - The debounce wait time in milliseconds
 * @returns {Function} The debounced function
 */
export const debounce = (func, wait) => {
  let timeout = null

  return function(...args) {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      func.apply(this, args)
      timeout = null
    }, wait)
  }
}

export default { throttle, debounce }
