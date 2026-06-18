'use client';

import { useState } from 'react';
import { FileBarChart, Download } from 'lucide-react';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';

const REPORT_TYPES = [
  { key: 'attendance-summary', label: 'Attendance Summary', description: 'Overall attendance rates by member and session' },
  { key: 'member-list', label: 'Member List', description: 'Full list of all registered members' },
  { key: 'inactive-members', label: 'Inactive Members', description: 'Members with no recent attendance' },
];

export default function ReportsPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleExport = async (type: string) => {
    setLoading(type);
    try {
      const res = await apiClient.get(`/reports/export/${type}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Export failed. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      <Topbar title="Reports" />
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-base font-semibold text-ink">Export Reports</h2>
          <p className="mt-1 text-sm text-ink-secondary">Download reports as Excel files</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REPORT_TYPES.map((report) => (
            <div key={report.key} className="rounded-lg border border-border bg-surface p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary-accent">
                <FileBarChart className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-medium text-ink">{report.label}</h3>
              <p className="mt-1 text-sm text-ink-secondary">{report.description}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-4"
                loading={loading === report.key}
                onClick={() => handleExport(report.key)}
              >
                <Download className="h-4 w-4" /> Export Excel
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
