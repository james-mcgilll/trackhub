import { useState, useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { ProposalProvider } from './context/ProposalContext';
import { DashboardPage } from './pages/DashboardPage';
import { ProposalsPage } from './pages/ProposalsPage';
import { LeadAnalysisPage } from './pages/LeadAnalysisPage';
import { LeadPrioritizationPage } from './pages/LeadPrioritizationPage';
import { ReportingPage } from './pages/ReportingPage';
import { NotesPage } from './pages/NotesPage';
import {
  SmartAnalysisPage, JobAnalysisPage,
  ProposalCreationPage, TransactionsPage,
} from './pages/PlaceholderPages';

export type PageId =
  | 'dashboard' | 'proposals' | 'reporting' | 'smart-analysis'
  | 'lead-analysis' | 'job-analysis' | 'proposal-creation'
  | 'lead-prioritization' | 'transactions' | 'notes';

function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');

  // Clear all localStorage on startup — Supabase is the only source of truth
  useEffect(() => {
    const KEYS = [
      'trackhub_proposal_columns_v2',
      'trackhub_proposal_rows_v2',
      'trackhub_la_columns_v1',
      'trackhub_la_rows_v1',
      'trackhub_lead_priority_v1',
    ];
    KEYS.forEach(k => { try { localStorage.removeItem(k); } catch {} });
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':           return <DashboardPage />;
      case 'proposals':           return <ProposalsPage />;
      case 'reporting':           return <ReportingPage />;
      case 'smart-analysis':      return <SmartAnalysisPage />;
      case 'lead-analysis':       return <LeadAnalysisPage />;
      case 'job-analysis':        return <JobAnalysisPage />;
      case 'proposal-creation':   return <ProposalCreationPage />;
      case 'lead-prioritization': return <LeadPrioritizationPage />;
      case 'transactions':        return <TransactionsPage />;
      case 'notes':               return <NotesPage />;
      default:                    return <DashboardPage />;
    }
  };

  return (
    // ProposalProvider wraps everything — data fetched ONCE, shared with all modules
    <ProposalProvider>
      <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
        {renderPage()}
      </Layout>
    </ProposalProvider>
  );
}

export default App;
