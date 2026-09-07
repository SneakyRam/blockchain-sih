import React, { useState, useEffect } from 'react'
import { SplashScreen } from './components/SplashScreen'

import { Navbar } from './components/Navbar'
import { CommandCenter } from './components/CommandCenter'
import { InvestigationWorkspace } from './components/InvestigationWorkspace'
import { CasesPage } from './components/CasesPage'
import { SystemHealthPage } from './components/SystemHealthPage'
import { investigate, createCase, runCaseInvestigation, loadGraph, graphStatus, providerDiagnostics, authStatus, currentUser as fetchCurrentUser, logout as apiLogout } from './api'
import type {
  GraphPayload,
  GraphStatusResult,
  AuthStatusResult,
  InvestigationInput,
  InvestigationResult,
  ProviderDiagnosticsResult,
} from './types'
import { useInvestigation } from './context/InvestigationContext'
import './styles.css'

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
  const [currentUser, setCurrentUser] = useState<string | null>('investigator@i4c.gov.in')
  const [currentRoute, setCurrentRoute] = useState<string>('dashboard')
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('cryptotrace_theme') as 'dark' | 'light') || 'dark'
  })

  // Forensic Investigation State
  const { setInvestigation, setGraph: setContextGraph, activeInvestigation: result, activeGraph: graph } = useInvestigation()

  const [backendConnected, setBackendConnected] = useState(false)
  const [backendError, setBackendError] = useState('')
  const [neo4jStatus, setNeo4jStatus] = useState<GraphStatusResult | null>(null)
  const [providerStatus, setProviderStatus] = useState<ProviderDiagnosticsResult | null>(null)
  const [databaseStatus, setDatabaseStatus] = useState<AuthStatusResult | null>(null)
  const [infrastructureLoading, setInfrastructureLoading] = useState(true)
  const [isInvestigating, setIsInvestigating] = useState(false)
  const [investigationError, setInvestigationError] = useState('')
  const [loaderStep, setLoaderStep] = useState(0)
  const [liveEvents, setLiveEvents] = useState<{timestamp: string, message: string}[]>([])
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
        // Keep default investigator instead of nulling it out
        localStorage.removeItem('cryptotrace_user')
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
      const caseRef = `CASE-${Date.now().toString().slice(-6)}`
      
      // 1. Create a Case first so the worker can attach the investigation
      const caseRes = await createCase({
        case_reference: caseRef,
        title: `Auto-Trace ${address.slice(0, 8)}`,
        description: 'Auto-generated case from Command Center',
        priority: 'medium',
        fraud_type: 'Investment Scam',
        complaint_reference: `NCRP-${Date.now().toString().slice(-6)}`,
        victim_reference: 'Portal Query',
        targets: [{ address: address.trim(), chain: chain || 'auto' }]
      })
      
      const caseId = caseRes.id
      
      // Reset loader step and live events
      setLoaderStep(0)
      setLiveEvents([])
      
      await new Promise<void>((resolve, reject) => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsUrl = `${protocol}//${window.location.host}/api/v1/ws/cases/${caseId}`
        const ws = new WebSocket(wsUrl)
        
        ws.onopen = () => {
          
          const input: InvestigationInput = {
            address: address.trim(),
            chain: chain || 'auto',
            case_id: caseId,
            complaint_id: `NCRP-${Date.now().toString().slice(-6)}`,
            fraud_type: 'Investment Scam',
            reported_amount: '',
            reported_at: new Date().toISOString(),
            victim_reference: 'Portal Query',
            include_vasp: true,
            include_raw: true,
            force_refresh: false,
            max_records: 100,
          }
          
          // Trigger the background worker NOW that the websocket is listening
          runCaseInvestigation(caseId, input).catch(err => {
             ws.close()
             reject(err)
          })
        }
        
        ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data)
            
            // Log everything except empty updates
            const time = new Date().toLocaleTimeString()
            let msg = data.message || (data.event_type ? `Processing ${data.event_type}...` : 'Worker update')
            setLiveEvents(prev => [...prev, { timestamp: time, message: msg }])
            
            if (data.event_type === 'job.progress') {
               const stage = data.payload?.stage
               if (stage === 'Querying Global Blockchain Networks') {
                   setLoaderStep(2)
               } else if (stage === 'Extracting High-Volume Transaction Graph') {
                   setLoaderStep(3)
               } else if (stage === 'Cross-Referencing VASP Intelligence Oracles') {
                   setLoaderStep(5)
               } else if (stage === 'Running Risk Fusion & Attribution Models') {
                   setLoaderStep(6)
               }
            }

            if (data.event_type === 'job.completed') {
               const finalData = data.payload?.result
               if (finalData) {
                  // Use inline graph from payload directly (works for both demo and real)
                  const inlineGraph = finalData.graph ?? null
                  setInvestigation(finalData, inlineGraph)

                  // Determine VASP exchange name from counterparty_order or vasp_entities
                  const vaspEntities = finalData.vasp?.vasp_entities as Array<Record<string, unknown>> | undefined
                  const cpo = finalData.vasp?.counterparty_order as Array<Record<string, unknown>> | undefined
                  const firstIdentified = cpo?.find((c: Record<string, unknown>) => c.identified) ?? vaspEntities?.[0]
                  const exchangeName = String(firstIdentified?.entity_name ?? firstIdentified?.name ?? 'Unidentified')

                  // Add to recent traces list
                  setRecentTraces((prev) => [
                    {
                      id: finalData.investigation_id || `tr_${Date.now().toString().slice(-6)}`,
                      address: finalData.address,
                      chain: finalData.chain,
                      risk: finalData.risk?.level ?? 'MEDIUM',
                      score: finalData.risk?.score ?? 0,
                      exchange: exchangeName,
                      time: 'Just now',
                    },
                    ...prev.slice(0, 7),
                  ])

                  // Only fall back to Neo4j if inline graph is empty
                  if (finalData.investigation_id && (!inlineGraph || (inlineGraph.node_count ?? 0) === 0)) {
                    const neoGraph = await loadGraph(finalData.investigation_id).catch(() => null)
                    if (neoGraph?.status === 'ok' && (neoGraph.node_count ?? 0) > 0) {
                      setContextGraph(neoGraph)
                    }
                  }
               }
               ws.close()
               resolve()
            }

                        if (data.event_type === 'job.failed') {
               ws.close()
               reject(new Error(data.payload?.error || 'Worker job failed'))
            }
          } catch (e) {
            // ignore parse errors
          }
        }
        
        ws.onerror = () => {
           reject(new Error('WebSocket connection error'))
        }
      })
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

  // 3. Main Authenticated Application
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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
          <CommandCenter
            onStartTrace={(addr, chain) => handleStartTrace(addr, chain)}
          />
        )}

        {currentRoute === 'trace' && (
          <div>
            {isInvestigating ? (
              <div style={{
                minHeight: '70vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2.5rem',
              }}>
                {/* Glowing Core */}
                <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                   <div style={{
                     position: 'absolute', inset: 0,
                     borderRadius: '50%',
                     border: '2px solid rgba(56, 189, 248, 0.1)',
                     borderTopColor: 'var(--primary)',
                     borderBottomColor: 'var(--primary)',
                     animation: 'spin 2s linear infinite',
                   }} />
                   <div style={{
                     position: 'absolute', inset: '10px',
                     borderRadius: '50%',
                     border: '2px dashed rgba(56, 189, 248, 0.3)',
                     animation: 'spin 4s linear infinite reverse',
                   }} />
                   <div style={{
                     position: 'absolute', inset: '30px',
                     backgroundColor: 'rgba(56, 189, 248, 0.1)',
                     borderRadius: '50%',
                     boxShadow: '0 0 30px rgba(56, 189, 248, 0.4)',
                     animation: 'pulse 2s ease-in-out infinite',
                   }} />
                   <svg style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '32px', height: '32px', color: 'var(--primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                   </svg>
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.5rem 0', color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
                    Running Deep Trace Analysis
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, maxWidth: '400px', lineHeight: 1.5 }}>
                    Secure tunnel established. Bypassing rate limits and correlating multi-hop blockchain topology.
                  </p>
                </div>
                
                {/* Loader */}
                <div className="panel" style={{ 
                  width: '100%', 
                  maxWidth: '500px', 
                  backgroundColor: 'var(--surface-hover)', 
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                }}>
                  {[
                    { id: 0, label: 'Initializing Forensic Engine & Worker Node' },
                    { id: 1, label: 'Connecting to Blockchain RPC Nodes' },
                    { id: 2, label: 'Querying Global Blockchain Networks' },
                    { id: 3, label: 'Extracting High-Volume Transaction Graph' },
                    { id: 4, label: 'Ingesting Transactions into Neo4j' },
                    { id: 5, label: 'Cross-Referencing VASP Intelligence Oracles' },
                    { id: 6, label: 'Computing Graph Centralities & Hubs' },
                    { id: 7, label: 'Running Risk Fusion & Attribution Models' },
                  ].map((step, idx) => (
                    <div key={step.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      opacity: loaderStep >= idx ? 1 : 0.3,
                      transition: 'all 0.5s ease',
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: loaderStep > idx ? 'rgba(16, 185, 129, 0.1)' : loaderStep === idx ? 'rgba(56, 189, 248, 0.1)' : 'var(--bg-secondary)',
                        border: `1px solid ${loaderStep > idx ? 'var(--emerald)' : loaderStep === idx ? 'var(--primary)' : 'var(--surface-card-border)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: loaderStep > idx ? 'var(--emerald)' : 'var(--primary)',
                      }}>
                        {loaderStep > idx ? (
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : loaderStep === idx ? (
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'currentColor', animation: 'pulse 1.5s infinite' }} />
                        ) : null}
                      </div>
                      <span style={{ 
                        fontSize: '0.85rem', 
                        fontWeight: loaderStep >= idx ? 500 : 400,
                        color: loaderStep > idx ? 'var(--text-primary)' : loaderStep === idx ? 'var(--primary)' : 'var(--text-muted)'
                      }}>
                        {step.label}
                      </span>
                      {loaderStep === idx && (
                        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--primary)', animation: 'pulse 1.5s infinite' }}>
                          Processing...
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Transparency Log Feed removed per user request */}
              </div>
            ) : result ? (
              <InvestigationWorkspace />
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

        {currentRoute === 'cases' && (
          <CasesPage />
        )}

        {currentRoute === 'alerts' && (
          <SystemHealthPage />
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
