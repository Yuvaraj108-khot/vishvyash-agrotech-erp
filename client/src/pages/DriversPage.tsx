import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  Plus, Search, Edit2, Trash2, Phone, MapPin, User,
  FileText, ShieldAlert, Loader2, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import toast from 'react-hot-toast';

interface Driver {
  id: string;
  name: string;
  phone: string;
  alternatePhone?: string;
  address?: string;
  licenseNumber?: string;
  aadhaarNumber?: string;
  isActive: boolean;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Dialog controls
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [address, setAddress] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchDrivers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/drivers');
      setDrivers(res.data.data || res.data);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load drivers.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const openAddDialog = () => {
    setSelectedDriver(null);
    setName('');
    setPhone('');
    setAlternatePhone('');
    setAddress('');
    setLicenseNumber('');
    setAadhaarNumber('');
    setIsOpen(true);
  };

  const openEditDialog = (driver: Driver) => {
    setSelectedDriver(driver);
    setName(driver.name);
    setPhone(driver.phone);
    setAlternatePhone(driver.alternatePhone || '');
    setAddress(driver.address || '');
    setLicenseNumber(driver.licenseNumber || '');
    setAadhaarNumber(driver.aadhaarNumber || '');
    setIsOpen(true);
  };

  const openDeleteDialog = (driver: Driver) => {
    setSelectedDriver(driver);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      toast.error('Name and Phone number are required.');
      return;
    }

    const payload = {
      name,
      phone,
      alternatePhone: alternatePhone || null,
      address: address || null,
      licenseNumber: licenseNumber || null,
      aadhaarNumber: aadhaarNumber || null,
    };

    setFormLoading(true);
    try {
      if (selectedDriver) {
        await api.put(`/drivers/${selectedDriver.id}`, payload);
        toast.success('Driver profile updated!');
      } else {
        await api.post('/drivers', payload);
        toast.success('Driver registered successfully!');
      }
      setIsOpen(false);
      fetchDrivers();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to save driver profile.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDriver) return;
    setFormLoading(true);
    try {
      await api.delete(`/drivers/${selectedDriver.id}`);
      toast.success('Driver marked inactive.');
      setIsDeleteOpen(false);
      fetchDrivers();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to deactivate driver.');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredDrivers = drivers.filter(
    (driver) =>
      driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.phone.includes(searchQuery) ||
      driver.licenseNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Driver Management</h1>
          <p className="text-sm text-muted-foreground">
            Register and track driver credentials, phone numbers, and licenses.
          </p>
        </div>
        <Button onClick={openAddDialog} className="flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Register Driver
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/75" />
        <Input
          placeholder="Search by name, phone, license..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-card border-border"
        />
      </div>

      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading drivers...</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDrivers.length > 0 ? (
            filteredDrivers.map((driver) => (
              <Card key={driver.id} className={`shadow-sm overflow-hidden flex flex-col justify-between border ${!driver.isActive ? 'opacity-60 border-dashed bg-muted/40' : 'bg-card border-border'}`}>
                <div>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <div className="space-y-1 pr-4 flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold truncate max-w-[150px]" title={driver.name}>
                          {driver.name}
                        </CardTitle>
                        <span className={`inline-block text-[9px] font-semibold ${driver.isActive ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                          {driver.isActive ? 'Active Duty' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => openEditDialog(driver)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      {driver.isActive && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-700" onClick={() => openDeleteDialog(driver)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3.5 text-xs text-muted-foreground">
                    <div className="grid grid-cols-2 gap-2 border-b pb-2.5">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Phone</span>
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {driver.phone}
                        </span>
                      </div>
                      {driver.alternatePhone && (
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Alt Phone</span>
                          <span className="font-semibold text-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {driver.alternatePhone}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">License No.</span>
                        <span className="font-medium text-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3" /> {driver.licenseNumber || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Aadhaar No.</span>
                        <span className="font-medium text-foreground flex items-center gap-1">
                          <ShieldAlert className="h-3 w-3" /> {driver.aadhaarNumber || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {driver.address && (
                      <div className="flex items-start gap-2 border-t pt-2.5 mt-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="leading-normal">{driver.address}</p>
                      </div>
                    )}
                  </CardContent>
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-sm text-muted-foreground border border-dashed rounded-xl bg-card">
              No drivers found matching your search.
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Driver Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedDriver ? 'Edit Driver Details' : 'Register New Driver'}</DialogTitle>
            <DialogDescription>
              Complete the registration details below. Name and primary phone number are required.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="driver-name">Driver Name *</Label>
                <Input
                  id="driver-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kamble"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="driver-phone">Primary Phone *</Label>
                  <Input
                    id="driver-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 9876001122"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="driver-alt-phone">Alternate Phone</Label>
                  <Input
                    id="driver-alt-phone"
                    value={alternatePhone}
                    onChange={(e) => setAlternatePhone(e.target.value)}
                    placeholder="e.g. +91 9876001133"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="driver-license">License Number</Label>
                  <Input
                    id="driver-license"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value.toUpperCase())}
                    placeholder="MH10-2020-0012345"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="driver-aadhaar">Aadhaar Number</Label>
                  <Input
                    id="driver-aadhaar"
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value)}
                    placeholder="1234-5678-9012"
                    maxLength={14}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="driver-address">Residential Address</Label>
                <Input
                  id="driver-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Walwa, Sangli"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading} className="flex items-center gap-1.5">
                {formLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {selectedDriver ? 'Update Driver' : 'Register Driver'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete / Inactivate Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-3">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">Deactivate Driver Profile?</DialogTitle>
            <DialogDescription className="text-center">
              Are you sure you want to deactivate <strong>{selectedDriver?.name}</strong>? They will no longer be available to assign to vehicles or invoices.
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
