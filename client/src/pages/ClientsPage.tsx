import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  Plus, Search, Edit2, Trash2, Phone, Mail, MapPin, Building,
  X, Check, AlertTriangle, Loader2, BarChart2, Leaf, IndianRupee, FileText
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
  gstNumber?: string;
  cinNumber?: string;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  isActive: boolean;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Dialog controls
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Client History & Stats Dialog
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerDetails, setLedgerDetails] = useState<any | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [cinNumber, setCinNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/clients');
      setClients(res.data);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load clients list.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const openAddDialog = () => {
    setSelectedClient(null);
    setName('');
    setGstNumber('');
    setCinNumber('');
    setAddress('');
    setCity('');
    setState('Maharashtra');
    setPincode('');
    setPhone('');
    setEmail('');
    setContactPerson('');
    setIsOpen(true);
  };

  const openEditDialog = (client: Client) => {
    setSelectedClient(client);
    setName(client.name);
    setGstNumber(client.gstNumber || '');
    setCinNumber(client.cinNumber || '');
    setAddress(client.address);
    setCity(client.city || '');
    setState(client.state || 'Maharashtra');
    setPincode(client.pincode || '');
    setPhone(client.phone || '');
    setEmail(client.email || '');
    setContactPerson(client.contactPerson || '');
    setIsOpen(true);
  };

  const openDeleteDialog = (client: Client) => {
    setSelectedClient(client);
    setIsDeleteOpen(true);
  };

  const openLedgerDialog = async (client: Client) => {
    setSelectedClient(client);
    setIsLedgerOpen(true);
    setLedgerLoading(true);
    try {
      const res = await api.get(`/clients/${client.id}`);
      setLedgerDetails(res.data);
    } catch (err) {
      console.error('Failed to fetch client statistics:', err);
      toast.error('Failed to load client ledger details.');
      setIsLedgerOpen(false);
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address) {
      toast.error('Name and Address are required.');
      return;
    }

    const payload = {
      name,
      gstNumber: gstNumber || null,
      cinNumber: cinNumber || null,
      address,
      city: city || null,
      state: state || 'Maharashtra',
      pincode: pincode || null,
      phone: phone || null,
      email: email || null,
      contactPerson: contactPerson || null,
    };

    setFormLoading(true);
    try {
      if (selectedClient) {
        await api.put(`/clients/${selectedClient.id}`, payload);
        toast.success('Client profile updated successfully!');
      } else {
        await api.post('/clients', payload);
        toast.success('New client profile created!');
      }
      setIsOpen(false);
      fetchClients();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to save client profile.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedClient) return;
    setFormLoading(true);
    try {
      await api.delete(`/clients/${selectedClient.id}`);
      toast.success('Client profile marked inactive.');
      setIsDeleteOpen(false);
      fetchClients();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to remove client profile.');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.gstNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-emerald-800 dark:text-emerald-500">Clients Directory</h1>
          <p className="text-sm text-muted-foreground">
            Manage your buyers, corporate accounts, view purchase history ledgers, and contact profiles.
          </p>
        </div>
        <Button onClick={openAddDialog} className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white">
          <Plus className="h-4 w-4" /> Add Client
        </Button>
      </div>

      {/* Filter and search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/75" />
        <Input
          placeholder="Search by company name, GST, contact person..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-card border-border"
        />
      </div>

      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading clients...</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.length > 0 ? (
            filteredClients.map((client) => (
              <Card key={client.id} className={`shadow-sm overflow-hidden flex flex-col justify-between border ${!client.isActive ? 'opacity-60 border-dashed bg-muted/40' : 'bg-card border-border hover:border-emerald-200'}`}>
                <div>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <div className="space-y-1 pr-4">
                      <CardTitle className="text-base font-bold truncate max-w-[200px] text-emerald-900 cursor-pointer" title="View historical ledger" onClick={() => openLedgerDialog(client)}>
                        {client.name}
                      </CardTitle>
                      {client.gstNumber ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded text-[10px]">
                          GST: {client.gstNumber}
                        </span>
                      ) : (
                        <span className="inline-flex bg-muted text-muted-foreground px-2 py-0.5 rounded text-[10px]">
                          No GST Profile
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => openEditDialog(client)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      {client.isActive && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-700" onClick={() => openDeleteDialog(client)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs text-muted-foreground">
                    {client.contactPerson && (
                      <div className="flex items-center gap-2">
                        <Building className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium text-foreground">{client.contactPerson}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2 border-t pt-2.5 mt-2">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="leading-normal">
                        {client.address}
                        {client.city && `, ${client.city}`}
                        {client.state && `, ${client.state}`}
                        {client.pincode && ` - ${client.pincode}`}
                      </p>
                    </div>
                  </CardContent>
                </div>
                <div className="px-6 py-3 border-t bg-muted/20 flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">Logistics Purchase Summary</span>
                  <Button variant="ghost" size="sm" onClick={() => openLedgerDialog(client)} className="h-7 px-2 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-500/10 font-bold text-[10px]">
                    <BarChart2 className="h-3.5 w-3.5 mr-1" /> View History
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-sm text-muted-foreground border border-dashed rounded-xl bg-card">
              No clients found matching the query.
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Client Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-emerald-800 font-bold">{selectedClient ? 'Edit Client Profile' : 'Register New Client'}</DialogTitle>
            <DialogDescription>
              Complete the profile fields below. Name and address are required.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Shree Cement Ltd."
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gstNumber">GSTIN Number</Label>
                <Input
                  id="gstNumber"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                  placeholder="27AABCS1234A1Z5"
                  maxLength={15}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cinNumber">CIN Number</Label>
                <Input
                  id="cinNumber"
                  value={cinNumber}
                  onChange={(e) => setCinNumber(e.target.value.toUpperCase())}
                  placeholder="U12345MH2020PTC123456"
                />
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="address">Billing Address *</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Plot/Survey No., Industrial Area"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Kolhapur"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Maharashtra"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="416005"
                  maxLength={6}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input
                  id="contactPerson"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. Mr. Rajesh Patil"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Contact Number</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9988776655"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="purchase@shreecement.com"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading} className="bg-emerald-700 hover:bg-emerald-800 text-white">
                {formLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {selectedClient ? 'Update Profile' : 'Create Profile'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Client Historical Ledger Dialog */}
      <Dialog open={isLedgerOpen} onOpenChange={setIsLedgerOpen}>
        <DialogContent className="max-w-4xl overflow-y-auto max-h-[85vh] text-xs">
          <DialogHeader>
            <DialogTitle className="text-emerald-800 font-bold">Client Transaction Ledger & Purchase History</DialogTitle>
            <DialogDescription>
              Purchase summaries and historical invoice register for <strong>{selectedClient?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          {ledgerLoading || !ledgerDetails ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Aggregates Dashboard Cards */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="shadow-sm border-emerald-100 bg-emerald-500/5 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Total Quantity Purchased</span>
                    <h2 className="text-xl font-extrabold text-emerald-800">{ledgerDetails.stats?.totalTons?.toFixed(3) || '0.000'} MT</h2>
                  </div>
                  <Leaf className="h-5 w-5 text-emerald-600" />
                </Card>
                <Card className="shadow-sm border-emerald-100 bg-emerald-500/5 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Total Purchase Value</span>
                    <h2 className="text-xl font-extrabold text-emerald-800">₹{ledgerDetails.stats?.totalAmount?.toLocaleString('en-IN') || '0'}</h2>
                  </div>
                  <IndianRupee className="h-5 w-5 text-emerald-600" />
                </Card>
                <Card className="shadow-sm border-emerald-100 bg-emerald-500/5 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Total Invoices Issued</span>
                    <h2 className="text-xl font-extrabold text-emerald-800">{ledgerDetails.stats?.totalInvoices || 0}</h2>
                  </div>
                  <FileText className="h-5 w-5 text-emerald-600" />
                </Card>
              </div>

              {/* History Table */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Historical Invoices Register Log</span>
                <div className="border rounded-xl overflow-hidden bg-card overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px] text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                        <th className="px-3 py-2.5 min-w-[100px]">Invoice No</th>
                        <th className="px-3 py-2.5 min-w-[90px]">Date</th>
                        <th className="px-3 py-2.5 min-w-[95px]">Vehicle</th>
                        <th className="px-3 py-2.5 text-right min-w-[100px]">Quantity (MT)</th>
                        <th className="px-3 py-2.5 text-right min-w-[100px]">Invoice Value</th>
                        <th className="px-3 py-2.5 text-center min-w-[80px]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {ledgerDetails.invoices && ledgerDetails.invoices.length > 0 ? (
                        ledgerDetails.invoices.map((inv: any) => {
                          const qty = inv.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0;
                          return (
                            <tr key={inv.id} className="hover:bg-muted/10">
                              <td className="px-3 py-2.5 font-semibold font-mono text-foreground">{inv.invoiceNumber}</td>
                              <td className="px-3 py-2.5">{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
                              <td className="px-3 py-2.5 font-mono text-[10px]">{inv.vehicleNumber || 'Direct'}</td>
                              <td className="px-3 py-2.5 text-right font-medium">{qty.toFixed(3)} MT</td>
                              <td className="px-3 py-2.5 text-right font-bold text-foreground">₹{inv.grandTotal.toLocaleString('en-IN')}</td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                  inv.status === 'FINAL' ? 'bg-emerald-500/10 text-emerald-700' : inv.status === 'DRAFT' ? 'bg-blue-500/10 text-blue-700' : 'bg-rose-500/10 text-rose-700'
                                }`}>
                                  {inv.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            No billing transactions recorded for this client account.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" onClick={() => setIsLedgerOpen(false)}>
              Close History
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete / Inactivate Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-3">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">Deactivate Client Profile?</DialogTitle>
            <DialogDescription className="text-center">
              Are you sure you want to deactivate <strong>{selectedClient?.name}</strong>? This profile will no longer appear in invoice selectors but existing invoices will remain intact.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex justify-center gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={formLoading} className="flex-1 flex justify-center items-center gap-1.5">
              {formLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
