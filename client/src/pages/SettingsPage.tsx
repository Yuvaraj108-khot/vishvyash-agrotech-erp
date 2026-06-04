import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  Building, Settings, Landmark, ShieldCheck, Download,
  Database, RefreshCw, Loader2, Save, FileCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import toast from 'react-hot-toast';

interface BackupFile {
  fileName: string;
  size: number;
  createdAt: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'company' | 'billing' | 'bank' | 'backup'>('company');
  const [isLoading, setIsLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backups, setBackups] = useState<BackupFile[]>([]);

  // Form states (flat key-value maps matching DB settings table)
  const [settings, setSettings] = useState<Record<string, string>>({
    company_name: '',
    company_gst: '',
    company_pan: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    invoice_prefix: '',
    invoice_counter: '',
    default_cgst_rate: '2.5',
    default_sgst_rate: '2.5',
    default_hsn_code: '4401',
    default_product: 'Biomass Briquettes',
    company_bank_name: '',
    company_bank_account: '',
    company_bank_ifsc: '',
    company_bank_branch: '',
  });

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/settings');
      setSettings((prev) => ({ ...prev, ...res.data }));
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load ERP settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBackups = async () => {
    try {
      const res = await api.get('/backup/list');
      setBackups(res.data);
    } catch (err) {
      console.error('Failed to load backups list:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchBackups();
  }, []);

  const handleSettingChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      await api.put('/settings', settings);
      toast.success('Configuration parameters updated!');
      fetchSettings();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to save settings.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setBackupLoading(true);
    const loadingToast = toast.loading('Compiling database & PDFs into ZIP archive...');
    try {
      await api.post('/backup/create');
      toast.dismiss(loadingToast);
      toast.success('System backup generated successfully!');
      fetchBackups();
    } catch (err: any) {
      console.error(err);
      toast.dismiss(loadingToast);
      toast.error('Failed to create backup.');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleDownloadBackup = async (fileName: string) => {
    try {
      const res = await api.get(`/backup/download/${fileName}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Backup file downloaded.');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to download backup archive.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading settings console...</p>
        </div>
      </div>
    );
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6 animate-in text-xs">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure ERP workspace parameters, billing rates, and perform database maintenance.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar Tabs */}
        <div className="w-full md:w-56 shrink-0 space-y-1">
          <button
            onClick={() => setActiveTab('company')}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-medium transition-all ${
              activeTab === 'company'
                ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <Building className="h-4 w-4" /> Company Profile
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-medium transition-all ${
              activeTab === 'billing'
                ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <Settings className="h-4 w-4" /> Billing Defaults
          </button>
          <button
            onClick={() => setActiveTab('bank')}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-medium transition-all ${
              activeTab === 'bank'
                ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <Landmark className="h-4 w-4" /> Banking Details
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-medium transition-all ${
              activeTab === 'backup'
                ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <Database className="h-4 w-4" /> System Backups
          </button>
        </div>

        {/* Content Panel */}
        <div className="flex-1">
          {activeTab !== 'backup' && (
            <form onSubmit={handleSubmit}>
              <Card className="shadow-sm border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold capitalize flex items-center gap-1.5">
                    {activeTab === 'company' && <Building className="h-4 w-4 text-primary" />}
                    {activeTab === 'billing' && <Settings className="h-4 w-4 text-primary" />}
                    {activeTab === 'bank' && <Landmark className="h-4 w-4 text-primary" />}
                    {activeTab} Settings Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-1">
                  
                  {activeTab === 'company' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5 col-span-2">
                        <Label htmlFor="company-name">Registered Company Name</Label>
                        <Input
                          id="company-name"
                          value={settings.company_name}
                          onChange={(e) => handleSettingChange('company_name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="company-gst">Company GSTIN</Label>
                        <Input
                          id="company-gst"
                          value={settings.company_gst}
                          onChange={(e) => handleSettingChange('company_gst', e.target.value.toUpperCase())}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="company-pan">Company PAN Card</Label>
                        <Input
                          id="company-pan"
                          value={settings.company_pan}
                          onChange={(e) => handleSettingChange('company_pan', e.target.value.toUpperCase())}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="company-phone">Contact Number</Label>
                        <Input
                          id="company-phone"
                          value={settings.company_phone}
                          onChange={(e) => handleSettingChange('company_phone', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="company-email">Support Email Address</Label>
                        <Input
                          id="company-email"
                          type="email"
                          value={settings.company_email}
                          onChange={(e) => handleSettingChange('company_email', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5 col-span-2">
                        <Label htmlFor="company-address">Registered Business Address</Label>
                        <Input
                          id="company-address"
                          value={settings.company_address}
                          onChange={(e) => handleSettingChange('company_address', e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'billing' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="prefix">Invoice Prefix</Label>
                        <Input
                          id="prefix"
                          value={settings.invoice_prefix}
                          onChange={(e) => handleSettingChange('invoice_prefix', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="counter">Current Invoice Counter Value</Label>
                        <Input
                          id="counter"
                          type="number"
                          value={settings.invoice_counter}
                          onChange={(e) => handleSettingChange('invoice_counter', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="cgst">CGST Default Rate (%)</Label>
                        <Input
                          id="cgst"
                          type="number"
                          step="0.1"
                          value={settings.default_cgst_rate}
                          onChange={(e) => handleSettingChange('default_cgst_rate', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="sgst">SGST Default Rate (%)</Label>
                        <Input
                          id="sgst"
                          type="number"
                          step="0.1"
                          value={settings.default_sgst_rate}
                          onChange={(e) => handleSettingChange('default_sgst_rate', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="hsn">Default Product HSN Code</Label>
                        <Input
                          id="hsn"
                          value={settings.default_hsn_code}
                          onChange={(e) => handleSettingChange('default_hsn_code', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="product">Default Product Name</Label>
                        <Input
                          id="product"
                          value={settings.default_product}
                          onChange={(e) => handleSettingChange('default_product', e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'bank' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5 col-span-2">
                        <Label htmlFor="bank-name">Financial Bank Name</Label>
                        <Input
                          id="bank-name"
                          value={settings.company_bank_name}
                          onChange={(e) => handleSettingChange('company_bank_name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="bank-account">Bank Account Number</Label>
                        <Input
                          id="bank-account"
                          value={settings.company_bank_account}
                          onChange={(e) => handleSettingChange('company_bank_account', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="bank-ifsc">IFSC Bank Code</Label>
                        <Input
                          id="bank-ifsc"
                          value={settings.company_bank_ifsc}
                          onChange={(e) => handleSettingChange('company_bank_ifsc', e.target.value.toUpperCase())}
                        />
                      </div>
                      <div className="space-y-1.5 col-span-2">
                        <Label htmlFor="bank-branch">Bank Branch Location</Label>
                        <Input
                          id="bank-branch"
                          value={settings.company_bank_branch}
                          onChange={(e) => handleSettingChange('company_bank_branch', e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-4 border-t">
                    <Button type="submit" disabled={saveLoading} className="flex items-center gap-1.5">
                      {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Configuration
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          )}

          {activeTab === 'backup' && (
            <Card className="shadow-sm border-border bg-card">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-primary" /> Database & Media Backups
                  </CardTitle>
                </div>
                <Button onClick={handleCreateBackup} disabled={backupLoading} className="flex items-center gap-1.5">
                  {backupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Generate Backup
                </Button>
              </CardHeader>
              <CardContent className="pt-2">
                <p className="text-muted-foreground mb-4 leading-normal">
                  Create a full system snapshot. Each backup compiles the SQLite database file (`dev.db`) and all generated invoice PDF files into a single zip file.
                </p>

                <div className="border rounded-xl overflow-hidden mt-4">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                        <th className="p-3">Creation Date</th>
                        <th className="p-3">File Name</th>
                        <th className="p-3">File Size</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {backups.length > 0 ? (
                        backups.map((backup, idx) => (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="p-3">{new Date(backup.createdAt).toLocaleString('en-IN')}</td>
                            <td className="p-3 font-mono font-medium text-foreground">{backup.fileName}</td>
                            <td className="p-3 text-muted-foreground">{formatSize(backup.size)}</td>
                            <td className="p-3 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary"
                                title="Download backup zip"
                                onClick={() => handleDownloadBackup(backup.fileName)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-muted-foreground">
                            No backup files found on disk.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
