import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Plus, Search, Calendar, User, IndianRupee, Trash2,
  Loader2, Filter, AlertCircle, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import toast from 'react-hot-toast';

interface Client {
  id: string;
  name: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  grandTotal: number;
  paidAmount: number;
  status: string;
}

interface Payment {
  id: string;
  amount: number;
  paymentMode: string;
  paymentDate: string;
  utrNumber?: string;
  chequeNumber?: string;
  bankName?: string;
  remarks?: string;
  invoice: { invoiceNumber: string; grandTotal: number };
  client: { name: string };
}

export default function PaymentsPage() {
  const { isAdmin } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientInvoices, setClientInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter state
  const [selectedClientFilter, setSelectedClientFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Dialog controllers
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // Form state
  const [clientId, setClientId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('NEFT');
  const [chequeNumber, setChequeNumber] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const params: any = { page, limit: 10 };
      if (selectedClientFilter) params.clientId = selectedClientFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/payments', { params });
      setPayments(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load payment logs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, selectedClientFilter, startDate, endDate]);

  // Load clients lists on load
  useEffect(() => {
    const loadClients = async () => {
      try {
        const res = await api.get('/clients');
        setClients(res.data.filter((c: any) => c.isActive));
      } catch (err) {
        console.error('Failed to load clients list:', err);
      }
    };
    loadClients();
  }, []);

  // Load invoices for selected client when recording new payment
  useEffect(() => {
    if (!clientId) {
      setClientInvoices([]);
      setInvoiceId('');
      return;
    }
    const loadInvoices = async () => {
      try {
        const res = await api.get('/invoices', { params: { clientId, limit: 100 } });
        // filter for unpaid or partially paid
        setClientInvoices(res.data.data.filter((inv: any) => inv.status !== 'PAID'));
      } catch (err) {
        console.error('Failed to load invoices:', err);
      }
    };
    loadInvoices();
  }, [clientId]);

  const openAddDialog = () => {
    setClientId('');
    setInvoiceId('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setAmount('');
    setPaymentMode('NEFT');
    setChequeNumber('');
    setUtrNumber('');
    setBankName('');
    setRemarks('');
    setIsOpen(true);
  };

  const openDeleteDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsDeleteOpen(true);
  };

  const handleInvoiceChange = (invId: string) => {
    setInvoiceId(invId);
    const invoice = clientInvoices.find((i) => i.id === invId);
    if (invoice) {
      // Auto populate outstanding balance as recommendation
      const outstanding = invoice.grandTotal - invoice.paidAmount;
      setAmount(String(outstanding));
    } else {
      setAmount('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !invoiceId || !amount || parseFloat(amount) <= 0) {
      toast.error('Please enter valid payment details.');
      return;
    }

    const payload = {
      invoiceId,
      clientId,
      paymentDate: new Date(paymentDate).toISOString(),
      amount: parseFloat(amount),
      paymentMode,
      chequeNumber: chequeNumber || null,
      utrNumber: utrNumber || null,
      bankName: bankName || null,
      remarks: remarks || null,
    };

    setFormLoading(true);
    try {
      await api.post('/payments', payload);
      toast.success('Payment recorded successfully.');
      setIsOpen(false);
      fetchPayments();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to record payment transaction.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPayment) return;
    setFormLoading(true);
    try {
      await api.delete(`/payments/${selectedPayment.id}`);
      toast.success('Payment transaction voided.');
      setIsDeleteOpen(false);
      fetchPayments();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to delete payment transaction.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Receipt Ledger</h1>
          <p className="text-sm text-muted-foreground">
            Log invoice collections, search transactions, and update outstanding values.
          </p>
        </div>
        <Button onClick={openAddDialog} className="flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Record Payment
        </Button>
      </div>

      {/* Filter Options */}
      <Card className="shadow-sm border-border bg-card">
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 items-end text-xs">
            <div className="space-y-1.5 col-span-2 sm:col-span-1 md:col-span-2">
              <Label htmlFor="client-filter">Filter by Client Account</Label>
              <select
                id="client-filter"
                value={selectedClientFilter}
                onChange={(e) => {
                  setSelectedClientFilter(e.target.value);
                  setPage(1);
                }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">All Clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pay-start">Start Date</Label>
              <Input
                id="pay-start"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-end">End Date</Label>
              <Input
                id="pay-end"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Logs list */}
      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading payments...</p>
          </div>
        </div>
      ) : (
        <Card className="shadow-sm border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                  <th className="p-3">Receipt Date</th>
                  <th className="p-3">Client Account</th>
                  <th className="p-3">Invoice Reference</th>
                  <th className="p-3">Payment Mode</th>
                  <th className="p-3">Transaction Details</th>
                  <th className="p-3 font-semibold">Amount Received</th>
                  {isAdmin && <th className="p-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.length > 0 ? (
                  payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-muted/30">
                      <td className="p-3">{new Date(payment.paymentDate).toLocaleDateString('en-IN')}</td>
                      <td className="p-3 font-semibold text-foreground">{payment.client.name}</td>
                      <td className="p-3">
                        <span className="font-semibold block">{payment.invoice.invoiceNumber}</span>
                        <span className="text-[10px] text-muted-foreground block">
                          Total Billed: ₹{payment.invoice.grandTotal.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 text-[10px]">
                          {payment.paymentMode}
                        </span>
                      </td>
                      <td className="p-3 max-w-[200px]">
                        {payment.utrNumber && <p className="truncate">UTR: <span className="font-mono text-foreground font-semibold">{payment.utrNumber}</span></p>}
                        {payment.chequeNumber && <p className="truncate">Cheque No: <span className="font-mono text-foreground font-semibold">{payment.chequeNumber}</span></p>}
                        {payment.bankName && <p className="truncate text-muted-foreground text-[10px]">{payment.bankName}</p>}
                        {payment.remarks && <p className="truncate italic text-muted-foreground text-[10px]">"{payment.remarks}"</p>}
                      </td>
                      <td className="p-3 font-bold text-emerald-700">₹{payment.amount.toLocaleString('en-IN')}</td>
                      {isAdmin && (
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-500 hover:text-rose-700"
                            title="Void Payment"
                            onClick={() => openDeleteDialog(payment)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="p-8 text-center text-muted-foreground">
                      No payment receipts logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
              <span className="text-muted-foreground">
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
        </Card>
      )}

      {/* Record Payment Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Payment Receipt</DialogTitle>
            <DialogDescription>
              Record an incoming payment from a client and link it to an outstanding invoice.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pay-client">Client Account *</Label>
                <select
                  id="pay-client"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  <option value="">Choose a client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {clientId && (
                <div className="space-y-1.5">
                  <Label htmlFor="pay-invoice">Linked Invoice *</Label>
                  <select
                    id="pay-invoice"
                    value={invoiceId}
                    onChange={(e) => handleInvoiceChange(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    required
                  >
                    <option value="">Select outstanding invoice...</option>
                    {clientInvoices.map((inv) => {
                      const outstanding = inv.grandTotal - inv.paidAmount;
                      return (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoiceNumber} (Outstanding: ₹{outstanding.toLocaleString('en-IN')})
                        </option>
                      );
                    })}
                  </select>
                  {clientInvoices.length === 0 && (
                    <p className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" /> No outstanding invoices for this client.
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pay-amount">Amount Received (INR) *</Label>
                  <Input
                    id="pay-amount"
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="₹0.00"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pay-date">Payment Date *</Label>
                  <Input
                    id="pay-date"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pay-mode">Payment Mode *</Label>
                <select
                  id="pay-mode"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  <option value="NEFT">NEFT</option>
                  <option value="RTGS">RTGS</option>
                  <option value="UPI">UPI</option>
                  <option value="CHEQUE">CHEQUE</option>
                  <option value="CASH">CASH</option>
                </select>
              </div>

              {/* Conditional payment fields */}
              {(paymentMode === 'NEFT' || paymentMode === 'RTGS' || paymentMode === 'UPI') && (
                <div className="space-y-1.5">
                  <Label htmlFor="utr">UTR Reference Number</Label>
                  <Input
                    id="utr"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    placeholder="e.g. UTR202605050001"
                  />
                </div>
              )}

              {paymentMode === 'CHEQUE' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="cheque">Cheque Number</Label>
                    <Input
                      id="cheque"
                      value={chequeNumber}
                      onChange={(e) => setChequeNumber(e.target.value)}
                      placeholder="e.g. 001234"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bank">Drawn Bank Name</Label>
                    <Input
                      id="bank"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. State Bank of India"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="pay-remarks">Transaction Remarks</Label>
                <Input
                  id="pay-remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Cleared full invoice balance"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading} className="flex items-center gap-1.5">
                {formLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Log Transaction
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete / Void Payment Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Void Payment Receipt?</DialogTitle>
            <DialogDescription>
              Are you sure you want to void this payment of <strong>₹{selectedPayment?.amount.toLocaleString('en-IN')}</strong>? Voiding this receipt will automatically increase the outstanding balance of invoice <strong>{selectedPayment?.invoice.invoiceNumber}</strong> and revert its payment status.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex justify-center gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={formLoading} className="flex-1 flex justify-center items-center gap-1.5">
              {formLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Void Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
