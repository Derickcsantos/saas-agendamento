'use client';

import React, { useEffect, useState } from 'react'

// Next.js page: /pages/admin/dashboard.jsx
// TailwindCSS required in the project. Palette: #711b96 (primary) and #ffffff (white)

export default function AdminDashboard() {
  const primary = '#711b96'
  const [stats, setStats] = useState({ clients: 0, plans: 0, users: 0 })
  const [loading, setLoading] = useState(false)

  // Pagar.me state
  const [plans, setPlans] = useState([])
  const [pagarmeLoading, setPagarmeLoading] = useState(false)
  const [showCreatePlan, setShowCreatePlan] = useState(false)
  const [newPlan, setNewPlan] = useState({ name: '', description: '', interval: 'month', interval_count: 1, minimum_price: 0, billing_type: 'postpaid', payment_methods: ['credit_card'] })
  const [editingPlan, setEditingPlan] = useState(null)

  // Users (access management)
  const [users, setUsers] = useState([])

  useEffect(() => {
    fetchStats()
    fetchUsers()
    fetchPagarmePlans()
  }, [])

  // --- Generic backend calls to your server-side routes ---
  async function fetchStats() {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      const data = await res.json()
      setStats(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchUsers() {
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      console.error(err)
    }
  }

  // --- Pagar.me specific functions (using Next.js server-side proxy endpoints) ---
  async function fetchPagarmePlans() {
    try {
      setPagarmeLoading(true)
      const res = await fetch('/api/pagarme/plans')
      if (!res.ok) throw new Error('Failed to fetch pagarme plans')
      const data = await res.json()
      setPlans(data)
    } catch (err) {
      console.error(err)
    } finally {
      setPagarmeLoading(false)
    }
  }

  async function createPagarmePlan(payload) {
    try {
      setPagarmeLoading(true)
      const res = await fetch('/api/pagarme/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || 'Failed to create plan')
      }
      const created = await res.json()
      // refresh
      await fetchPagarmePlans()
      return created
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      setPagarmeLoading(false)
    }
  }

  async function updatePagarmePlan(planId, payload) {
    try {
      setPagarmeLoading(true)
      const res = await fetch(`/api/pagarme/plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || 'Failed to update plan')
      }
      const updated = await res.json()
      await fetchPagarmePlans()
      return updated
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      setPagarmeLoading(false)
    }
  }

  async function handleCreatePlan(e) {
    e.preventDefault()
    try {
      const payload = {
        name: newPlan.name,
        description: newPlan.description,
        interval: newPlan.interval,
        interval_count: Number(newPlan.interval_count),
        minimum_price: Number(newPlan.minimum_price),
        billing_type: newPlan.billing_type,
        payment_methods: newPlan.payment_methods,
        trial_period_days: Number(newPlan.trial_period_days || 0),
        items: [
          {
            name: newPlan.name,
            quantity: 1,
            pricing_scheme: { price: Number(newPlan.minimum_price) }
          }
        ]
      }
      await createPagarmePlan(payload)
      setShowCreatePlan(false)
      setNewPlan({ name: '', description: '', interval: 'month', interval_count: 1, minimum_price: 0, billing_type: 'postpaid', payment_methods: ['credit_card'] })
    } catch (err) {
      alert('Erro ao criar plano: ' + (err.message || err))
    }
  }

  async function handleUpdatePlan(e) {
    e.preventDefault()
    if (!editingPlan) return
    try {
      const payload = {
        name: editingPlan.name,
        description: editingPlan.description,
        interval: editingPlan.interval,
        interval_count: Number(editingPlan.interval_count),
        minimum_price: Number(editingPlan.minimum_price),
        billing_type: editingPlan.billing_type,
        payment_methods: editingPlan.payment_methods,
        trial_period_days: Number(editingPlan.trial_period_days || 0),
      }
      await updatePagarmePlan(editingPlan.id, payload)
      setEditingPlan(null)
    } catch (err) {
      alert('Erro ao atualizar plano: ' + (err.message || err))
    }
  }

  // --- Access management actions ---
  async function toggleUserRole(userId) {
    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle-role`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to toggle role')
      await fetchUsers()
    } catch (err) {
      console.error(err)
    }
  }

  // --- UI ---
  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div style={{ backgroundColor: primary }} className="w-12 h-12 rounded flex items-center justify-center text-white font-bold">S</div>
          <div>
            <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
            <p className="text-sm text-gray-600">Overview & Pagar.me control center</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => fetchStats()} className="px-4 py-2 rounded bg-white border" style={{ borderColor: primary, color: primary }}>Refresh</button>
          <button className="px-4 py-2 rounded text-white" style={{ backgroundColor: primary }}>New Plan</button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Clients" value={loading ? 'Loading...' : stats.clients} color={primary} />
            <StatCard label="Plans" value={loading ? 'Loading...' : stats.plans} color={primary} />
            <StatCard label="Users" value={loading ? 'Loading...' : stats.users} color={primary} />
          </div>

          {/* Pagar.me control center */}
          <div className="bg-white p-4 rounded shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Pagar.me (API v5.0) — Control Center</h2>
              <div className="flex items-center gap-2">
                <button onClick={fetchPagarmePlans} className="px-3 py-1 border rounded" style={{ borderColor: primary, color: primary }}>Refresh</button>
                <button onClick={() => setShowCreatePlan(true)} className="px-3 py-1 rounded text-white" style={{ backgroundColor: primary }}>Create Plan</button>
              </div>
            </div>

            <div>
              {pagarmeLoading ? (
                <div>Loading plans...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr>
                        <th className="py-2">ID</th>
                        <th className="py-2">Name</th>
                        <th className="py-2">Price</th>
                        <th className="py-2">Interval</th>
                        <th className="py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plans.length === 0 && (
                        <tr><td colSpan={5} className="py-4 text-center text-gray-500">No plans found</td></tr>
                      )}
                      {plans.map((p) => (
                        <tr key={p.id} className="border-t">
                          <td className="py-2 max-w-xs truncate">{p.id}</td>
                          <td className="py-2">{p.name}</td>
                          <td className="py-2">{formatCurrency(p.minimum_price || p.items?.[0]?.pricing_scheme?.price)}</td>
                          <td className="py-2">{p.interval}/{p.interval_count}</td>
                          <td className="py-2">
                            <div className="flex gap-2">
                              <button onClick={() => setEditingPlan(mapPlanToEdit(p))} className="px-2 py-1 border rounded" style={{ borderColor: primary, color: primary }}>Edit</button>
                              <button onClick={() => navigator.clipboard.writeText(p.id)} className="px-2 py-1 rounded text-white" style={{ backgroundColor: primary }}>Copy ID</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Users / Access Management */}
          <div className="bg-white p-4 rounded shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Access Management</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="py-2">User</th>
                    <th className="py-2">Email</th>
                    <th className="py-2">Role</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="py-2">{u.name}</td>
                      <td className="py-2">{u.email}</td>
                      <td className="py-2">{u.role}</td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <button onClick={() => toggleUserRole(u.id)} className="px-2 py-1 border rounded" style={{ borderColor: primary, color: primary }}>Toggle Role</button>
                          <button onClick={() => alert('Implement edit user flow')} className="px-2 py-1 rounded text-white" style={{ backgroundColor: primary }}>Edit</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </section>

        <aside className="space-y-6">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-medium mb-2">Quick Links</h3>
            <ul className="text-sm space-y-2">
              <li><a href="#" className="underline" style={{ color: primary }}>Create plan</a></li>
              <li><a href="#" className="underline" style={{ color: primary }}>Manage subscriptions</a></li>
              <li><a href="#" className="underline" style={{ color: primary }}>Audit logs</a></li>
            </ul>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-medium mb-2">Pagar.me Keys</h3>
            <p className="text-sm text-gray-600">Your Pagar.me secret key should remain server-side. Implement server API routes that proxy requests to Pagar.me v5.</p>
            <button onClick={fetchPagarmePlans} className="mt-3 px-3 py-1 rounded text-white" style={{ backgroundColor: primary }}>Fetch Plans</button>
          </div>
        </aside>
      </main>

      {/* Create Plan Modal */}
      {showCreatePlan && (
        <Modal onClose={() => setShowCreatePlan(false)} title="Create Pagar.me Plan">
          <form onSubmit={handleCreatePlan} className="space-y-3">
            <Input label="Name" value={newPlan.name} onChange={(v) => setNewPlan({ ...newPlan, name: v })} />
            <Input label="Description" value={newPlan.description} onChange={(v) => setNewPlan({ ...newPlan, description: v })} />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Interval" value={newPlan.interval} onChange={(v) => setNewPlan({ ...newPlan, interval: v })} />
              <Input label="Interval Count" type="number" value={newPlan.interval_count} onChange={(v) => setNewPlan({ ...newPlan, interval_count: v })} />
            </div>
            <Input label="Price (in cents)" type="number" value={newPlan.minimum_price} onChange={(v) => setNewPlan({ ...newPlan, minimum_price: v })} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreatePlan(false)} className="px-3 py-1 border rounded">Cancel</button>
              <button type="submit" className="px-3 py-1 rounded text-white" style={{ backgroundColor: primary }}>Create</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Plan Modal */}
      {editingPlan && (
        <Modal onClose={() => setEditingPlan(null)} title="Edit Plan">
          <form onSubmit={handleUpdatePlan} className="space-y-3">
            <Input label="Name" value={editingPlan.name} onChange={(v) => setEditingPlan({ ...editingPlan, name: v })} />
            <Input label="Description" value={editingPlan.description} onChange={(v) => setEditingPlan({ ...editingPlan, description: v })} />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Interval" value={editingPlan.interval} onChange={(v) => setEditingPlan({ ...editingPlan, interval: v })} />
              <Input label="Interval Count" type="number" value={editingPlan.interval_count} onChange={(v) => setEditingPlan({ ...editingPlan, interval_count: v })} />
            </div>
            <Input label="Price (in cents)" type="number" value={editingPlan.minimum_price} onChange={(v) => setEditingPlan({ ...editingPlan, minimum_price: v })} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditingPlan(null)} className="px-3 py-1 border rounded">Cancel</button>
              <button type="submit" className="px-3 py-1 rounded text-white" style={{ backgroundColor: primary }}>Save</button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  )
}

// ---------------- Helper UI components ----------------
function StatCard({ label, value, color }) {
  return (
    <div className="bg-white p-4 rounded shadow flex items-center justify-between">
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-2xl font-semibold">{value}</div>
      </div>
      <div style={{ backgroundColor: color }} className="p-3 rounded text-white">&nbsp;</div>
    </div>
  )
}

function Modal({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="bg-white rounded shadow-lg p-6 z-10 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">{title}</h3>
          <button onClick={onClose} className="text-gray-500">Close</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text' }) {
  return (
    <label className="block">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <input type={type} value={value} onChange={(e) => onChange(type === 'number' ? e.target.value : e.target.value)} className="w-full border rounded px-3 py-2" />
    </label>
  )
}

function formatCurrency(cents) {
  if (cents == null) return '—'
  const num = Number(cents) / 100
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function mapPlanToEdit(p) {
  return {
    id: p.id,
    name: p.name || '',
    description: p.description || '',
    interval: p.interval || 'month',
    interval_count: p.interval_count || 1,
    minimum_price: p.minimum_price || p.items?.[0]?.pricing_scheme?.price || 0,
    billing_type: p.billing_type || 'postpaid',
    payment_methods: p.payment_methods || ['credit_card'],
    trial_period_days: p.trial_period_days || 0,
  }
}


/*
  ---------------------------------------------------------------
  Example Next.js API route implementations (server-side) — put these
  under /pages/api/pagarme/*.js and protect them with server env var.

  NOTE: DO NOT expose your secret key to the client. Use environment
  variable process.env.PAGARME_SECRET_KEY and only call Pagar.me from
  server-side endpoints.
  ---------------------------------------------------------------

  // /pages/api/pagarme/plans/index.js
  import fetch from 'node-fetch'

  export default async function handler(req, res) {
    const base = 'https://api.pagar.me/core/v5'
    const secret = process.env.PAGARME_SECRET_KEY
    if (!secret) return res.status(500).json({ error: 'Missing PAGARME_SECRET_KEY' })

    try {
      if (req.method === 'GET') {
        const r = await fetch(`${base}/plans`, { headers: { Authorization: `Bearer ${secret}` } })
        const data = await r.json()
        return res.status(r.status).json(data)
      }

      if (req.method === 'POST') {
        const payload = req.body
        const r = await fetch(`${base}/plans`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
          body: JSON.stringify(payload)
        })
        const data = await r.json()
        return res.status(r.status).json(data)
      }

      return res.status(405).end()
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: err.message })
    }
  }

  // /pages/api/pagarme/plans/[id].js
  export default async function handler(req, res) {
    const base = 'https://api.pagar.me/core/v5'
    const secret = process.env.PAGARME_SECRET_KEY
    const { id } = req.query
    if (!secret) return res.status(500).json({ error: 'Missing PAGARME_SECRET_KEY' })
    try {
      if (req.method === 'PUT') {
        const payload = req.body
        const r = await fetch(`${base}/plans/${id}`, {
          method: 'PATCH', // or PUT depending on API
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
          body: JSON.stringify(payload)
        })
        const data = await r.json()
        return res.status(r.status).json(data)
      }

      if (req.method === 'GET') {
        const r = await fetch(`${base}/plans/${id}`, { headers: { Authorization: `Bearer ${secret}` } })
        const data = await r.json()
        return res.status(r.status).json(data)
      }

      return res.status(405).end()
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: err.message })
    }
  }

  ---------------------------------------------------------------
  You can extend the same pattern to manage subscriptions, customers,
  webhooks, etc. Always keep the secret key server-side and use role
  checks on your API routes (admin-only) before forwarding requests.
  ---------------------------------------------------------------
*/
