import { useState, useEffect, useCallback } from 'react'

/**
 * Generic data-fetching hook.
 * @param {Function} apiFn     – function that returns a Promise (axios call)
 * @param {Array}    deps      – dependency array (re-fetch when these change)
 * @param {boolean}  immediate – fetch on mount (default true)
 */
export function useApi(apiFn, deps = [], immediate = true) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(immediate)
  const [error,   setError]   = useState(null)

  const execute = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFn(...args)
      setData(res.data.data ?? res.data)
      return res.data.data ?? res.data
    } catch (err) {
      setError(err?.response?.data?.message || err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (immediate) execute()
  }, [execute]) // eslint-disable-line react-hooks/exhaustive-deps

  const refetch = () => execute()

  return { data, loading, error, execute, refetch }
}
