
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ProtectedRoute({ children, allowedRoles = ['admin', 'super_admin'] }) {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let mounted = true

    async function checkAccess() {
      const { data: { session } } =
        await supabase.auth.getSession()

      if (!session) {
        if (mounted) setStatus('unauthorized')
        return
      }

      const { data: role, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (!mounted) return

      if (error || !role || !allowedRoles.includes(role.role)) {
        await supabase.auth.signOut()
        setStatus('unauthorized')
        return
      }

      setStatus('authorized')
    }

    checkAccess()

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange(() => {
        checkAccess()
      })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Verifying administrator access...</p>
      </div>
    )
  }

  if (status === 'unauthorized') {
    return <Navigate to="/admin/login" replace />
  }

  return children
}
