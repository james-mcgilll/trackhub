import {
  LayoutDashboard, FileText, BarChart3, Brain, TrendingUp,
  Briefcase, FilePlus, Star, CreditCard, NotebookPen, CheckSquare,
  type LucideIcon,
} from 'lucide-react';
import type { PageId } from '../App';

export interface NavItem {
  id: PageId;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',           label: 'Dashboard',           icon: LayoutDashboard, description: 'Overview and key metrics' },
  { id: 'proposals',           label: 'Proposal Details',    icon: FileText,        description: 'Track and manage proposals' },
  { id: 'reporting',           label: 'Reporting',           icon: BarChart3,       description: 'Detailed reports and exports' },
  { id: 'smart-analysis',      label: 'Smart Analysis',      icon: Brain,           description: 'AI-powered business insights' },
  { id: 'lead-analysis',       label: 'Lead Analysis',       icon: TrendingUp,      description: 'Analyze and score leads' },
  { id: 'job-analysis',        label: 'Job Analysis',        icon: Briefcase,       description: 'Monitor job performance' },
  { id: 'proposal-creation',   label: 'Proposal Creation',   icon: FilePlus,        description: 'Build and send proposals' },
  { id: 'lead-prioritization', label: 'Lead Prioritization', icon: Star,            description: 'Rank and prioritize leads' },
  { id: 'transactions',        label: 'Transactions',        icon: CreditCard,      description: 'Payments and spending history' },
  { id: 'tasks',               label: 'Task Tracker',         icon: CheckSquare,     description: 'Track tasks and tickets' },
  { id: 'notes',               label: 'Notes & To-Do',       icon: NotebookPen,     description: 'Manage notes and tasks' },
];
