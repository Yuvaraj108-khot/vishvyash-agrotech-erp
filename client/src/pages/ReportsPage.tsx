import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  Download, Calendar, Leaf, FileText, IndianRupee, Landmark,
  Printer, Loader2, BarChart2, TrendingUp, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import toast from 'react-hot-toast';

interface ReportData {
  period: { start: string; end: string; type: string };
  summary: {
    totalInvoices: number;
    totalRevenue: number;
    totalTons: number;
    totalPaid: number;
    outstanding: number;
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
    totalTax: number;
  };
  invoices: any[];
  clientSummary: Array<{
    name: string;
    invoices: number;
    amount: number;
    tons: number;
  }>;
}

export default function ReportsPage() {
  const [type, setType] = useState('monthly');
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const params: any = { type };
      if (type === 'custom') {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      const res = await api.get('/reports', { params });
      setData(res.data);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to generate report summaries.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [type]);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReport();
  };

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const params: any = {};
      if (type === 'custom') {
        params.startDate = startDate;
        params.endDate = endDate;
      } else if (data?.period?.start && data?.period?.end) {
        params.startDate = data.period.start.split('T')[0];
        params.endDate = data.period.end.split('T')[0];
      }

      const res = await api.get('/reports/export/excel', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const fileStartDate = params.startDate || 'start';
      const fileEndDate = params.endDate || 'end';
      link.setAttribute('download', `VAE_Report_${fileStartDate}_to_${fileEndDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Excel Report downloaded successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to export Excel report.');
    } finally {
      setExportLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Generating report metrics...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 animate-in print:p-0 print:space-y-4">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit & Business Reports</h1>
          <p className="text-sm text-muted-foreground">
            Generate custom data reports and download Excel spreadsheets.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center gap-1.5">
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button size="sm" onClick={handleExportExcel} disabled={exportLoading} className="flex items-center gap-1.5">
            {exportLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export Excel
          </Button>
        </div>
      </div>

      {/* Filter and Configurations Card */}
      <Card className="shadow-sm border-border bg-card print:hidden">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 text-xs">
            <div className="flex-1 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="period-type">Report Period</Label>
                <select
                  id="period-type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="daily">Today</option>
                  <option value="weekly">Last 7 Days</option>
                  <option value="monthly">Current Month</option>
                  <option value="yearly">Current Year</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>

              {type === 'custom' && (
                <form onSubmit={handleCustomSubmit} className="col-span-2 grid grid-cols-2 gap-4 items-end">
                  <div className="space-y-1.5">
                    <Label htmlFor="rep-start">Start Date</Label>
                    <Input
                      id="rep-start"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-9"
                      required
                    />
                  </div>
                  <div className="space-y-1.5 flex gap-2 items-center">
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor="rep-end">End Date</Label>
                      <Input
                        id="rep-end"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-9"
                        required
                      />
                    </div>
                    <Button type="submit" size="sm" className="h-9 shrink-0">
                      Query
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Printable Report Header */}
      <div className="hidden print:block text-center border-b pb-4 mb-4">
        <h1 className="text-xl font-bold">VISHVYASH AGROTECH ENERGY</h1>
        <p className="text-xs text-muted-foreground">Survey No. 57, At Post Borgaon (BK), Tal. Walwa, Dist. Sangli, Maharashtra - 415403</p>
        <h2 className="text-sm font-bold uppercase tracking-wider mt-3">Business Summary Report</h2>
        <p className="text-[10px] text-muted-foreground">
          Period: {new Date(data.period.start).toLocaleDateString('en-IN')} to {new Date(data.period.end).toLocaleDateString('en-IN')}
        </p>
      </div>

      {/* Summary Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total Tonnage Sold</span>
            <h2 className="text-2xl font-extrabold tracking-tight">{data.summary.totalTons.toLocaleString('en-IN')} MT</h2>
            <span className="text-[10px] text-muted-foreground block">Briquettes tonnage delivered</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl print:hidden">
            <Leaf className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Billed Revenue</span>
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">₹{data.summary.totalRevenue.toLocaleString('en-IN')}</h2>
            <span className="text-[10px] text-muted-foreground block">Total of grand invoices</span>
          </div>
          <div className="p-3 bg-primary/10 text-primary rounded-xl print:hidden">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total Collection</span>
            <h2 className="text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">₹{data.summary.totalPaid.toLocaleString('en-IN')}</h2>
            <span className="text-[10px] text-muted-foreground block">Payments received in banks</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl print:hidden">
            <Landmark className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Pending Dues</span>
            <h2 className="text-2xl font-extrabold tracking-tight text-rose-600">₹{data.summary.outstanding.toLocaleString('en-IN')}</h2>
            <span className="text-[10px] text-muted-foreground block">Pending accounts receivable</span>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-600 rounded-xl print:hidden">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Tax Report details card */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-sm border-border bg-card md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-1.5"><Landmark className="h-4 w-4 text-emerald-600" /> Tax Collection Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5 text-xs font-medium">
            <div className="flex justify-between border-b pb-1.5 text-muted-foreground">
              <span>CGST Collected (MH):</span>
              <span className="text-foreground">₹{data.summary.totalCgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between border-b pb-1.5 text-muted-foreground">
              <span>SGST Collected (MH):</span>
              <span className="text-foreground">₹{data.summary.totalSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between border-b pb-1.5 text-muted-foreground">
              <span>IGST Collected (Outside MH):</span>
              <span className="text-foreground">₹{data.summary.totalIgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-foreground font-bold pt-1.5">
              <span>Total GST Collected:</span>
              <span className="text-emerald-700 font-extrabold text-[13px]">₹{data.summary.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </CardContent>
        </Card>

        {/* Client Ledger Summary Card */}
        <Card className="shadow-sm border-border bg-card md:col-span-2 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-1.5"><BarChart2 className="h-4 w-4 text-primary" /> Client Transaction Ledger</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                  <th className="p-3">Client Account</th>
                  <th className="p-3 text-right">Invoices Issued</th>
                  <th className="p-3 text-right">Tonnage Sold (MT)</th>
                  <th className="p-3 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.clientSummary.length > 0 ? (
                  data.clientSummary.map((client, index) => (
                    <tr key={index} className="hover:bg-muted/30">
                      <td className="p-3 font-semibold text-foreground">{client.name}</td>
                      <td className="p-3 text-right font-medium">{client.invoices}</td>
                      <td className="p-3 text-right font-medium">{client.tons.toLocaleString('en-IN')} MT</td>
                      <td className="p-3 text-right font-bold text-foreground">₹{client.amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      No sales ledger transactions recorded for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Invoices List Table details (primarily for print layout) */}
      <Card className="shadow-sm border-border bg-card overflow-hidden print:border-0 print:shadow-none">
        <CardHeader className="print:px-0">
          <CardTitle className="text-sm font-bold flex items-center gap-1.5"><FileText className="h-4 w-4 text-primary" /> Detailed Invoices Log</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                <th className="p-3">Invoice No</th>
                <th className="p-3">Date</th>
                <th className="p-3">Client Name</th>
                <th className="p-3 text-right">Quantity (MT)</th>
                <th className="p-3 text-right">Taxable Value</th>
                <th className="p-3 text-right">Total Amount</th>
                <th className="p-3 text-right">Outstanding</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.invoices.length > 0 ? (
                data.invoices.map((inv) => {
                  const qty = inv.items.reduce((s: number, i: any) => s + i.quantity, 0);
                  const outstanding = inv.grandTotal - inv.paidAmount;
                  return (
                    <tr key={inv.id} className="hover:bg-muted/30">
                      <td className="p-3 font-semibold text-foreground">{inv.invoiceNumber}</td>
                      <td className="p-3">{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
                      <td className="p-3 truncate max-w-[150px] font-medium">{inv.client.name}</td>
                      <td className="p-3 text-right font-medium">{qty.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right">₹{inv.taxableAmount.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-bold text-foreground">₹{inv.grandTotal.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-semibold text-rose-600">₹{outstanding.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-center">
                        <span className="font-semibold">{inv.status}</span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No invoices generated in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
