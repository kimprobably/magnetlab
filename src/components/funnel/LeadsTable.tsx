'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, RefreshCw, Filter, Check, X } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface Lead {
  id: string;
  email: string;
  name: string | null;
  qualified: boolean | null;
  qualification_answers: Record<string, boolean> | null;
  created_at: string;
  funnel_pages: {
    id: string;
    slug: string;
    optin_headline: string;
    lead_magnets: {
      id: string;
      title: string;
    }[];
  }[];
}

interface LeadsTableProps {
  funnelPageId?: string;
  initialLeads?: Lead[];
}

export function LeadsTable({ funnelPageId, initialLeads }: LeadsTableProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads || []);
  const [loading, setLoading] = useState(!initialLeads);
  const [exporting, setExporting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'qualified' | 'not_qualified'>(
    'all'
  );
  const [total, setTotal] = useState(0);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (funnelPageId) params.set('funnelPageId', funnelPageId);
      if (filter === 'qualified') params.set('qualified', 'true');
      if (filter === 'not_qualified') params.set('qualified', 'false');

      const response = await fetch(`/api/leads?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLeads(data.data);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  }, [funnelPageId, filter]);

  useEffect(() => {
    if (!initialLeads) {
      fetchLeads();
    }
  }, [fetchLeads, initialLeads]);

  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ format });
      if (funnelPageId) params.set('funnelPageId', funnelPageId);

      const response = await fetch(`/api/leads/export?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leads-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leads-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={filter}
              onChange={(e) =>
                setFilter(e.target.value as 'all' | 'qualified' | 'not_qualified')
              }
              className="px-3 py-1.5 bg-background border border-border rounded-lg
                         text-sm text-foreground outline-none cursor-pointer
                         focus:ring-2 focus:ring-violet-500"
            >
              <option value="all">All Leads</option>
              <option value="qualified">Qualified</option>
              <option value="not_qualified">Not Qualified</option>
            </select>
          </div>
          <button
            onClick={fetchLeads}
            disabled={loading}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{total} leads</span>
          <div className="relative">
            <button
              disabled={exporting || leads.length === 0}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100
                         font-medium rounded-lg transition-colors disabled:opacity-50
                         flex items-center gap-2 group"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <div
              className="absolute right-0 top-full mt-1 w-32 bg-zinc-900 rounded-lg
                            border border-zinc-800 shadow-lg opacity-0 invisible
                            group-hover:opacity-100 group-hover:visible transition-all z-10"
            >
              <button
                onClick={() => handleExport('csv')}
                className="w-full px-4 py-2 text-sm text-left hover:bg-zinc-800
                           rounded-t-lg transition-colors"
              >
                Export CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full px-4 py-2 text-sm text-left hover:bg-zinc-800
                           rounded-b-lg transition-colors"
              >
                Export JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Lead Magnet
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Qualified
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Captured
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Loading leads...
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No leads captured yet
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-border last:border-0 hover:bg-zinc-900/50"
                >
                  <td className="px-4 py-3 text-sm text-foreground">
                    {lead.email}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {lead.name || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {lead.funnel_pages?.[0]?.lead_magnets?.[0]?.title || '-'}
                  </td>
                  <td className="px-4 py-3">
                    {lead.qualified === null ? (
                      <span className="text-xs text-muted-foreground">N/A</span>
                    ) : lead.qualified ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">
                        <Check className="w-3 h-3" />
                        Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-500/20 text-zinc-400 text-xs">
                        <X className="w-3 h-3" />
                        No
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDateTime(lead.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
