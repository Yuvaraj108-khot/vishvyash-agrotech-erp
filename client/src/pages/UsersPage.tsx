import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Plus, Edit2, Trash2, ShieldAlert, Phone, Mail, User,
  Loader2, KeyRound, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import toast from 'react-hot-toast';

interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'STAFF';
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog controls
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'STAFF'>('STAFF');
  const [isActive, setIsActive] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load system users.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openAddDialog = () => {
    setSelectedUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setRole('STAFF');
    setIsActive(true);
    setIsOpen(true);
  };

  const openEditDialog = (record: UserRecord) => {
    setSelectedUser(record);
    setName(record.name);
    setEmail(record.email);
    setPassword(''); // Don't pre-populate passwords
    setPhone(record.phone || '');
    setRole(record.role);
    setIsActive(record.isActive);
    setIsOpen(true);
  };

  const openDeleteDialog = (record: UserRecord) => {
    if (record.id === currentUser?.id) {
      toast.error('Self-deletion or deactivation is prevented for system security.');
      return;
    }
    setSelectedUser(record);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      toast.error('Name and Email address are required.');
      return;
    }
    if (!selectedUser && !password) {
      toast.error('Password is required for new accounts.');
      return;
    }

    setFormLoading(true);
    try {
      if (selectedUser) {
        // Edit User details
        await api.put(`/users/${selectedUser.id}`, { name, role, phone, isActive });
        toast.success('User account details updated.');
      } else {
        // Create new User account
        await api.post('/users', { email, password, name, role, phone });
        toast.success('New user account created successfully!');
      }
      setIsOpen(false);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to save user account.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setFormLoading(true);
    try {
      await api.delete(`/users/${selectedUser.id}`);
      toast.success('User account deactivated.');
      setIsDeleteOpen(false);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to deactivate user.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Access Control (Users)</h1>
          <p className="text-sm text-muted-foreground">
            Manage system users, administrators, and log authorizations.
          </p>
        </div>
        <Button onClick={openAddDialog} className="flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Add User Account
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading accounts database...</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {users.map((record) => (
            <Card key={record.id} className={`shadow-sm overflow-hidden flex flex-col justify-between border ${!record.isActive ? 'opacity-60 border-dashed bg-muted/40' : 'bg-card border-border'}`}>
              <div>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div className="space-y-1 pr-4 flex items-center gap-2.5">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${record.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-800' : 'bg-emerald-50 text-emerald-800'}`}>
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold truncate max-w-[150px]" title={record.name}>
                        {record.name}
                      </CardTitle>
                      <span className="text-[10px] text-muted-foreground block">
                        Role: <span className="font-semibold">{record.role}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => openEditDialog(record)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    {record.id !== currentUser?.id && record.isActive && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-700" onClick={() => openDeleteDialog(record)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{record.email}</span>
                  </div>
                  {record.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{record.phone}</span>
                    </div>
                  )}

                  <div className="border-t pt-2.5 mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Registered on: {new Date(record.createdAt).toLocaleDateString('en-IN')}</span>
                    <span className={`font-semibold ${record.isActive ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {record.isActive ? 'Active Access' : 'Access Revoked'}
                    </span>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit User Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{selectedUser ? 'Edit User Credentials' : 'Add User Account'}</DialogTitle>
            <DialogDescription>
              Complete the security credentials and assignment parameters below.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="usr-name">Full Name *</Label>
                <Input
                  id="usr-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Nilesh Patil"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="usr-email">Email Address *</Label>
                <Input
                  id="usr-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nilesh@vishvyash.com"
                  disabled={!!selectedUser}
                  required
                />
              </div>

              {!selectedUser && (
                <div className="space-y-1.5">
                  <Label htmlFor="usr-password">Password *</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                    <Input
                      id="usr-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="usr-phone">Phone Number</Label>
                <Input
                  id="usr-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543212"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1.5">
                <div className="space-y-1.5">
                  <Label htmlFor="usr-role">System Role</Label>
                  <select
                    id="usr-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'ADMIN' | 'STAFF')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="STAFF">STAFF</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                {selectedUser && (
                  <div className="space-y-1.5">
                    <Label htmlFor="usr-status">Account Access</Label>
                    <select
                      id="usr-status"
                      value={isActive ? 'true' : 'false'}
                      onChange={(e) => setIsActive(e.target.value === 'true')}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="true">Active</option>
                      <option value="false">Disabled</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading} className="flex items-center gap-1.5">
                {formLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {selectedUser ? 'Update Account' : 'Register User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete / Void User Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-3">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">Revoke User Access?</DialogTitle>
            <DialogDescription className="text-center">
              Are you sure you want to revoke system access for <strong>{selectedUser?.name}</strong>? They will no longer be able to log in to the ERP console.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex justify-center gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={formLoading} className="flex-1 flex justify-center items-center gap-1.5">
              {formLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Revoke Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
