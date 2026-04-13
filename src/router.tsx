import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { LeadsPage } from '@/pages/LeadsPage'
import { LeadDetailPage } from '@/pages/LeadDetailPage'
import { DiagnosticosPage } from '@/pages/DiagnosticosPage'
import { ClientesPage } from '@/pages/ClientesPage'
import { ClienteDetailPage } from '@/pages/ClienteDetailPage'
import { ContratosPage } from '@/pages/ContratosPage'
import { DemandasPage } from '@/pages/DemandasPage'
import { IndicacoesPage } from '@/pages/IndicacoesPage'
import { ParceirosPage } from '@/pages/ParceirosPage'
import { OportunidadesPage } from '@/pages/OportunidadesPage'
import { AuditoriaPage } from '@/pages/AuditoriaPage'
import { ConfiguracoesPage } from '@/pages/ConfiguracoesPage'
import { SlackPage } from '@/pages/SlackPage'
import { ReunioesPage } from '@/pages/ReunioesPage'
import { PerfilPage } from '@/pages/PerfilPage'
import { MensagensPage } from '@/pages/MensagensPage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { MapaPage } from '@/pages/MapaPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'mapa', element: <MapaPage /> },
      { path: 'leads', element: <LeadsPage /> },
      { path: 'leads/:id', element: <LeadDetailPage /> },
      { path: 'diagnosticos', element: <DiagnosticosPage /> },
      { path: 'clientes', element: <ClientesPage /> },
      { path: 'clientes/:id', element: <ClienteDetailPage /> },
      { path: 'contratos', element: <ContratosPage /> },
      { path: 'demandas', element: <DemandasPage /> },
      { path: 'indicacoes', element: <IndicacoesPage /> },
      { path: 'parceiros', element: <ParceirosPage /> },
      { path: 'oportunidades', element: <OportunidadesPage /> },
      { path: 'reunioes', element: <ReunioesPage /> },
      { path: 'mensagens', element: <MensagensPage /> },
      { path: 'slack', element: <SlackPage /> },
      { path: 'auditoria', element: <AuditoriaPage /> },
      { path: 'configuracoes', element: <ConfiguracoesPage /> },
      { path: 'perfil', element: <PerfilPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
