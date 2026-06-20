import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Search, FileText, Download, Trash2, Calendar, User, Eye,
  Loader2, Plus, SlidersHorizontal, Ban, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import toast from 'react-hot-toast';

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  buyerName: string;
  grandTotal: number;
  templateType: string;
  consigneeName?: string;
  consigneeAddress?: string;
  consigneeGst?: string;
  buyerGst?: string;
  buyerAddress?: string;
  buyerState?: string;
  buyerStateCode?: string;
  status: 'DRAFT' | 'FINAL' | 'CANCELLED';
  client: { id: string; name: string };
  vehicle?: { id: string; vehicleNumber: string } | null;
  items: Array<{ quantity: number }>;
}

interface Client {
  id: string;
  name: string;
}

interface Vehicle {
  id: string;
  vehicleNumber: string;
}

export default function InvoicesPage() {
  const { isAdmin } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Filters state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [clientId, setClientId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Cancel Dialog
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // View Details Dialog
  const [selectedDetails, setSelectedDetails] = useState<any | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);

  const fetchFilterData = async () => {
    try {
      const [clientsRes, vehiclesRes] = await Promise.all([
        api.get('/clients'),
        api.get('/vehicles'),
      ]);
      setClients(clientsRes.data);
      setVehicles(vehiclesRes.data);
    } catch (err) {
      console.error('Failed to load filter select items:', err);
    }
  };

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const params: any = { page, limit: 12 };
      if (search) params.search = search;
      if (status) params.status = status;
      if (clientId) params.clientId = clientId;
      if (vehicleId) params.vehicleId = vehicleId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/invoices', { params });
      setInvoices(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load invoice records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFilterData();
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [page, status, clientId, vehicleId, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchInvoices();
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatus('');
    setClientId('');
    setVehicleId('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const openCancelDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsCancelOpen(true);
  };

  const handleCancelInvoice = async () => {
    if (!selectedInvoice) return;
    setCancelLoading(true);
    try {
      await api.delete(`/invoices/${selectedInvoice.id}`);
      toast.success(`Invoice ${selectedInvoice.invoiceNumber} DELETED.`);
      setIsCancelOpen(false);
      fetchInvoices();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to delete invoice.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleDownloadPDF = async (id: string, invoiceNumber: string) => {
    const loadingToast = toast.loading('Generating PDF... (may take a few seconds)');
    try {
      const res = await api.get(`/invoices/${id}/pdf`, {
        responseType: 'blob',
        timeout: 60000, // 60 second timeout
      });

      // Check if server returned a JSON error disguised as a blob
      const contentType = String(res.headers['content-type'] || '');
      if (contentType.includes('application/json')) {
        const text = await (res.data as Blob).text();
        const json = JSON.parse(text);
        throw new Error(json.error || json.message || 'PDF generation failed');
      }

      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invoiceNumber.replace(/\//g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.dismiss(loadingToast);
      toast.success('Invoice PDF downloaded!');
    } catch (err: any) {
      console.error('PDF download error:', err);
      toast.dismiss(loadingToast);
      const msg = err.response?.data?.error || err.message || 'Failed to download invoice PDF.';
      toast.error(msg);
    }
  };


  const handleViewDetails = async (id: string) => {
    setViewLoading(true);
    setIsViewOpen(true);
    try {
      const res = await api.get(`/invoices/${id}`);
      setSelectedDetails(res.data);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to fetch invoice details.');
      setIsViewOpen(false);
    } finally {
      setViewLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-emerald-800 dark:text-emerald-500">Invoice Register</h1>
          <p className="text-sm text-muted-foreground">
            Search sales register log, apply fiscal filters, download compliant PDFs, and manage lifecycle statuses.
          </p>
        </div>
        <Button asChild className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white">
          <Link to="/invoices/create">
            <Plus className="h-4 w-4" /> Create Invoice
          </Link>
        </Button>
      </div>

      {/* Register Filters card */}
      <Card className="shadow-sm border-border bg-card">
        <CardContent className="pt-6">
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-6 items-end">

              {/* Search Bar */}
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="search" className="flex items-center gap-1">
                  <Search className="h-3.5 w-3.5" /> Search
                </Label>
                <Input
                  id="search"
                  placeholder="Invoice No, Buyer Name, GST..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9"
                />
              </div>

              {/* Client filter select */}
              <div className="space-y-1.5">
                <Label htmlFor="client-filter">Client</Label>
                <select
                  id="client-filter"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:outline-none"
                >
                  <option value="">All Clients</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vehicle filter select */}
              <div className="space-y-1.5">
                <Label htmlFor="vehicle-filter">Vehicle</Label>
                <select
                  id="vehicle-filter"
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:outline-none"
                >
                  <option value="">All Vehicles</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.vehicleNumber}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status filter select */}
              <div className="space-y-1.5">
                <Label htmlFor="status-filter">Invoice Status</Label>
                <select
                  id="status-filter"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="FINAL">FINAL</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              {/* Date Filters grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="start-date">From</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9 p-2"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end-date">To</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9 p-2"
                  />
                </div>
              </div>

            </div>

            <div className="flex justify-end gap-2 text-xs pt-2">
              <Button type="button" variant="outline" size="sm" onClick={handleClearFilters}>
                Reset
              </Button>
              <Button type="submit" size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white">
                Apply Filters
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Invoices List Table */}
      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading sales register...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <Card className="hidden md:block shadow-sm border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                    <th className="px-4 py-3 min-w-[120px]">Invoice No</th>
                    <th className="px-4 py-3 min-w-[100px]">Billing Date</th>
                    <th className="px-4 py-3 min-w-[180px]">Buyer Name</th>
                    <th className="px-4 py-3 min-w-[110px]">Vehicle</th>
                    <th className="px-4 py-3 text-right min-w-[100px]">Quantity (MT)</th>
                    <th className="px-4 py-3 text-right min-w-[110px]">Grand Total</th>
                    <th className="px-4 py-3 text-center min-w-[90px]">Status</th>
                    <th className="px-4 py-3 text-right min-w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.length > 0 ? (
                    invoices.map((inv) => {
                      const totalQty = inv.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                      return (
                        <tr key={inv.id} className={`hover:bg-muted/30 ${inv.status === 'CANCELLED' ? 'bg-rose-500/5 text-muted-foreground opacity-75' : ''}`}>
                          <td className="px-4 py-3 font-semibold text-foreground font-mono">{inv.invoiceNumber}</td>
                          <td className="px-4 py-3">{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
                          <td className="px-4 py-3 truncate max-w-[200px] font-medium" title={inv.buyerName}>{inv.buyerName}</td>
                          <td className="px-4 py-3 font-mono text-[10px]">
                            {inv.vehicle?.vehicleNumber || <span className="text-muted-foreground">Direct</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">{totalQty.toFixed(3)} MT</td>
                          <td className="px-4 py-3 text-right font-bold text-foreground">₹{inv.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-bold ${inv.status === 'FINAL'
                                  ? 'bg-emerald-500/10 text-emerald-700'
                                  : inv.status === 'DRAFT'
                                    ? 'bg-blue-500/10 text-blue-700'
                                    : 'bg-rose-500/10 text-rose-700 line-through'
                                }`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right shrink-0">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="View details" onClick={() => handleViewDetails(inv.id)}>
                                <Eye className="h-4 w-4" />
                              </Button>

                              {inv.status !== 'DRAFT' && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" title="Download PDF" onClick={() => handleDownloadPDF(inv.id, inv.invoiceNumber)}>
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}

                              {inv.status !== 'CANCELLED' && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-700" title="Delete Invoice" onClick={() => openCancelDialog(inv)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        No invoices found in sales register.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-3">
            {invoices.length > 0 ? (
              invoices.map((inv) => {
                const totalQty = inv.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                return (
                  <Card key={inv.id} className="p-4 space-y-3 shadow-sm border border-border bg-card">
                    <div className="flex items-center justify-between">
                      <span className="font-bold font-mono text-sm text-foreground">{inv.invoiceNumber}</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-bold ${inv.status === 'FINAL'
                            ? 'bg-emerald-500/10 text-emerald-700'
                            : inv.status === 'DRAFT'
                              ? 'bg-blue-500/10 text-blue-700'
                              : 'bg-rose-500/10 text-rose-700 line-through'
                          }`}
                      >
                        {inv.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Buyer:</span>
                        <span className="font-medium text-foreground truncate max-w-[200px]">{inv.buyerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date:</span>
                        <span>{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Vehicle:</span>
                        <span className="font-mono">{inv.vehicle?.vehicleNumber || 'Direct'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Quantity:</span>
                        <span className="font-medium">{totalQty.toFixed(3)} MT</span>
                      </div>
                      <div className="flex justify-between items-center border-t pt-2 mt-2 font-semibold">
                        <span className="text-muted-foreground">Total Amount:</span>
                        <span className="text-sm font-bold text-emerald-800 dark:text-emerald-500">₹{inv.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t pt-2.5 mt-1">
                      <Button variant="outline" size="sm" className="h-8 flex-1" onClick={() => handleViewDetails(inv.id)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                      {inv.status !== 'DRAFT' && (
                        <Button variant="outline" size="sm" className="h-8 flex-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleDownloadPDF(inv.id, inv.invoiceNumber)}>
                          <Download className="h-3.5 w-3.5 mr-1" /> PDF
                        </Button>
                      )}
                      {inv.status !== 'CANCELLED' && (
                        <Button variant="outline" size="sm" className="h-8 flex-1 text-rose-500 border-rose-200 hover:bg-rose-50" onClick={() => openCancelDialog(inv)}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Void
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })
            ) : (
              <div className="p-8 text-center text-muted-foreground bg-card border rounded-lg">
                No invoices found in sales register.
              </div>
            )}
          </div>



          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t p-4 text-xs">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-muted-foreground font-medium">
                Page <strong>{page}</strong> of <strong>{totalPages}</strong>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Cancel Invoice Confirmation Dialog */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-3">
              <Ban className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center font-bold">Delete Invoice</DialogTitle>
            <DialogDescription className="text-center text-xs leading-normal">
              Are you sure you want to delete invoice <strong>{selectedInvoice?.invoiceNumber}</strong>?
              <br />
              This will permanently delete the invoice from the database along with all its line items and payments. <strong>This action cannot be undone.</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-center gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsCancelOpen(false)} className="flex-1">
              No, Keep Invoice
            </Button>
            <Button variant="destructive" onClick={handleCancelInvoice} disabled={cancelLoading} className="flex-1 flex justify-center items-center">
              {cancelLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Yes, Delete Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Invoice Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[85vh] text-xs">
          <DialogHeader>
            <DialogTitle className="text-emerald-800 font-bold">Invoice Details Ledger</DialogTitle>
          </DialogHeader>

          {viewLoading || !selectedDetails ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6 text-foreground">
              {/* Header Details */}
              <div className="grid grid-cols-4 gap-4 border-b pb-4">
                <div>
                  <span className="text-[9px] text-muted-foreground block font-bold uppercase">Invoice No</span>
                  <span className="text-sm font-bold font-mono">{selectedDetails.invoiceNumber}</span>
                </div>
                <div>
                  <span className="text-[9px] text-muted-foreground block font-bold uppercase">Billing Date</span>
                  <span className="font-medium">{new Date(selectedDetails.invoiceDate).toLocaleDateString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[9px] text-muted-foreground block font-bold uppercase">Status</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-bold ${selectedDetails.status === 'FINAL'
                        ? 'bg-emerald-500/10 text-emerald-700'
                        : selectedDetails.status === 'DRAFT'
                          ? 'bg-blue-500/10 text-blue-700'
                          : 'bg-rose-500/10 text-rose-700 line-through'
                      }`}
                  >
                    {selectedDetails.status}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-muted-foreground block font-bold uppercase">Template Layout</span>
                  <span className="font-bold text-foreground">Template {selectedDetails.templateType}</span>
                </div>
              </div>

              {/* Client & Shipping side-by-side shipping box */}
              <div className="grid grid-cols-2 gap-6 border-b pb-4">
                <div className="border rounded-xl p-3 bg-muted/20">
                  <span className="text-[9px] text-muted-foreground block font-bold uppercase mb-2 border-b pb-1">Buyer (Bill To)</span>
                  <p className="font-bold text-foreground text-sm">{selectedDetails.buyerName}</p>
                  {selectedDetails.buyerGst && <p className="mt-1 font-medium">GSTIN: <span className="font-mono">{selectedDetails.buyerGst}</span></p>}
                  {selectedDetails.buyerCin && <p className="font-medium">CIN No: <span className="font-mono">{selectedDetails.buyerCin}</span></p>}
                  <p className="text-muted-foreground leading-normal mt-1 text-[11px]">{selectedDetails.buyerAddress}</p>
                  <p className="text-muted-foreground text-[10px] mt-1">{selectedDetails.buyerState} (Code: {selectedDetails.buyerStateCode})</p>
                </div>
                <div>
                  {selectedDetails.templateType === 'B' ? (
                    <div className="border border-emerald-100 rounded-xl p-3 bg-emerald-500/5">
                      <span className="text-[9px] text-emerald-800 block font-bold uppercase mb-2 border-b pb-1">Consignee (Ship To)</span>
                      <p className="font-bold text-foreground text-sm">{selectedDetails.consigneeName || '-'}</p>
                      {selectedDetails.consigneeGst && <p className="mt-1 font-medium">GSTIN: <span className="font-mono">{selectedDetails.consigneeGst}</span></p>}
                      <p className="text-muted-foreground leading-normal mt-1 text-[11px]">{selectedDetails.consigneeAddress || '-'}</p>
                      <p className="text-muted-foreground text-[10px] mt-1">{selectedDetails.consigneeState || '-'} (Code: {selectedDetails.consigneeStateCode || '-'})</p>
                    </div>
                  ) : (
                    <div className="p-3">
                      <span className="text-[9px] text-muted-foreground block font-bold uppercase mb-2">Logistics / Dispatch</span>
                      <p className="font-medium">Transport Mode: <span className="text-foreground">{selectedDetails.transportType}</span></p>
                      {selectedDetails.vehicle && (
                        <p className="mt-2 text-[11px]">
                          Vehicle Assigned: <span className="font-mono font-bold text-foreground">{selectedDetails.vehicle.vehicleNumber}</span> ({selectedDetails.vehicle.vehicleType || 'Commercial'})
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <span className="text-[9px] text-muted-foreground block font-bold uppercase mb-2">Billing Line Items</span>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left font-semibold text-muted-foreground">
                      <th className="p-2">Description</th>
                      <th className="p-2 text-center" style={{ width: '80px' }}>HSN</th>
                      <th className="p-2 text-right" style={{ width: '95px' }}>Quantity</th>
                      <th className="p-2 text-right" style={{ width: '100px' }}>Rate / Ton</th>
                      <th className="p-2 text-right" style={{ width: '110px' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedDetails.items.map((item: any) => (
                      <tr key={item.id}>
                        <td className="p-2 font-medium">{item.description}</td>
                        <td className="p-2 text-center font-mono">{item.hsnCode}</td>
                        <td className="p-2 text-right font-medium">{item.quantity.toFixed(3)} Ton</td>
                        <td className="p-2 text-right">₹{item.ratePerTon.toLocaleString('en-IN')}</td>
                        <td className="p-2 text-right font-bold text-foreground">₹{item.totalAmount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div className="space-y-2">
                  {selectedDetails.notes && (
                    <>
                      <span className="text-[9px] text-muted-foreground block font-bold uppercase">Remarks</span>
                      <p className="p-2 bg-muted/50 rounded leading-normal text-[10px]">{selectedDetails.notes}</p>
                    </>
                  )}
                  {selectedDetails.amountInWords && (
                    <p className="text-[10px] text-muted-foreground font-semibold italic leading-normal pt-1">
                      {selectedDetails.amountInWords}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5 text-right font-medium">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal:</span>
                    <span>₹{selectedDetails.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-foreground border-b pb-1 font-semibold">
                    <span>Taxable Amount:</span>
                    <span>₹{selectedDetails.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>

                  {selectedDetails.igstRate > 0 ? (
                    <div className="flex justify-between text-muted-foreground text-[10px]">
                      <span>IGST ({selectedDetails.igstRate}%):</span>
                      <span>₹{selectedDetails.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-muted-foreground text-[10px]">
                        <span>CGST ({selectedDetails.cgstRate}%):</span>
                        <span>₹{selectedDetails.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground text-[10px]">
                        <span>SGST ({selectedDetails.sgstRate}%):</span>
                        <span>₹{selectedDetails.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between text-sm text-foreground font-extrabold border-t pt-1.5">
                    <span>Grand Total:</span>
                    <span className="text-emerald-700">₹{selectedDetails.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-3 flex justify-between sm:justify-between">
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
            {selectedDetails && selectedDetails.status !== 'DRAFT' && (
              <Button onClick={() => handleDownloadPDF(selectedDetails.id, selectedDetails.invoiceNumber)} className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white">
                <Download className="h-4 w-4" /> Download PDF Invoice
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
