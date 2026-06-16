import React from 'react';
import {
  Users,
  FileText,
  BarChart3,
  DollarSign,
  CheckSquare,
  ArrowRight,
  Clock,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { BarChartPlaceholder, ProposalStatusBar } from '../components/dashboard/Charts';

// Sample data
const recentActivity = [
  { id: 1, event: 'New lead added', detail: 'Acme Corp — Website redesign', time: '2 min ago', type: 'lead' },
  { id: 2, event: 'Proposal sent', detail: 'GlobalTech — ERP integration', time: '18 min ago', type: 'proposal' },
  { id: 3, event: 'Payment received', detail: '$4,200 from Bright Solutions', time: '1 hr ago', type: 'payment' },
  { id: 4, event: 'Task completed', detail: 'Q3 market analysis review', time: '2 hr ago', type: 'task' },
  { id: 5, event: 'Lead prioritized', detail: 'DataStream Inc — High priority', time: '3 hr ago', type: 'lead' },
  { id: 6, event: 'Proposal accepted', detail: 'NovaTech — Mobile app project', time: '5 hr ago', type: 'proposal' },
];

const activityTypeConfig: Record<string, { variant: 'blue' | 'green' | 'yellow' | 'purple'; dot: boolean }> = {
  lead: { variant: 'blue', dot: true },
  proposal: { variant: 'purple', dot: true },
  payment: { variant: 'green', dot: true },
  task: { variant: 'yellow', dot: true },
};

const leadActivityData = [24, 31, 18, 42, 35, 28, 47, 39, 52, 44, 60, 55];
const leadActivityLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const spendData = [8200, 9100, 7400, 11200, 9800, 12400, 10600, 13200, 11800, 14500, 12900, 15800];
const spendLabels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

const proposalStatusData = [
  { label: 'Accepted', value: 18, color: '#10b981' },
  { label: 'Pending', value: 12, color: '#f59e0b' },
  { label: 'In Review', value: 8, color: '#6366f1' },
  { label: 'Rejected', value: 4, color: '#f43f5e' },
];

export const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-screen-xl">
      {/* Welcome banner */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 md:p-7"
        style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)',
          boxShadow: '0 4px 20px rgba(37,99,235,0.3)',
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white opacity-5" />
        <div className="absolute -bottom-8 right-16 w-32 h-32 rounded-full bg-white opacity-5" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-blue-200" />
            <span className="text-blue-200 text-sm font-medium">Good morning, John</span>
          </div>
          <h2
            className="text-white text-2xl font-bold mb-1"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Welcome to TrackHub
          </h2>
          <p className="text-blue-100 text-sm max-w-lg">
            Manage leads, proposals, analysis, transactions, and tasks from one place.
            Here's your overview for today.
          </p>
          <div className="flex items-center gap-4 mt-4">
            <div className="text-center">
              <p className="text-white text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>92%</p>
              <p className="text-blue-200 text-xs">Lead score avg</p>
            </div>
            <div className="w-px h-8 bg-blue-400 opacity-40" />
            <div className="text-center">
              <p className="text-white text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>7</p>
              <p className="text-blue-200 text-xs">Pending actions</p>
            </div>
            <div className="w-px h-8 bg-blue-400 opacity-40" />
            <div className="text-center">
              <p className="text-white text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>3</p>
              <p className="text-blue-200 text-xs">Proposals due</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          label="Total Leads"
          value="248"
          icon={Users}
          change={12}
          color="blue"
        />
        <StatCard
          label="Active Proposals"
          value="38"
          icon={FileText}
          change={5}
          color="purple"
        />
        <StatCard
          label="Pending Analysis"
          value="14"
          icon={BarChart3}
          change={-3}
          color="orange"
        />
        <StatCard
          label="Monthly Spend"
          value="$15.8k"
          icon={DollarSign}
          change={8}
          color="green"
        />
        <StatCard
          label="Open Tasks"
          value="27"
          icon={CheckSquare}
          change={-7}
          color="red"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Lead Activity */}
        <Card className="col-span-1 xl:col-span-1">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Lead Activity</h3>
              <p className="text-xs text-slate-400 mt-0.5">New leads per month</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-lg">
              <TrendingUp size={12} />
              +18%
            </div>
          </div>
          <BarChartPlaceholder
            title=""
            labels={leadActivityLabels}
            data={leadActivityData}
            color="#2563EB"
            height={160}
          />
        </Card>

        {/* Spend Overview */}
        <Card className="col-span-1 xl:col-span-1">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Spend Overview</h3>
              <p className="text-xs text-slate-400 mt-0.5">Monthly spend trend</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-lg">
              <TrendingUp size={12} />
              +24%
            </div>
          </div>
          <BarChartPlaceholder
            title=""
            labels={spendLabels}
            data={spendData}
            color="#10b981"
            height={160}
          />
        </Card>

        {/* Proposal Status */}
        <Card className="col-span-1 md:col-span-2 xl:col-span-1">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Proposal Status</h3>
          <p className="text-xs text-slate-400 mb-5">42 total proposals this quarter</p>
          <ProposalStatusBar data={proposalStatusData} />
          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
            <span className="text-xs text-slate-500">Acceptance rate</span>
            <span className="text-sm font-bold text-emerald-600" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              43%
            </span>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card padding="none">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Recent Activity</h3>
            <p className="text-xs text-slate-400 mt-0.5">Latest events across all modules</p>
          </div>
          <button className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:text-blue-700 transition-colors">
            View all <ArrowRight size={12} />
          </button>
        </div>
        <div className="divide-y divide-slate-50">
          {recentActivity.map((item) => {
            const config = activityTypeConfig[item.type] ?? activityTypeConfig.task;
            return (
              <div
                key={item.id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{item.event}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{item.detail}</p>
                </div>
                <Badge variant={config.variant} dot={config.dot}>
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
                  <Clock size={11} />
                  {item.time}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
