import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Shield, ArrowLeft, RefreshCw, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface AuditLog {
  id: number;
  election_id: number | null;
  tps_id: number | null;
  actor_user_id: number | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  description: string | null;
  created_at: string;
  actor_name?: string | null;
  actor_display?: string | null;
}

const formatTimestamp = (dateStr: string) => {
  if (!dateStr) return '-';
  let utcStr = dateStr.trim();
  if (!utcStr.includes('T') && utcStr.includes(' ')) {
    utcStr = utcStr.replace(' ', 'T');
  }
  const hasTimezone = /Z|([+-]\d{2}:?\d{2})$/.test(utcStr);
  if (!hasTimezone) {
    utcStr += 'Z';
  }
  try {
    const date = new Date(utcStr);
    if (isNaN(date.getTime())) {
      return dateStr;
    }
    return date.toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZoneName: 'short'
    });
  } catch (e) {
    return dateStr;
  }
};

const AuditLogs = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error("Akses ditolak. Sesi tidak ditemukan.");
        navigate('/login');
        return;
      }

      // Fetch logs with the obtained token
      const logsRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/audit-logs`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (logsRes.status === 401 || logsRes.status === 403) {
        toast.error("Sesi Anda tidak valid atau telah berakhir.");
        localStorage.removeItem('token');
        localStorage.removeItem('isAdmin');
        navigate('/login');
        return;
      }

      if (!logsRes.ok) {
        throw new Error("Gagal mengambil data audit log.");
      }

      const logsData = await logsRes.json();
      setLogs(logsData.items);
    } catch (err: any) {
      console.error("Error fetching logs:", err);
      toast.error("Gagal memuat log aktivitas dari backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin');
    const token = localStorage.getItem('token');
    if (!isAdmin || !token) {
      navigate('/login');
      return;
    }
    fetchLogs();
  }, [navigate]);

  const filteredLogs = filterAction === 'ALL' 
    ? logs 
    : logs.filter(log => log.action === filterAction);

  // Extract unique actions for filters
  const uniqueActions = ['ALL', ...Array.from(new Set(logs.map(log => log.action)))];

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'AUTH_LOGIN': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'VOTE_CAST': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'VOTING_SESSION_CREATED': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'VOTING_SESSION_CANCELLED': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'TPS_STATUS_UPDATED': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'TPS_RECAP_GENERATED': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'CHASIL_GENERATED': return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'SIGNED_FORM_UPLOADED': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-amber-400" />
            <div>
              <h1 className="text-xl font-bold">Log Aktivitas & Audit Trail</h1>
              <p className="text-sm opacity-90">Sistem E-Voting Berbasis Blockchain (Model Sim)</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Daftar Log Audit</CardTitle>
              <CardDescription>
                Catatan aktivitas penting untuk akuntabilitas sistem e-voting.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Filter */}
              <div className="flex items-center gap-1.5 bg-background border rounded-lg px-2.5 py-1 text-sm">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground mr-1">Filter:</span>
                <select 
                  className="bg-transparent border-none outline-none font-medium text-slate-800 cursor-pointer"
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                >
                  {uniqueActions.map(action => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </div>
              
              <Button size="sm" variant="outline" onClick={fetchLogs} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Segarkan
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-20 text-muted-foreground">
                <RefreshCw className="h-8 w-8 animate-spin mr-3 text-primary" />
                Sedang memuat data audit log...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                Tidak ada log aktivitas yang ditemukan.
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Waktu</TableHead>
                      <TableHead className="w-[180px]">Aktor</TableHead>
                      <TableHead className="w-[100px]">Peran</TableHead>
                      <TableHead className="w-[200px]">Aksi</TableHead>
                      <TableHead className="w-[120px]">Entitas</TableHead>
                      <TableHead>Deskripsi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs text-slate-600 whitespace-nowrap">
                          {formatTimestamp(log.created_at)}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-slate-900">
                          {log.actor_role === 'VOTER'
                            ? 'Bilik Suara (Voter)'
                            : (log.actor_display || log.actor_name || log.actor_email || `ID: ${log.actor_user_id || 'System'}`)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs uppercase">
                            {log.actor_role || 'System'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${getActionBadgeColor(log.action)}`}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap text-slate-500">
                          {log.entity_type || '-'}{log.entity_id ? ` (ID: ${log.entity_id})` : ''}
                        </TableCell>
                        <TableCell className="text-sm text-slate-700">
                          {log.description}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <footer className="text-center text-sm text-muted-foreground py-8">
        Simulasi Sistem E-Voting – 2025
      </footer>
    </div>
  );
};

export default AuditLogs;
