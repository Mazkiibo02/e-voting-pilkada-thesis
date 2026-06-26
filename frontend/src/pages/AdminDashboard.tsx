import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import { toast } from 'sonner';
import { Shield, Users, Vote, LogOut, RotateCcw, Plus } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState<any>(null);
  const [tpsList, setTpsList] = useState<string[]>([]);
  const [selectedTps, setSelectedTps] = useState<string | null>(null);
  const [selectedBoothToUnlock, setSelectedBoothToUnlock] = useState<string>("BOOTH-01");
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);

  const handleUnlockBooth = async () => {
    try {
      setIsGeneratingToken(true);
      const tokenAuth = localStorage.getItem('token');
      
      const tpsRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tps`, {
        headers: { 'Authorization': `Bearer ${tokenAuth}` }
      });
      const tpsData = await tpsRes.json();
      const firstTps = tpsData.items?.[0];
      
      if (!firstTps) {
        toast.error("Tidak ada TPS aktif di sistem.");
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/voting-sessions/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenAuth}`
        },
        body: JSON.stringify({
          electionId: firstTps.election_id,
          tpsId: firstTps.id,
          boothId: selectedBoothToUnlock
        })
      });

      if (response.ok) {
        toast.success(`Bilik Suara ${selectedBoothToUnlock} berhasil diaktifkan.`);
      } else {
        const err = await response.json();
        toast.error(err.message || 'Gagal mengaktifkan bilik suara');
      }
    } catch (e) {
      toast.error('Koneksi server gagal');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const fetchDashboardData = async (tps?: string) => {
    try {
      const url = tps 
        ? `${import.meta.env.VITE_API_BASE_URL}/stats?tps=${tps}`
        : `${import.meta.env.VITE_API_BASE_URL}/stats`;
      const res = await fetch(url);
      const resData = await res.json();
      if (resData.success && resData.data) {
        setStats(resData.data);
        if (!tps) {
          setTpsList(resData.data.tpsList || []);
        }
      }
    } catch (e) {
      console.error("Failed to load stats", e);
      toast.error('Gagal memuat data statistik');
    }
  };

  const loadData = (tps?: string) => {
    fetchDashboardData(tps);
  };

  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin');
    if (!isAdmin) {
      navigate('/');
      return;
    }
    
    fetchDashboardData();
  }, [navigate]);


  const handleTpsChange = (tps: string | null) => {
    setSelectedTps(tps);
    loadData(tps ?? undefined);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('token');
    toast.info('Logout berhasil');
    navigate('/');
  };

  if (!stats) return null;

  const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'];

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-white" />
            <div>
              <h1 className="text-xl font-bold">Simulasi Sistem E-Voting</h1>
              <p className="text-sm opacity-90">Dashboard Administrator</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={handleLogout} className="font-semibold">
            <LogOut className="h-4 w-4 mr-2" />
            Keluar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* TPS Filter */}
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Filter Berdasarkan TPS:</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedTps === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleTpsChange(null)}
                >
                  Semua TPS
                </Button>
                {tpsList.map((tps) => (
                  <Button
                    key={tps}
                    variant={selectedTps === tps ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTpsChange(tps)}
                  >
                    {tps}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => navigate('/admin/tambah-paslon')} className="font-semibold text-green-600 border-green-200 hover:bg-green-50">
                <Plus className="mr-2 h-4 w-4" />
                Tambah Paslon
              </Button>
              <Button size="sm" variant="secondary" onClick={() => navigate('/admin/audit-logs')} className="font-semibold">
                <Shield className="mr-2 h-4 w-4 text-amber-500" />
                Log Aktivitas
              </Button>
              <Button size="sm" onClick={() => navigate('/admin/chasil-preview')} className="font-semibold">
                <Shield className="mr-2 h-4 w-4" />
                Preview C.Hasil
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="font-semibold border-gray-300">
                    <Vote className="mr-2 h-4 w-4 text-blue-600" />
                    Buka Booth Voting
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border-gray-200">
                  <DropdownMenuItem onClick={() => window.open('/booth/BOOTH-01', '_blank')} className="cursor-pointer">
                    Bilik 1 (BOOTH-01)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.open('/booth/BOOTH-02', '_blank')} className="cursor-pointer">
                    Bilik 2 (BOOTH-02)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.open('/booth/BOOTH-03', '_blank')} className="cursor-pointer">
                    Bilik 3 (BOOTH-03)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {selectedTps && (
            <Card className="md:col-span-3 bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-blue-900">
                  Menampilkan data untuk: <span className="font-bold">{selectedTps}</span>
                </p>
              </CardContent>
            </Card>
          )}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-slate-500">Total Pemilih</CardTitle>
              <Users className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">100</div>
              <p className="text-xs text-slate-500">Terdaftar dalam DPT</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-slate-500">Suara Masuk</CardTitle>
              <Vote className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stats.totalVotes}</div>
              <p className="text-xs text-slate-500">
                {Math.min(Math.round((stats.totalVotes / 100) * 100), 100)}% partisipasi
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Perolehan Suara per Calon</CardTitle>
              <CardDescription className="text-slate-500">Grafik batang real-time</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.candidates.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-slate-500 font-medium border border-dashed border-slate-200 rounded-md bg-slate-50">
                  Belum ada paslon
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.candidates}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" interval={0} tick={{ fontSize: 12 }} />
                    <YAxis stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0' }} />
                    <Legend />
                    <Bar dataKey="votes" fill="hsl(var(--primary))" name="Jumlah Suara" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Distribusi Suara</CardTitle>
              <CardDescription className="text-slate-500">Diagram lingkaran</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.candidates.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-slate-500 font-medium border border-dashed border-slate-200 rounded-md bg-slate-50">
                  Belum ada paslon
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.candidates}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, votes }) => `${name}: ${votes}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="votes"
                    >
                      {stats.candidates.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Booth Unlock Panel */}
        <Card className="bg-white border-gray-200 shadow-sm mt-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-slate-900">Control Panel Bilik Suara</CardTitle>
              <CardDescription className="text-slate-500">Aktifkan bilik suara (Kiosk Mode) untuk pemilih yang telah diverifikasi</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-10 space-y-6">
            <div className="text-center space-y-2">
              <p className="text-slate-600 max-w-lg mx-auto">
                Setelah memverifikasi identitas pemilih secara fisik, pilih bilik suara dan klik tombol di bawah untuk membukanya bagi pemilih.
              </p>
            </div>
            
            <div className="w-full max-w-sm space-y-4">
              <Select value={selectedBoothToUnlock} onValueChange={setSelectedBoothToUnlock}>
                <SelectTrigger className="w-full text-lg h-12">
                  <SelectValue placeholder="Pilih Bilik Suara" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BOOTH-01">Bilik Suara 1 (BOOTH-01)</SelectItem>
                  <SelectItem value="BOOTH-02">Bilik Suara 2 (BOOTH-02)</SelectItem>
                  <SelectItem value="BOOTH-03">Bilik Suara 3 (BOOTH-03)</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                size="lg" 
                onClick={handleUnlockBooth} 
                disabled={isGeneratingToken}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 text-lg shadow-xl"
              >
                {isGeneratingToken ? "Memproses..." : "Buka Bilik Suara"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="text-center text-sm text-slate-500 py-8">
        Simulasi Sistem E-Voting – 2025
      </footer>
    </div>
  );
};

export default AdminDashboard;
