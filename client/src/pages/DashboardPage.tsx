import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import {
  TrendingUp, Users, Truck, Car, FileText, IndianRupee,
  Leaf, AlertCircle, ArrowUpRight, Clock, CheckCircle2, ShieldAlert
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import toast from 'react-hot-toast';

interface DashboardData {
  cards: {
    totalRevenue: number;
    monthlyRevenue: number;
    totalTons: number;
    monthlyTons: number;
    totalInvoices: number;
    totalClients: number;
    totalDrivers: number;
    totalVehicles: number;
    outstanding: number;
    totalPaid: number;
  };
  recentInvoices: any[];
  monthlyData: any[];
  topClients: any[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/dashboard');
        setData(res.data);
      } catch (err: any) {
        console.error(err);
        toast.error('Failed to load dashboard analytics.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading dashboard analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const cardItems = [
    {
      title: 'Monthly Revenue',
      value: `₹${data.cards.monthlyRevenue.toLocaleString('en-IN')}`,
      description: 'Current month sales',
      icon: IndianRupee,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Tonnage Sold (Month)',
      value: `${data.cards.monthlyTons.toLocaleString('en-IN')} Tons`,
      description: 'Briquettes manufactured & sold',
      icon: Leaf,
      color: 'bg-green-500/10 text-green-600 dark:text-green-400',
    },
    {
      title: 'Total Revenue',
      value: `₹${data.cards.totalRevenue.toLocaleString('en-IN')}`,
      description: 'Lifetime sales invoice totals',
      icon: TrendingUp,
      color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
    },
    {
      title: 'Outstanding Dues',
      value: `₹${data.cards.outstanding.toLocaleString('en-IN')}`,
      description: 'Pending buyer payments',
      icon: AlertCircle,
      color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    },
  ];

  const quickStats = [
    { label: 'Active Clients', value: data.cards.totalClients, icon: Users, link: '/clients' },
    { label: 'Registered Drivers', value: data.cards.totalDrivers, icon: Truck, link: '/drivers' },
    { label: 'Fleet Vehicles', value: data.cards.totalVehicles, icon: Car, link: '/vehicles' },
    { label: 'Invoices Issued', value: data.cards.totalInvoices, icon: FileText, link: '/invoices' },
  ];

  // Colors for charts
  const COLORS = ['#059669', '#3b82f6', '#f59e0b', '#ef4444'];

  const pieData = [
    { name: 'Collected', value: data.cards.totalPaid },
    { name: 'Outstanding', value: data.cards.outstanding },
  ];

  return (
    <div className="space-y-8 animate-in">
      {/* Welcome banner */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user?.name}</h1>
          <p className="text-sm text-muted-foreground">
            Here is the operational overview for Vishvyash Agrotech Energy.
          </p>
        </div>
        <div className="text-xs text-muted-foreground bg-card border px-3 py-1.5 rounded-lg flex items-center gap-2 self-start md:self-auto">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Database Sync Active
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cardItems.map((item, idx) => (
          <div key={idx} className="rounded-xl border bg-card p-6 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{item.title}</span>
              <h2 className="text-2xl font-extrabold tracking-tight">{item.value}</h2>
              <span className="text-[11px] text-muted-foreground block">{item.description}</span>
            </div>
            <div className={`p-3 rounded-xl ${item.color}`}>
              <item.icon className="h-5 w-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {quickStats.map((stat, idx) => (
          <Link
            key={idx}
            to={stat.link}
            className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm hover:bg-accent/50 transition-colors"
          >
            <div className="p-2 bg-muted rounded-lg text-muted-foreground">
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
              <h3 className="text-lg font-bold">{stat.value}</h3>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Revenue over time (Area Chart) */}
        <div className="rounded-xl border bg-card p-6 shadow-sm md:col-span-2 space-y-4 min-w-0">
          <div>
            <h3 className="text-sm font-bold text-foreground">Revenue Dynamics</h3>
            <p className="text-[11px] text-muted-foreground">Monthly sales and collections performance</p>
          </div>
          <div className="h-72 w-full">
            {data.monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" name="Billed Revenue" dataKey="revenue" stroke="#059669" fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" name="Collected Revenue" dataKey="collected" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCol)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground border border-dashed rounded-lg">
                No historical sales records to display.
              </div>
            )}
          </div>
        </div>

        {/* Collections vs Outstanding (Pie Chart) */}
        <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between min-w-0">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Asset Collection</h3>
            <p className="text-[11px] text-muted-foreground">Percentage of collected vs outstanding receivables</p>
          </div>
          <div className="w-full h-56 relative flex items-center justify-center">
            {data.cards.totalRevenue > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#059669" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip formatter={(value: any) => `₹${value.toLocaleString('en-IN')}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-muted-foreground">No invoices generated yet.</div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="p-2 border rounded-lg">
              <span className="text-[10px] text-muted-foreground block">Collected</span>
              <span className="font-bold text-emerald-600">₹{data.cards.totalPaid.toLocaleString('en-IN')}</span>
            </div>
            <div className="p-2 border rounded-lg">
              <span className="text-[10px] text-muted-foreground block">Outstanding</span>
              <span className="font-bold text-rose-600">₹{data.cards.outstanding.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lists Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Invoices list */}
        <div className="rounded-xl border bg-card p-6 shadow-sm lg:col-span-2 space-y-4 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Recent Invoices</h3>
              <p className="text-[11px] text-muted-foreground">Latest invoices generated</p>
            </div>
            <Link to="/invoices" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              View all Invoices <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b text-muted-foreground font-semibold">
                  <th className="px-3 py-2 min-w-[90px]">Inv No.</th>
                  <th className="px-3 py-2 min-w-[120px]">Client</th>
                  <th className="px-3 py-2 min-w-[80px]">Date</th>
                  <th className="px-3 py-2 min-w-[90px]">Amount</th>
                  <th className="px-3 py-2 text-right min-w-[80px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.recentInvoices.length > 0 ? (
                  data.recentInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/50">
                      <td className="px-3 py-2.5 font-medium">{inv.invoiceNumber}</td>
                      <td className="px-3 py-2.5 truncate max-w-[120px]">{inv.client.name}</td>
                      <td className="px-3 py-2.5">{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
                      <td className="px-3 py-2.5 font-bold">₹{inv.grandTotal.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : inv.status === 'PARTIAL'
                              ? 'bg-amber-500/10 text-amber-600'
                              : 'bg-rose-500/10 text-rose-600'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                      No invoices recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card/List View */}
          <div className="md:hidden space-y-2">
            {data.recentInvoices.length > 0 ? (
              data.recentInvoices.map((inv) => (
                <div key={inv.id} className="p-3 border rounded-lg bg-card/50 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold font-mono text-foreground">{inv.invoiceNumber}</span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : inv.status === 'PARTIAL'
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-rose-500/10 text-rose-600'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground truncate max-w-[150px]">{inv.client.name}</span>
                    <span className="font-bold text-foreground">₹{inv.grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(inv.invoiceDate).toLocaleDateString('en-IN')}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-muted-foreground border rounded-lg">
                No invoices recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Top performing clients */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4 min-w-0">
          <div>
            <h3 className="text-sm font-bold text-foreground">Top Buyers</h3>
            <p className="text-[11px] text-muted-foreground">Clients generating highest transaction volume</p>
          </div>

          <div className="space-y-4">
            {data.topClients.length > 0 ? (
              data.topClients.map((client, idx) => (
                <div key={client.id} className="flex items-center justify-between border-b pb-3 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground truncate max-w-[150px]">{client.name}</p>
                      <p className="text-[10px] text-muted-foreground">{client.invoiceCount} invoices generated</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold">₹{client.totalAmount.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-center text-muted-foreground py-6">No clients have purchased yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
