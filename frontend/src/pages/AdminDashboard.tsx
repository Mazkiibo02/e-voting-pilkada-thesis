import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getStatistics, getStatisticsByTps, getTpsList, getVoters, resetAllData, type Voter } from '@/lib/storage';
import { toast } from 'sonner';
import { Shield, Users, Vote, LogOut, RotateCcw } from 'lucide-react';
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

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [voters, setVoters] = useState<Voter[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [tpsList, setTpsList] = useState<string[]>([]);
  const [selectedTps, setSelectedTps] = useState<string | null>(null);

  const loadData = (tps?: string) => {
    const voterList = getVoters();
    const filteredVoters = tps ? voterList.filter(v => v.tps === tps) : voterList;
    setVoters(filteredVoters);
    
    const statsData = tps ? getStatisticsByTps(tps) : getStatistics();
    setStats(statsData);
  };

  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin');
    if (!isAdmin) {
      navigate('/');
      return;
    }
    
    const tps = getTpsList();
    setTpsList(tps);
    loadData();
  }, [navigate]);

  const handleReset = () => {
    resetAllData();
    setSelectedTps(null);
    loadData();
    toast.success('Semua data telah direset');
  };

  const handleTpsChange = (tps: string | null) => {
    setSelectedTps(tps);
    loadData(tps ?? undefined);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    toast.info('Logout berhasil');
    navigate('/');
  };

  if (!stats) return null;

  const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold">Simulasi Sistem E-Voting</h1>
              <p className="text-sm opacity-90">Dashboard Administrator</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Keluar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* TPS Filter */}
        <div className="mb-6 p-4 bg-card border rounded-lg">
          <p className="text-sm font-medium mb-2">Filter Berdasarkan TPS:</p>
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pemilih</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedTps && stats.totalRegistered ? stats.totalRegistered : stats.totalVoters}</div>
              <p className="text-xs text-muted-foreground">Terdaftar dalam DPT</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suara Masuk</CardTitle>
              <Vote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVotes}</div>
              <p className="text-xs text-muted-foreground">
                {selectedTps && stats.participation ? `${stats.participation}%` : `${((stats.totalVotes / stats.totalVoters) * 100).toFixed(1)}%`} partisipasi
              </p>
            </CardContent>
          </Card>

        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Perolehan Suara per Calon</CardTitle>
              <CardDescription>Grafik batang real-time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.candidates}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="votes" fill="hsl(var(--primary))" name="Jumlah Suara" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribusi Suara</CardTitle>
              <CardDescription>Diagram lingkaran</CardDescription>
            </CardHeader>
            <CardContent>
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
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Voters Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Daftar Pemilih Terdaftar</CardTitle>
              <CardDescription>Semua pemilih yang terdaftar dalam DPT</CardDescription>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Semua Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tindakan ini akan menghapus semua suara dan mengembalikan sistem ke kondisi awal. 
                    Data yang telah direset tidak dapat dikembalikan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                      <TableHead>NIK</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Tanggal Lahir</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                  {voters.map((voter) => (
                    <TableRow key={voter.nik}>
                      <TableCell className="font-mono text-sm">{voter.nik}</TableCell>
                      <TableCell>{voter.name}</TableCell>
                      <TableCell>{voter.dob}</TableCell>
                      <TableCell>
                        {voter.hasVoted ? (
                          <Badge className="bg-success text-success-foreground">Sudah Memilih</Badge>
                        ) : (
                          <Badge variant="outline">Belum Memilih</Badge>
                        )}
                      </TableCell>
                      
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="text-center text-sm text-muted-foreground py-8">
        Simulasi Sistem E-Voting – 2025
      </footer>
    </div>
  );
};

export default AdminDashboard;
