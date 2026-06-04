import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/lib/api';
import {
  ArrowLeft, Plus, Trash2, Calendar, User, Truck,
  FileText, IndianRupee, Calculator, Loader2, AlertTriangle
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
}

interface Vehicle {
  id: string;
  vehicleNumber: string;
  vehicleType?: string;
  ownerName?: string;
}

interface LineItem {
  description: string;
  hsnCode: string;
  quantity: number;
  ratePerTon: number;
  transportRate: number;
}

export default function InvoiceCreatePage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  
  // Settings defaults
  const [defaultHsn, setDefaultHsn] = useState('4401');
  const [defaultProduct, setDefaultProduct] = useState('Biomass Briquettes');

  // Form Fields
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [clientId, setClientId] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerGst, setBuyerGst] = useState('');
  const [buyerCin, setBuyerCin] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerState, setBuyerState] = useState('Maharashtra');
  const [buyerStateCode, setBuyerStateCode] = useState('27');

  // Consignee Fields (for Template B)
  const [consigneeName, setConsigneeName] = useState('');
  const [consigneeGst, setConsigneeGst] = useState('');
  const [consigneeAddress, setConsigneeAddress] = useState('');
  const [consigneeState, setConsigneeState] = useState('Maharashtra');
  const [consigneeStateCode, setConsigneeStateCode] = useState('27');

  // Template Type (A or B)
  const [templateType, setTemplateType] = useState('A');
  
  const [vehicleId, setVehicleId] = useState('');
  const [newVehicleNumber, setNewVehicleNumber] = useState('');
  const [transportType, setTransportType] = useState('Truck');
  const [notes, setNotes] = useState('');

  // Line items state
  const [items, setItems] = useState<LineItem[]>([
    { description: 'Biomass Briquettes', hsnCode: '4401', quantity: 0, ratePerTon: 0, transportRate: 0 }
  ]);

  // Previous rates suggestion
  const [previousRates, setPreviousRates] = useState<number[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Duplicate Check Dialog
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [duplicateMsg, setDuplicateMsg] = useState('');
  const [pendingPayload, setPendingPayload] = useState<any>(null);

  useEffect(() => {
    const loadSetupData = async () => {
      try {
        const [clientsRes, vehiclesRes, settingsRes, nextNumberRes] = await Promise.all([
          api.get('/clients'),
          api.get('/vehicles'),
          api.get('/settings'),
          api.get(`/invoices/next-number?date=${invoiceDate}`),
        ]);

        setClients(clientsRes.data.filter((c: any) => c.isActive));
        setVehicles(vehiclesRes.data.filter((v: any) => v.isActive));
        
        // Parse settings
        const settings = settingsRes.data;
        if (settings.default_hsn_code) setDefaultHsn(settings.default_hsn_code);
        if (settings.default_product) setDefaultProduct(settings.default_product);
        
        // Set initial line item with defaults
        setItems([
          {
            description: settings.default_product || 'Biomass Briquettes',
            hsnCode: settings.default_hsn_code || '4401',
            quantity: 0,
            ratePerTon: 0,
            transportRate: 0
          }
        ]);

        setNextInvoiceNumber(nextNumberRes.data.nextNumber);
      } catch (err: any) {
        console.error(err);
        toast.error('Failed to load required ERP data.');
      } finally {
        setIsLoading(false);
      }
    };
    loadSetupData();
  }, []);

  // Update next invoice number whenever date changes
  const handleDateChange = async (dateVal: string) => {
    setInvoiceDate(dateVal);
    try {
      const res = await api.get(`/invoices/next-number?date=${dateVal}`);
      setNextInvoiceNumber(res.data.nextNumber);
    } catch (err) {
      console.error('Failed to fetch invoice number for date:', err);
    }
  };

  // Handle client selection change to auto-fill buyer details & fetch previous rates
  const handleClientChange = async (id: string) => {
    setClientId(id);
    setPreviousRates([]);
    const client = clients.find((c) => c.id === id);
    if (client) {
      setBuyerName(client.name);
      setBuyerGst(client.gstNumber || '');
      setBuyerCin(client.cinNumber || '');
      
      let fullAddress = client.address;
      if (client.city) fullAddress += `, ${client.city}`;
      if (client.pincode) fullAddress += ` - ${client.pincode}`;
      setBuyerAddress(fullAddress);
      setBuyerState(client.state || 'Maharashtra');
      setBuyerStateCode(client.state?.toLowerCase() === 'maharashtra' || !client.state ? '27' : '');

      // Consignee auto-fills buyer as fallback
      setConsigneeName(client.name);
      setConsigneeGst(client.gstNumber || '');
      setConsigneeAddress(fullAddress);
      setConsigneeState(client.state || 'Maharashtra');
      setConsigneeStateCode(client.state?.toLowerCase() === 'maharashtra' || !client.state ? '27' : '');

      // Load client profile to extract previous rates used
      try {
        const detailRes = await api.get(`/clients/${id}`);
        const rates: number[] = [];
        detailRes.data.invoices?.forEach((inv: any) => {
          inv.items?.forEach((item: any) => {
            if (item.ratePerTon && !rates.includes(item.ratePerTon)) {
              rates.push(item.ratePerTon);
            }
          });
        });
        setPreviousRates(rates.slice(0, 5));
      } catch (err) {
        console.error('Failed to fetch historical client rates:', err);
      }
    } else if (id === 'NEW') {
      // Clear fields for manual entry
      setBuyerName('');
      setBuyerGst('');
      setBuyerCin('');
      setBuyerAddress('');
      setBuyerState('Maharashtra');
      setBuyerStateCode('27');

      setConsigneeName('');
      setConsigneeGst('');
      setConsigneeAddress('');
      setConsigneeState('Maharashtra');
      setConsigneeStateCode('27');
    } else {
      setBuyerName('');
      setBuyerGst('');
      setBuyerCin('');
      setBuyerAddress('');
      setBuyerState('Maharashtra');
      setBuyerStateCode('27');

      setConsigneeName('');
      setConsigneeGst('');
      setConsigneeAddress('');
      setConsigneeState('Maharashtra');
      setConsigneeStateCode('27');
    }
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      { description: defaultProduct, hsnCode: defaultHsn, quantity: 0, ratePerTon: 0, transportRate: 0 }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof LineItem, value: any) => {
    const updatedItems = [...items];
    if (field === 'quantity' || field === 'ratePerTon' || field === 'transportRate') {
      updatedItems[index][field] = parseFloat(value) || 0;
    } else {
      (updatedItems[index] as any)[field] = value;
    }
    setItems(updatedItems);
  };

  // Live auto-calculations for CGST+SGST vs IGST
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.ratePerTon), 0);
  const transportTotal = items.reduce((sum, item) => sum + (item.quantity * item.transportRate), 0);
  const taxableAmount = subtotal + transportTotal;

  const isMaharashtra = buyerState.trim().toLowerCase() === 'maharashtra';
  const cgstRate = isMaharashtra ? 2.5 : 0;
  const sgstRate = isMaharashtra ? 2.5 : 0;
  const igstRate = isMaharashtra ? 0 : 5;

  const cgstAmount = taxableAmount * (cgstRate / 100);
  const sgstAmount = taxableAmount * (sgstRate / 100);
  const igstAmount = taxableAmount * (igstRate / 100);
  const grandTotal = taxableAmount + cgstAmount + sgstAmount + igstAmount;

  const submitInvoice = async (payload: any) => {
    setIsSubmitting(true);
    try {
      await api.post('/invoices', payload);
      toast.success(payload.status === 'FINAL' ? 'Invoice generated and finalized successfully!' : 'Invoice saved as Draft.');
      navigate('/invoices');
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 409) {
        // Accidental duplicate invoice warning
        setDuplicateMsg(`Accidental duplicate alert! An invoice with the same Client, Date, and Subtotal already exists in the system: ${err.response.data.duplicateInvoiceNo}. Are you sure you want to save this invoice anyway?`);
        setPendingPayload(payload);
        setIsDuplicateOpen(true);
      } else {
        toast.error(err.response?.data?.error || 'Failed to submit invoice.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicateConfirm = () => {
    setIsDuplicateOpen(false);
    if (pendingPayload) {
      const bypassedPayload = { ...pendingPayload, checkDuplicate: false };
      submitInvoice(bypassedPayload);
    }
  };

  const handleSave = (statusType: 'DRAFT' | 'FINAL') => {
    if (!clientId) {
      toast.error('Please select a client or choose "Create New Client".');
      return;
    }
    if (items.some((item) => item.quantity <= 0 || item.ratePerTon <= 0)) {
      toast.error('All line items must have a quantity and rate greater than 0.');
      return;
    }

    const payload = {
      invoiceDate: new Date(invoiceDate).toISOString(),
      clientId: clientId === 'NEW' ? '' : clientId,
      isNewClient: clientId === 'NEW',
      vehicleId: vehicleId === 'NEW' ? null : (vehicleId || null),
      isNewVehicle: vehicleId === 'NEW',
      newVehicleNumber: vehicleId === 'NEW' ? newVehicleNumber : '',
      transportType,
      buyerName,
      buyerGst: buyerGst || null,
      buyerCin: buyerCin || null,
      buyerAddress,
      buyerState,
      buyerStateCode,
      consigneeName: templateType === 'B' ? consigneeName : null,
      consigneeGst: templateType === 'B' ? consigneeGst : null,
      consigneeAddress: templateType === 'B' ? consigneeAddress : null,
      consigneeState: templateType === 'B' ? consigneeState : null,
      consigneeStateCode: templateType === 'B' ? consigneeStateCode : null,
      templateType,
      items,
      status: statusType,
      checkDuplicate: true, // enable protection prior to saving
    };

    submitInvoice(payload);
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Initializing billing module...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in text-xs">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/invoices">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-emerald-800 dark:text-emerald-500">Create Tax Invoice</h1>
          <p className="text-sm text-muted-foreground">
            Generate new invoice for briquette shipments.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Columns - Form Configurations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Template selection & general */}
          <Card className="shadow-sm border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-emerald-800">
                <FileText className="h-4 w-4 text-emerald-600" /> Invoice Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Invoice Number (FY Reset)</Label>
                  <Input value={nextInvoiceNumber} disabled className="bg-muted font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="date-input">Invoice Date</Label>
                  <Input
                    id="date-input"
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Template Type selection */}
              <div className="space-y-2 border-t pt-3">
                <Label className="font-semibold text-foreground">Invoice Layout Template</Label>
                <div className="flex items-center gap-6 mt-1.5">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
                    <input
                      type="radio"
                      name="templateType"
                      value="A"
                      checked={templateType === 'A'}
                      onChange={() => setTemplateType('A')}
                      className="h-4 w-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                    />
                    Template A (Single Buyer)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
                    <input
                      type="radio"
                      name="templateType"
                      value="B"
                      checked={templateType === 'B'}
                      onChange={() => setTemplateType('B')}
                      className="h-4 w-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                    />
                    Template B (Buyer + Consignee)
                  </label>
                </div>
              </div>

              <div className="space-y-1.5 border-t pt-3">
                <Label htmlFor="client-select">Select Client Account</Label>
                <select
                  id="client-select"
                  value={clientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                  required
                >
                  <option value="">Choose a client...</option>
                  <option value="NEW" className="font-bold text-emerald-700">-- Enter New Client Details --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Buyer & Consignee splitting */}
          {(clientId || clientId === 'NEW') && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Buyer block */}
              <Card className="shadow-sm border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Buyer Snapshot Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="buyer-name">Buyer Name</Label>
                    <Input id="buyer-name" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="buyer-gst">GSTIN</Label>
                      <Input id="buyer-gst" value={buyerGst} onChange={(e) => setBuyerGst(e.target.value.toUpperCase())} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="buyer-cin">CIN Number</Label>
                      <Input id="buyer-cin" value={buyerCin} onChange={(e) => setBuyerCin(e.target.value.toUpperCase())} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="buyer-address">Billing Address</Label>
                    <Input id="buyer-address" value={buyerAddress} onChange={(e) => setBuyerAddress(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="buyer-state">State</Label>
                      <Input id="buyer-state" value={buyerState} onChange={(e) => setBuyerState(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="buyer-code">State Code</Label>
                      <Input id="buyer-code" value={buyerStateCode} onChange={(e) => setBuyerStateCode(e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Consignee Block (rendered only if Template B is active) */}
              {templateType === 'B' && (
                <Card className="shadow-sm border-border bg-card border-emerald-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold text-emerald-800 uppercase">Consignee (Ship To) Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="consignee-name">Consignee Name</Label>
                      <Input id="consignee-name" value={consigneeName} onChange={(e) => setConsigneeName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="consignee-gst">GSTIN</Label>
                      <Input id="consignee-gst" value={consigneeGst} onChange={(e) => setConsigneeGst(e.target.value.toUpperCase())} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="consignee-address">Delivery Address</Label>
                      <Input id="consignee-address" value={consigneeAddress} onChange={(e) => setConsigneeAddress(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="consignee-state">State</Label>
                        <Input id="consignee-state" value={consigneeState} onChange={(e) => setConsigneeState(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="consignee-code">State Code</Label>
                        <Input id="consignee-code" value={consigneeStateCode} onChange={(e) => setConsigneeStateCode(e.target.value)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Transport details */}
          <Card className="shadow-sm border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-emerald-800">
                <Truck className="h-4 w-4 text-emerald-600" /> Logistics Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="transport-type">Transport Mode</Label>
                <Input id="transport-type" value={transportType} onChange={(e) => setTransportType(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vehicle-select">Select Vehicle</Label>
                <select
                  id="vehicle-select"
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none"
                >
                  <option value="">Choose vehicle...</option>
                  <option value="NEW" className="font-bold text-emerald-700">-- Enter New Vehicle --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.vehicleNumber} ({v.ownerName || 'Direct'})
                    </option>
                  ))}
                </select>
                {vehicleId === 'NEW' && (
                  <div className="mt-2 space-y-1.5">
                    <Label htmlFor="new-vehicle-number">New Vehicle Number</Label>
                    <Input 
                      id="new-vehicle-number" 
                      placeholder="MH-10-XX-1234" 
                      value={newVehicleNumber} 
                      onChange={(e) => setNewVehicleNumber(e.target.value.toUpperCase())} 
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Line Items Table */}
          <Card className="shadow-sm border-border bg-card">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-emerald-800">
                <Calculator className="h-4 w-4 text-emerald-600" /> Shipments Line Items
              </CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="flex items-center gap-1">
                <Plus className="h-3 w-3" /> Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b text-muted-foreground font-semibold">
                      <th className="py-2 pr-2">Description</th>
                      <th className="py-2 px-2 w-20">HSN</th>
                      <th className="py-2 px-2 w-24">Qty (Tons)</th>
                      <th className="py-2 px-2 w-32">Rate/Ton</th>
                      <th className="py-2 px-2 w-28">Transport / Ton</th>
                      <th className="py-2 pl-2 text-right w-24">Subtotal</th>
                      <th className="py-2 pl-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((item, idx) => {
                      const itemSubtotal = item.quantity * item.ratePerTon;
                      const itemTransport = item.quantity * item.transportRate;
                      const itemTotal = itemSubtotal + itemTransport;

                      return (
                        <tr key={idx} className="hover:bg-muted/10">
                          <td className="py-3 pr-2">
                            <Input
                              value={item.description}
                              onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                            />
                          </td>
                          <td className="py-3 px-2">
                            <Input
                              value={item.hsnCode}
                              onChange={(e) => handleItemChange(idx, 'hsnCode', e.target.value)}
                            />
                          </td>
                          <td className="py-3 px-2">
                            <Input
                              type="number"
                              step="0.001"
                              value={item.quantity || ''}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              placeholder="0.000"
                            />
                          </td>
                          <td className="py-3 px-2 space-y-1">
                            <Input
                              type="number"
                              step="0.01"
                              value={item.ratePerTon || ''}
                              onChange={(e) => handleItemChange(idx, 'ratePerTon', e.target.value)}
                              placeholder="₹0"
                            />
                            {previousRates.length > 0 && (
                              <div className="flex flex-wrap gap-1 items-center mt-1">
                                <span className="text-[9px] text-muted-foreground mr-1">History:</span>
                                {previousRates.map((rate, rIdx) => (
                                  <button
                                    key={rIdx}
                                    type="button"
                                    onClick={() => handleItemChange(idx, 'ratePerTon', rate)}
                                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 rounded px-1 text-[9px] font-semibold transition"
                                  >
                                    ₹{rate}
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={item.transportRate || ''}
                              onChange={(e) => handleItemChange(idx, 'transportRate', e.target.value)}
                              placeholder="₹0"
                            />
                          </td>
                          <td className="py-3 pl-2 text-right font-bold text-foreground">
                            ₹{itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 pl-2 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(idx)}
                              disabled={items.length === 1}
                              className="h-8 w-8 text-rose-500 hover:text-rose-700 disabled:opacity-30"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Summary & Submissions */}
        <div className="space-y-6">
          <Card className="shadow-sm border-border bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-emerald-800">
                <IndianRupee className="h-4 w-4 text-emerald-600" /> Invoice Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 border-b pb-4">
                <div className="flex justify-between text-muted-foreground">
                  <span>Product Subtotal:</span>
                  <span className="font-semibold text-foreground">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Transportation Total:</span>
                  <span className="font-semibold text-foreground">₹{transportTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-foreground font-bold border-t pt-2">
                  <span>Taxable Value:</span>
                  <span>₹{taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Automatic Tax calculations display */}
              <div className="space-y-3 border-b pb-4 pt-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Automatic GST Calculations</span>
                
                {isMaharashtra ? (
                  <div className="space-y-1.5 text-[11px] text-muted-foreground">
                    <div className="flex justify-between">
                      <span>CGST (2.5%):</span>
                      <span className="font-semibold text-foreground">₹{cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SGST (2.5%):</span>
                      <span className="font-semibold text-foreground">₹{sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 text-[11px] text-muted-foreground">
                    <div className="flex justify-between">
                      <span>IGST (5%):</span>
                      <span className="font-semibold text-foreground">₹{igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="bg-emerald-500/10 text-emerald-800 rounded p-2 text-[10px] mt-2 font-medium">
                      Out of State client (IGST applied automatically)
                    </div>
                  </div>
                )}
              </div>

              {/* Final totals */}
              <div className="space-y-1 pt-1.5">
                <span className="text-muted-foreground block font-medium">Grand Total (Net Billed):</span>
                <h2 className="text-3xl font-extrabold text-emerald-800 dark:text-emerald-500">
                  ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h2>
              </div>

              <div className="space-y-1.5 pt-2">
                <Label htmlFor="notes">Invoice Remarks (optional)</Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Billing terms, quality comments, etc..."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs focus-visible:outline-none"
                />
              </div>

              {/* Double buttons save actions */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => handleSave('DRAFT')}
                  className="w-full flex items-center justify-center gap-1"
                >
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSave('FINAL')}
                  className="w-full flex items-center justify-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Generate & Finalize'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Duplicate Warning Dialog */}
      <Dialog open={isDuplicateOpen} onOpenChange={setIsDuplicateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-3">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">Double Billing Warning</DialogTitle>
            <DialogDescription className="text-center text-xs leading-normal">
              {duplicateMsg}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-center gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsDuplicateOpen(false)} className="flex-1">
              Cancel & Modify
            </Button>
            <Button onClick={handleDuplicateConfirm} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white">
              Yes, Generate Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
