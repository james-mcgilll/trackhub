import { useState, useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { ProposalProvider } from './context/ProposalContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { DashboardPage } from './pages/DashboardPage';
import { ProposalsPage } from './pages/ProposalsPage';
import { LeadAnalysisPage } from './pages/LeadAnalysisPage';
import { LeadPrioritizationPage } from './pages/LeadPrioritizationPage';
import { ReportingPage } from './pages/ReportingPage';
import { NotesPage } from './pages/NotesPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { TaskTrackerPage } from './pages/TaskTrackerPage';
import {
  SmartAnalysisPage, JobAnalysisPage,
  ProposalCreationPage,
} from './pages/PlaceholderPages';

export type PageId =
  | 'dashboard' | 'proposals' | 'reporting' | 'smart-analysis'
  | 'lead-analysis' | 'job-analysis' | 'proposal-creation'
  | 'lead-prioritization' | 'transactions' | 'notes' | 'tasks';

// Map between URL hash and PageId
const HASH_TO_PAGE: Record<string, PageId> = {
  '#/dashboard':           'dashboard',
  '#/proposals':           'proposals',
  '#/reporting':           'reporting',
  '#/smart-analysis':      'smart-analysis',
  '#/lead-analysis':       'lead-analysis',
  '#/job-analysis':        'job-analysis',
  '#/proposal-creation':   'proposal-creation',
  '#/lead-prioritization': 'lead-prioritization',
  '#/transactions':        'transactions',
  '#/notes':               'notes',
  '#/tasks':              'tasks',
};

const PAGE_TO_HASH: Record<PageId, string> = {
  'dashboard':           '#/dashboard',
  'proposals':           '#/proposals',
  'reporting':           '#/reporting',
  'smart-analysis':      '#/smart-analysis',
  'lead-analysis':       '#/lead-analysis',
  'job-analysis':        '#/job-analysis',
  'proposal-creation':   '#/proposal-creation',
  'lead-prioritization': '#/lead-prioritization',
  'transactions':        '#/transactions',
  'notes':               '#/notes',
  'tasks':              '#/tasks',
};

function getPageFromHash(): PageId {
  return HASH_TO_PAGE[window.location.hash] ?? 'dashboard';
}

function App() {
  const [currentPage, setCurrentPage] = useState<PageId>(getPageFromHash);
  const [searchHighlight, setSearchHighlight] = useState('');

  // Clear stale localStorage keys on startup
  useEffect(() => {
    const KEYS = [
      'trackhub_proposal_columns_v2', 'trackhub_proposal_rows_v2',
      'trackhub_la_columns_v1', 'trackhub_la_rows_v1', 'trackhub_lead_priority_v1',
    ];
    KEYS.forEach(k => { try { localStorage.removeItem(k); } catch {} });
  }, []);

  // Sync URL hash → page state on browser back/forward
  useEffect(() => {
    const onHashChange = () => setCurrentPage(getPageFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Navigate: update state + URL hash
  const navigate = (page: PageId, highlight = '') => {
    setCurrentPage(page);
    setSearchHighlight(highlight);
    window.location.hash = PAGE_TO_HASH[page];
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':           return <DashboardPage />;
      case 'proposals':           return <ProposalsPage searchHighlight={searchHighlight} onClearHighlight={() => setSearchHighlight('')} />;
      case 'reporting':           return <ReportingPage />;
      case 'smart-analysis':      return <SmartAnalysisPage />;
      case 'lead-analysis':       return <ErrorBoundary><LeadAnalysisPage searchHighlight={searchHighlight} /></ErrorBoundary>;
      case 'job-analysis':        return <JobAnalysisPage />;
      case 'proposal-creation':   return <ProposalCreationPage />;
      case 'lead-prioritization': return <ErrorBoundary><LeadPrioritizationPage /></ErrorBoundary>;
      case 'transactions':        return <ErrorBoundary><TransactionsPage /></ErrorBoundary>;
      case 'tasks':               return <ErrorBoundary><TaskTrackerPage /></ErrorBoundary>;
      case 'notes':               return <NotesPage />;
      default:                    return <DashboardPage />;
    }
  };

  return (
    <ProposalProvider>
      <Layout currentPage={currentPage} onNavigate={navigate}>
        {renderPage()}
      </Layout>
    </ProposalProvider>
  );
}

export default App;
