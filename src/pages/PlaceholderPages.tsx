import React from 'react';
import { Brain, TrendingUp, Briefcase, FilePlus, CreditCard } from 'lucide-react';
import { PlaceholderModule } from '../components/ui/PlaceholderModule';
import { PageHeader } from '../components/ui/PageHeader';



export const SmartAnalysisPage: React.FC = () => (
  <div>
    <PageHeader title="Smart Analysis" subtitle="AI-powered insights for your business" />
    <PlaceholderModule moduleName="Smart Analysis" description="Leverage AI-powered analysis to uncover patterns and actionable insights." icon={Brain} />
  </div>
);

export const LeadAnalysisPage: React.FC = () => (
  <div>
    <PageHeader title="Lead Analysis" subtitle="Analyze and score your leads" />
    <PlaceholderModule moduleName="Lead Analysis" description="Deep-dive into lead quality, conversion rates, and pipeline performance." icon={TrendingUp} />
  </div>
);

export const JobAnalysisPage: React.FC = () => (
  <div>
    <PageHeader title="Job Analysis" subtitle="Monitor job and project performance" />
    <PlaceholderModule moduleName="Job Analysis" description="Track job profitability, timelines, and resource utilization across projects." icon={Briefcase} />
  </div>
);

export const ProposalCreationPage: React.FC = () => (
  <div>
    <PageHeader title="Proposal Creation" subtitle="Build and send professional proposals" />
    <PlaceholderModule moduleName="Proposal Creation" description="Build, customize, and send professional proposals to potential clients." icon={FilePlus} />
  </div>
);



export const TransactionsPage: React.FC = () => (
  <div>
    <PageHeader title="Transactions" subtitle="Payments, invoices, and spending history" />
    <PlaceholderModule moduleName="Transactions" description="Review all financial transactions, invoices, payments, and spending records." icon={CreditCard} />
  </div>
);
