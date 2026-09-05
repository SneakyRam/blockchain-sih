import React, { useState, useEffect } from 'react'
import { SplashScreen } from './components/SplashScreen'
import { LoginPage } from './components/LoginPage'
import { Navbar } from './components/Navbar'
import { Dashboard } from './components/Dashboard'
import { TraceResultsView } from './components/TraceResultsView'
import { ComplaintsPage } from './components/ComplaintsPage'
import { AlertsPage } from './components/AlertsPage'
import { ReportsPage } from './components/ReportsPage'
import { DetailPanel } from './components/DetailPanel'
import { TransactionTable } from './components/TransactionTable'
import { FilterBar, type Filters } from './components/FilterBar'
import { filterTransactions } from './filtering'
import { investigate, loadGraph, graphStatus, providerDiagnostics, authStatus, currentUser as fetchCurrentUser, logout as apiLogout } from './api'
import type {
  GraphPayload,
  GraphStatusResult,
  AuthStatusResult,
  InvestigationInput,
  InvestigationResult,
  ProviderDiagnosticsResult,
} from './types'
import './styles.css'

const initialFilters: Filters = {
  direction: '',
  asset: '',
  provider: '',
  transactionType: '',
  query: '',
  minAmount: '',
  startDate: '',
  endDate: '',
  hopLevel: '',
  vaspState: '',
  showTransactions: true,
}

const INITIAL_RECENT_TRACES = [
  {
    id: 'tr_8f912c',
    address: '0x71C8364b902e4d9435',
    chain: 'ethereum',
    risk: 'CRITICAL' as const,
    score: 92,
    exchange: 'Binance',
    time: '10m ago',
  },
  {
    id: 'tr_4a298e',
    address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    chain: 'bitcoin',
    risk: 'HIGH' as const,
    score: 84,
    exchange: 'WazirX',
    time: '35m ago',
  },
  {
    id: 'tr_1b83cc',
    address: 'TY18z98q8a12bc90fa4',
    chain: 'tron',
    risk: 'HIGH' as const,
    score: 78,
    exchange: 'OKX',
    time: '1h ago',
  },
  {
    id: 'tr_9d421a',
    address: '0x88F9343A18c0282bc1',
    chain: 'polygon',
    risk: 'LOW' as const,
    score: 22,
    exchange: 'CoinDCX',
    time: '3h ago',
  },
]

export default function App() {
  // Navigation & Auth State
  const [hasSeenSplash, setHasSeenSplash] = useState<boolean>(() => {
    return sessionStorage.getItem('cryptotrace_splash') === 'true'
  })
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [currentRoute, setCurrentRoute] = useState<string>('dashboard')
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('cryptotrace_theme') as 'dark' | 'light') || 'dark'
  })

  // Forensic Investigation State
  const [result, setResult] = useState<InvestigationResult | null>(null)
  const [graph, setGraph] = useState<GraphPayload | null>(null)
  const [backendConnected, setBackendConnected] = useState(false)
  const [backendError, setBackendError] = useState('')
  const [neo4jStatus, setNeo4jStatus] = useState<GraphStatusResult | null>(null)
  const [providerStatus, setProviderStatus] = useState<ProviderDiagnosticsResult | null>(null)
  const [databaseStatus, setDatabaseStatus] = useState<AuthStatusResult | null>(null)
  const [infrastructureLoading, setInfrastructureLoading] = useState(true)
  const [filters, setFilters] = useState<Filters>(initialFilters)
  const [selectedNode, setSelectedNode] = useState<Record<string, unknown> | null>(null)
  const [isInvestigating, setIsInvestigating] = useState(false)
  const [investigationError, setInvestigationError] = useState('')
  const [recentTraces, setRecentTraces] = useState(INITIAL_RECENT_TRACES)
  const [unreadAlerts, setUnreadAlerts] = useState(3)

  // Initialize theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('cryptotrace_theme', theme)
  }, [theme])

  useEffect(() => {
    let cancelled = false
    fetchCurrentUser()
      .then(({ user }) => {
        if (cancelled) return
        setCurrentUser(user.email)
        localStorage.setItem('cryptotrace_user', user.email)
      })
      .catch(() => {
        if (cancelled) return
        setCurrentUser(null)
        localStorage.removeItem('cryptotrace_user')
      })
      .finally(() => {
        if (!cancelled) setAuthLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadInfrastructureStatus = async () => {
      setInfrastructureLoading(true)
      setBackendError('')

      try {
        const [graphResult, diagnosticsResult, databaseResult] = await Promise.allSettled([
          graphStatus(),
          providerDiagnostics(),
          authStatus(),
        ])

        if (cancelled) return

        if (graphResult.status === 'fulfilled') {
          setBackendConnected(true)
          setNeo4jStatus(graphResult.value)
        } else {
          setBackendConnected(false)
          setBackendError(graphResult.reason instanceof Error ? graphResult.reason.message : 'Backend unavailable')
          setNeo4jStatus(null)
        }

        if (diagnosticsResult.status === 'fulfilled') {
          setProviderStatus(diagnosticsResult.value)
        } else {
          setProviderStatus(null)
        }

        if (databaseResult.status === 'fulfilled') {
          setDatabaseStatus(databaseResult.value)
        } else {
          setDatabaseStatus(null)
        }
      } finally {
        if (!cancelled) {
          setInfrastructureLoading(false)
        }
      }
    }

    void loadInfrastructureStatus()
    return () => {
      cancelled = true
    }
  }, [])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const handleSplashFinish = () => {
    sessionStorage.setItem('cryptotrace_splash', 'true')
    setHasSeenSplash(true)
  }

  const handleLoginSuccess = (email: string) => {
    setCurrentUser(email)
    setAuthLoading(false)
    localStorage.setItem('cryptotrace_user', email)
  }

  const handleLogout = () => {
    void apiLogout().catch(() => undefined)
    setCurrentUser(null)
    localStorage.removeItem('cryptotrace_user')
  }

  // Core Investigation Trigger (Calls real backend API)
  const handleStartTrace = async (address: string, chain: string, crossChain = 'All Chains') => {
    setIsInvestigating(true)
    setInvestigationError('')
    setCurrentRoute('trace')

    try {
      const input: InvestigationInput = {
        address: address.trim(),
        chain: chain || 'auto',
        case_id: `CASE-${Date.now().toString().slice(-6)}`,
        complaint_id: `NCRP-${Date.now().toString().slice(-6)}`,
        fraud_type: 'Investment Scam',
        reported_amount: '',
        reported_at: new Date().toISOString(),
        victim_reference: 'Portal Query',
        include_vasp: true,
        include_raw: true,
        force_refresh: false,
      }

      const data = await investigate(input)
      setResult(data)
      setGraph(data.graph ?? null)

      // Add to recent traces list
      setRecentTraces((prev) => [
        {
          id: data.investigation_id || `tr_${Date.now().toString().slice(-6)}`,
          address: data.address,
          chain: data.chain,
          risk: data.risk?.level ?? 'MEDIUM',
          score: data.risk?.score ?? 0,
          exchange: String(((data.vasp?.target as Record<string, any> | undefined)?.verdict as Record<string, any> | undefined)?.consensus ?? 'Unidentified'),
          time: 'Just now',
        },
        ...prev.slice(0, 7),
      ])

      // Attempt loading Neo4j graph if id exists
      if (data.investigation_id) {
        const neoGraph = await loadGraph(data.investigation_id).catch(() => null)
        if (neoGraph?.status === 'ok') {
          setGraph(neoGraph)
        }
      }
    } catch (err: unknown) {
      setInvestigationError(err instanceof Error ? err.message : 'Investigation backend unavailable')
      setCurrentRoute('dashboard')
    } finally {
      setIsInvestigating(false)
    }
  }

  // 1. Show Splash screen first time
  if (!hasSeenSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />
  }

  if (authLoading) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-secondary)' }}>Checking investigator session...</div>
  }

  // 2. Auth Gateway: Show Login if not signed in
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />
  }

  // 3. Main Authenticated Application
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Dark Theme Particle Field */}
      {theme === 'dark' && (
        <div className="particle-field">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                left: `${(i * 3.3) % 100}%`,
                animationDelay: `${(i * 0.8) % 15}s`,
                animationDuration: `${20 + (i % 10)}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Global Navbar */}
      <Navbar
        currentRoute={currentRoute}
        onRouteChange={setCurrentRoute}
        theme={theme}
        onToggleTheme={toggleTheme}
        unreadAlertCount={unreadAlerts}
        userEmail={currentUser}
        onLogout={handleLogout}
      />

      {/* Page Routing */}
      <main style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        {currentRoute === 'dashboard' && (
          <Dashboard
            onStartTrace={(addr, chain, bridge) => handleStartTrace(addr, chain, bridge)}
            recentTraces={recentTraces}
            apiConnected={backendConnected}
            apiError={backendError}
            graphStatus={neo4jStatus}
            diagnostics={providerStatus}
            databaseStatus={databaseStatus}
            infrastructureLoading={infrastructureLoading}
            investigationError={investigationError}
          />
        )}

        {currentRoute === 'trace' && (
          <div>
            {isInvestigating ? (
              <div style={{
                minHeight: '60vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  border: '3px solid var(--surface-card-border)',
                  borderTopColor: 'var(--primary)',
                  animation: 'spin 1s linear infinite',
                }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                  Analyzing Multi-Hop Blockchain Topology...
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Querying Etherscan, Bitcoin UTXO nodes, and VASP reputation oracles
                </p>
              </div>
            ) : result ? (
              <TraceResultsView
                result={result}
                graph={graph}
                onBack={() => setCurrentRoute('dashboard')}
                onSelectNode={setSelectedNode}
              />
            ) : (
              <div style={{ padding: '4rem', textAlign: 'center' }}>
                <h3>No active trace selected.</h3>
                <button onClick={() => setCurrentRoute('dashboard')} className="btn-cyber-primary" style={{ marginTop: '1rem' }}>
                  Open Dashboard Search
                </button>
              </div>
            )}
          </div>
        )}

        {currentRoute === 'complaints' && (
          <ComplaintsPage
            onTraceAddress={(addr, chain) => handleStartTrace(addr, chain)}
          />
        )}

        {currentRoute === 'alerts' && (
          <AlertsPage
            onTraceWallet={(wallet, chain) => handleStartTrace(wallet, chain)}
          />
        )}

        {currentRoute === 'reports' && (
          <ReportsPage
            onTraceWallet={(wallet, chain) => handleStartTrace(wallet, chain)}
          />
        )}
      </main>

      {/* Footer Telemetry */}
      <footer style={{
        padding: '1.25rem 2rem',
        borderTop: '1px solid var(--surface-card-border)',
        backgroundColor: 'var(--surface-card)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        zIndex: 10,
      }}>
        <div>
          CRYPTOTRACE FORENSIC NODE v7.0.0 | CONNECTED TO LOCAL FASTAPI RPC (8000)
        </div>
        <div>
          INDIAN CYBER CRIME COORDINATION CENTRE (I4C) | HIGH-FIDELITY AML SUITE
        </div>
      </footer>
    </div>
  )
}
