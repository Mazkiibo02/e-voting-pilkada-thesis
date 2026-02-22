import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Shield,
  Link2,
  Users,
  Vote,
  BarChart3,
  Clock,
  LogIn,
  Lock,
  Eye,
  RefreshCw,
  User,
} from "lucide-react";
import {
  getCandidates,
  getVoters,
  getTpsList,
  getStatisticsByTps,
  initializeMockData,
} from "@/lib/storage";

const CHART_COLORS = [
  "hsl(215, 70%, 50%)",
  "hsl(150, 55%, 45%)",
  "hsl(35, 80%, 55%)",
  "hsl(350, 60%, 52%)",
  "hsl(270, 50%, 55%)",
];

const ELECTION_STATUS = "active" as "active" | "finished";

const Homepage = () => {
  const [selectedTps, setSelectedTps] = useState<string>("all");
  const [tpsList, setTpsList] = useState<string[]>([]);
  const [stats, setStats] = useState<ReturnType<typeof getStatisticsByTps> | null>(null);
  const [candidates, setCandidates] = useState<ReturnType<typeof getCandidates>>([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const refreshData = useCallback(() => {
    initializeMockData();
    setTpsList(getTpsList());
    const tpsFilter = selectedTps === "all" ? undefined : selectedTps;
    setStats(getStatisticsByTps(tpsFilter));
    setCandidates(getCandidates());
    setLastUpdated(new Date());
  }, [selectedTps]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (ELECTION_STATUS !== "active") return;
    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, [refreshData]);

  if (!stats) return null;

  const isFinished = ELECTION_STATUS === "finished";

  const barData = stats.candidates.map((c, i) => ({
    name: c.name.split(",")[0].split(" ").slice(-1)[0],
    fullName: c.name,
    votes: c.votes,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const pieData = stats.candidates.map((c, i) => ({
    name: c.name.split(",")[0].split(" ").slice(-1)[0],
    fullName: c.name,
    value: c.votes,
    percentage: c.percentage,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Navigation Bar */}
      <nav className="bg-primary text-primary-foreground shadow-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="h-6 w-6" />
            <span className="font-bold text-sm md:text-base tracking-tight">
              e-Voting Desa Krandon
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-xs opacity-70 hover:opacity-100 hidden sm:inline-flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Admin
            </Link>
            <Button asChild size="sm" variant="secondary" className="h-8 text-xs font-semibold">
              <Link to="/login">
                <LogIn className="h-3.5 w-3.5 mr-1.5" />
                Masuk
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Hero Section */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-primary/5 via-background to-primary/10 overflow-hidden">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-xs font-medium text-primary uppercase tracking-widest mb-1">
                  Pemilihan Kepala Desa
                </p>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  Desa Krandon
                </h1>
                <p className="text-muted-foreground mt-1">Periode 2025 – 2031</p>
              </div>
              <div className="flex items-center gap-3">
                {isFinished ? (
                  <Badge className="bg-green-600 hover:bg-green-600 text-white text-sm px-4 py-1.5">
                    ✅ Hasil Final
                  </Badge>
                ) : (
                  <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-sm px-4 py-1.5 animate-pulse">
                    🔴 Pemilihan Berlangsung
                  </Badge>
                )}
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={<Vote className="h-5 w-5" />} label="Suara Masuk" value={stats.totalVotes} />
              <StatCard icon={<Users className="h-5 w-5" />} label="Pemilih Terdaftar" value={stats.totalRegistered} />
              <StatCard icon={<BarChart3 className="h-5 w-5" />} label="Partisipasi" value={`${stats.participation}%`} />
              <StatCard
                icon={<Clock className="h-5 w-5" />}
                label="Terakhir Diperbarui"
                value={lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
              />
            </div>
          </CardContent>
        </Card>

        {/* TPS Filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Filter TPS:</span>
          <Select value={selectedTps} onValueChange={setSelectedTps}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="Semua TPS" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="all">Semua TPS</SelectItem>
              {tpsList.map((tps) => (
                <SelectItem key={tps} value={tps}>
                  {tps}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Perolehan Suara</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg px-3 py-2 shadow-lg text-sm">
                            <p className="font-medium">{d.fullName}</p>
                            <p className="text-muted-foreground">{d.votes} suara</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="votes" radius={[6, 6, 0, 0]} label={{ position: "top", fontSize: 12, fill: "hsl(var(--foreground))" }}>
                      {barData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Distribusi Suara</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ percentage }) => `${percentage}%`}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg px-3 py-2 shadow-lg text-sm">
                            <p className="font-medium">{d.fullName}</p>
                            <p className="text-muted-foreground">{d.value} suara ({d.percentage}%)</p>
                          </div>
                        );
                      }}
                    />
                    <Legend formatter={(value) => <span className="text-sm text-foreground">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Candidate Cards */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Profil Kandidat
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {candidates.map((c, i) => {
              const stat = stats.candidates.find((s) => s.id === c.id);
              return (
                <Card key={c.id} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4 mb-3">
                      <div
                        className="h-14 w-14 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      >
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm leading-tight truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Kandidat No. {i + 1}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">
                      {c.description}
                    </p>
                    <div className="flex items-center justify-between border-t pt-3">
                      <div>
                        <p className="text-2xl font-bold text-foreground">{stat?.votes ?? 0}</p>
                        <p className="text-xs text-muted-foreground">suara</p>
                      </div>
                      <Badge variant="secondary" className="text-sm font-semibold">
                        {stat?.percentage ?? 0}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Summary Table */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Rekapitulasi Suara</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">No.</TableHead>
                  <TableHead>Nama Kandidat</TableHead>
                  <TableHead className="text-right">Jumlah Suara</TableHead>
                  <TableHead className="text-right">Persentase</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.candidates.map((c, i) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{i + 1}</TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell className="text-right font-semibold">{c.votes}</TableCell>
                    <TableCell className="text-right">{c.percentage}%</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell className="text-right">{stats.totalVotes}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Transparency Section */}
        <Card className="shadow-sm border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Eye className="h-6 w-6 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">Transparansi & Keamanan Data</h3>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li>🔗 Seluruh suara tercatat pada blockchain dan tidak dapat diubah.</li>
                  <li>🛡️ Data bersifat <em>immutable</em> — setiap perubahan akan terdeteksi.</li>
                  <li>📡 Hasil diambil langsung dari blockchain melalui backend secara real-time.</li>
                  <li>🔄 Pembaruan otomatis setiap 10 detik selama pemilihan berlangsung.</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground py-4 border-t">
          Prototype e-Voting Blockchain — Desa Krandon 2025
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) => (
  <div className="bg-background rounded-lg p-4 border shadow-sm">
    <div className="flex items-center gap-2 text-muted-foreground mb-1">
      {icon}
      <span className="text-xs">{label}</span>
    </div>
    <p className="text-xl font-bold text-foreground">{value}</p>
  </div>
);

export default Homepage;
