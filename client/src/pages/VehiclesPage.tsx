import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  Plus, Search, Edit2, Trash2, Car, User, Calendar, Loader2,
  AlertTriangle, Truck, Leaf, FileText, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import toast from 'react-hot-toast';

interface Vehicle {
  id: string;
  vehicleNumber: string;
  vehicleType?: string;
  ownerName?: string; // Transport Company
  isActive: boolean;
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Dialog controls
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Vehicle Shipment History Dialog
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [vehicleHistoryDetails, setVehicleHistoryDetails] = useState<any | null>(null);

  // Form states (simplified to Core MVP fields only)
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Truck');
  const [ownerName, setOwnerName] = useState('Vishvyash Agrotech Energy'); // Labeled "Transport Company"
  const [formLoading, setFormLoading] = useState(false);

  const fetchVehicles = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/vehicles');
      setVehicles(res.data);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load fleet records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const openAddDialog = () => {
    setSelectedVehicle(null);
    setVehicleNumber('');
    setVehicleType('Truck');
    setOwnerName('Vishvyash Agrotech Energy');
    setIsOpen(true);
  };

  const openEditDialog = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setVehicleNumber(vehicle.vehicleNumber);
    setVehicleType(vehicle.vehicleType || 'Truck');
    setOwnerName(vehicle.ownerName || 'Vishvyash Agrotech Energy');
    setIsOpen(true);
  };

  const openDeleteDialog = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDeleteOpen(true);
  };

  const openHistoryDialog = async (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/vehicles/${vehicle.id}`);
      setVehicleHistoryDetails(res.data);
    } catch (err) {
      console.error('Failed to fetch vehicle history details:', err);
      toast.error('Failed to load shipment logs.');
      setIsHistoryOpen(false);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNumber) {
      toast.error('Vehicle registration number is required.');
      return;
    }

    const payload = {
      vehicleNumber,
      vehicleType: vehicleType || null,
      ownerName: ownerName || null,
    };

    setFormLoading(true);
    try {
      if (selectedVehicle) {
        await api.put(`/vehicles/${selectedVehicle.id}`, payload);
        toast.success('Vehicle records updated!');
      } else {
        await api.post('/vehicles', payload);
        toast.success('Vehicle registered successfully!');
      }
      setIsOpen(false);
      fetchVehicles();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to save vehicle details.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedVehicle) return;
    setFormLoading(true);
    try {
      await api.delete(`/vehicles/${selectedVehicle.id}`);
      toast.success('Vehicle marked inactive.');
      setIsDeleteOpen(false);
      fetchVehicles();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to deactivate vehicle.');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.vehicleType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.ownerName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-emerald-800 dark:text-emerald-500">Fleet Directory</h1>
          <p className="text-sm text-muted-foreground">
            Manage your vehicles and view trip shipment histories in records.
          </p>
        </div>
        <Button onClick={openAddDialog} className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white">
          <Plus className="h-4 w-4" /> Register Vehicle
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/75" />
        <Input
          placeholder="Search by vehicle number, type, transport company..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-card border-border"
        />
      </div>

      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading fleet records...</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVehicles.length > 0 ? (
            filteredVehicles.map((vehicle) => (
              <Card key={vehicle.id} className={`shadow-sm overflow-hidden flex flex-col justify-between border ${!vehicle.isActive ? 'opacity-60 border-dashed bg-muted/40' : 'bg-card border-border hover:border-emerald-200'}`}>
                <div>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <div className="space-y-1 pr-4 flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                        <Car className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold truncate max-w-[150px] text-emerald-900 cursor-pointer" title="View historical trip ledger" onClick={() => openHistoryDialog(vehicle)}>
                          {vehicle.vehicleNumber}
                        </CardTitle>
                        <span className="text-[10px] text-muted-foreground block">
                          {vehicle.vehicleType || 'Commercial Vehicle'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => openEditDialog(vehicle)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      {vehicle.isActive && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-700" onClick={() => openDeleteDialog(vehicle)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs text-muted-foreground">
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-bold">Transport Company</span>
                      <span className="font-semibold text-foreground text-sm truncate block max-w-[200px]">
                        {vehicle.ownerName || 'Vishvyash Agrotech Energy'}
                      </span>
                    </div>
                  </CardContent>
                </div>
                <div className="px-6 py-2.5 border-t bg-muted/20 flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">Fleet Logistics</span>
                  <Button variant="ghost" size="sm" onClick={() => openHistoryDialog(vehicle)} className="h-7 px-2 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-500/10 font-bold text-[10px]">
                    <Truck className="h-3.5 w-3.5 mr-1" /> View Trip History
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-sm text-muted-foreground border border-dashed rounded-xl bg-card">
              No vehicles found matching search query.
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Vehicle Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-emerald-800 font-bold">{selectedVehicle ? 'Edit Vehicle records' : 'Register New Fleet Vehicle'}</DialogTitle>
            <DialogDescription>
              Provide vehicle registration details and assign its transport company for billing.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="veh-no">Vehicle Number *</Label>
                <Input
                  id="veh-no"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  placeholder="MH-10-AB-1234"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="veh-type">Vehicle Type</Label>
                <Input
                  id="veh-type"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  placeholder="e.g. Truck, Tractor Trolley"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="veh-owner">Transport Company</Label>
                <Input
                  id="veh-owner"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Vishvyash Agrotech Energy"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading} className="bg-emerald-700 hover:bg-emerald-800 text-white">
                {formLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {selectedVehicle ? 'Update Records' : 'Register Vehicle'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Vehicle Historical Trip Log Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-4xl overflow-y-auto max-h-[85vh] text-xs">
          <DialogHeader>
            <DialogTitle className="text-emerald-800 font-bold">Vehicle Logistics Shipment Log</DialogTitle>
            <DialogDescription>
              Shipment records and trip histories delivered by vehicle <strong>{selectedVehicle?.vehicleNumber}</strong>.
            </DialogDescription>
          </DialogHeader>

          {historyLoading || !vehicleHistoryDetails ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Aggregates Dashboard Cards */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="shadow-sm border-emerald-100 bg-emerald-500/5 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Total Tonnage Delivered</span>
                    <h2 className="text-xl font-extrabold text-emerald-800">
                      {(vehicleHistoryDetails.invoices || []).reduce((sum: number, inv: any) => sum + (inv.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0), 0).toFixed(3)} MT
                    </h2>
                  </div>
                  <Leaf className="h-5 w-5 text-emerald-600" />
                </Card>
                <Card className="shadow-sm border-emerald-100 bg-emerald-500/5 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Total Successful Trips</span>
                    <h2 className="text-xl font-extrabold text-emerald-800">{vehicleHistoryDetails.invoices?.length || 0} Trips</h2>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </Card>
              </div>

              {/* History Table */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Delivered Invoice Registers</span>
                <div className="border rounded-xl overflow-hidden bg-card overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px] text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                        <th className="px-3 py-2.5 min-w-[100px]">Invoice No</th>
                        <th className="px-3 py-2.5 min-w-[90px]">Date</th>
                        <th className="px-3 py-2.5 min-w-[150px]">Client Account</th>
                        <th className="px-3 py-2.5 text-right min-w-[100px]">Quantity (MT)</th>
                        <th className="px-3 py-2.5 text-right min-w-[100px]">Trip Sales Value</th>
                        <th className="px-3 py-2.5 text-center min-w-[80px]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {vehicleHistoryDetails.invoices && vehicleHistoryDetails.invoices.length > 0 ? (
                        vehicleHistoryDetails.invoices.map((inv: any) => {
                          const qty = inv.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0;
                          return (
                            <tr key={inv.id} className="hover:bg-muted/10">
                              <td className="px-3 py-2.5 font-semibold font-mono text-foreground">{inv.invoiceNumber}</td>
                              <td className="px-3 py-2.5">{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
                              <td className="px-3 py-2.5 font-medium">{inv.client?.name || inv.buyerName}</td>
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
                          <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                            No delivery register logs matching this vehicle number.
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
            <Button variant="outline" onClick={() => setIsHistoryOpen(false)}>
              Close history
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
            <DialogTitle className="text-center">Deactivate Vehicle Records?</DialogTitle>
            <DialogDescription className="text-center">
              Are you sure you want to deactivate <strong>{selectedVehicle?.vehicleNumber}</strong>? It will no longer be selector option for new invoices.
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
