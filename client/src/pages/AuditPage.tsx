import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  Shield, Calendar, User, Search, Eye, Filter, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import toast from 'react-hot-toast';

interface AuditLog {
  id: string;
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  entityId: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
  user: { name: string; email: string };
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Detail Dialog
  const [selectedDetails, setSelectedDetails] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entity = entityFilter;

      const res = await api.get('/audit', { params });
      setLogs(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load system audit logs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page, actionFilter, entityFilter]);

  const handleClearFilters = () => {
    setActionFilter('');
    setEntityFilter('');
    setPage(1);
  };

  const openDetailDialog = (details?: string) => {
    if (!details) {
      toast('No additional metadata stored for this action.');
      return;
    }
    setSelectedDetails(details);
    setIsDetailOpen(true);
  };

  const formatJSON = (jsonString: string) => {
    try {
      const obj = JSON.parse(jsonString);
      return JSON.stringify(obj, null, 2);
    } catch {
      return jsonString;
    }
  };

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Track administrator and staff activities, modifications, and transaction histories.
        </p>
      </div>

      {/* Filter Card */}
      <Card className="shadow-sm border-border bg-card">
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-3 items-end text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="action-filter">Filter by Action</Label>
              <select
                id="action-filter"
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">All Actions</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="entity-filter">Filter by Module</Label>
              <select
                id="entity-filter"
                value={entityFilter}
                onChange={(e) => {
                  setEntityFilter(e.target.value);
                  setPage(1);
                }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">All Modules</option>
                <option value="Invoice">Invoice</option>
                <option value="Payment">Payment</option>
                <option value="Client">Client</option>
                <option value="Driver">Driver</option>
                <option value="Vehicle">Vehicle</option>
                <option value="User">User</option>
              </select>
            </div>

            <div>
              <Button variant="outline" size="sm" onClick={handleClearFilters} className="w-full h-9">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading audit logs...</p>
          </div>
        </div>
      ) : (
        <Card className="shadow-sm border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Authorized User</th>
                  <th className="p-3">Action Type</th>
                  <th className="p-3">Modified Module</th>
                  <th className="p-3">Target Reference ID</th>
                  <th className="p-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30">
                      <td className="p-3">{new Date(log.createdAt).toLocaleString('en-IN')}</td>
                      <td className="p-3">
                        <span className="font-semibold block">{log.user?.name}</span>
                        <span className="text-[10px] text-muted-foreground block font-mono">{log.user?.email}</span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold ${
                            log.action === 'CREATE'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : log.action === 'UPDATE'
                              ? 'bg-amber-500/10 text-amber-600'
                              : 'bg-rose-500/10 text-rose-600'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-foreground">{log.entity}</td>
                      <td className="p-3 font-mono text-[10px] text-muted-foreground truncate max-w-[150px]" title={log.entityId}>
                        {log.entityId}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          title="View changes"
                          onClick={() => openDetailDialog(log.details)}
                          disabled={!log.details}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No system logs found for this filter.
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

      {/* JSON Detail Viewer Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Audit Action Metadata</DialogTitle>
            <DialogDescription>
              JSON parameters captured during request execution.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 bg-muted/60 border rounded-lg font-mono text-[10px] text-foreground overflow-x-auto whitespace-pre">
            {selectedDetails ? formatJSON(selectedDetails) : 'N/A'}
          </div>

          <DialogFooter>
            <Button onClick={() => setIsDetailOpen(false)}>
              Close Metadata
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
