import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import {
  Shield,
  Users,
  Vote,
  BarChart3,
  Clock,
  LogIn,
  Lock,
  Eye,
  RefreshCw,
  Copy,
  Check,
  MapPin,
  ExternalLink,
} from "lucide-react";

type Candidate = {
  id: number;
  ballotNumber: number;
  candidateName: string | null;
  viceCandidateName: string | null;
  voteCount: number;
};

type TpsMetadata = {
  id: number;
  tpsNumber: string | null;
  tpsCode: string | null;
  province: string | null;
  cityRegency: string | null;
  district: string | null;
  village: string | null;
  address: string | null;
  status: string;
  documentHash: string | null;
  txHash: string | null;
};

const CHART_COLORS = [
  "hsl(221.2 83.2% 53.3%)", // Modern Blue
  "hsl(142.1 76.2% 36.3%)", // Emerald Green
  "hsl(24.6 95% 53.1%)",    // Warm Orange
  "hsl(346.8 77.2% 49.8%)", // Rose Red
  "hsl(262.1 83.3% 57.8%)", // Violet Purple
];

const Homepage = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [tpsList, setTpsList] = useState<TpsMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:5000/public/results");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const resData = await response.json();
      if (resData.success && resData.data) {
        setCandidates(resData.data.candidates || []);
        setTpsList(resData.data.tpsList || []);
        setError(null);
      } else {
        throw new Error(resData.message || "Failed to load data");
      }
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data publik");
      console.error("Error fetching public results:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults();
    const interval = setInterval(fetchResults, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [fetchResults]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const getCandidateFullName = (c: Candidate) => {
    return c.viceCandidateName
      ? `${c.candidateName} & ${c.viceCandidateName}`
      : `${c.candidateName}`;
  };

  const totalVotes = candidates.reduce((sum, c) => sum + c.voteCount, 0);
  
  const candidatesWithPercentage = candidates.map((c) => {
    const percentage = totalVotes > 0 ? (c.voteCount / totalVotes) * 100 : 0;
    return {
      ...c,
      percentage: Number(percentage.toFixed(1)),
    };
  });

  const pieData = candidatesWithPercentage.map((c, i) => ({
    name: `No. ${c.ballotNumber}`,
    fullName: getCandidateFullName(c),
    value: c.voteCount,
    percentage: c.percentage,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const truncateHash = (hash: string | null) => {
    if (!hash) return "-";
    return hash.length > 16
      ? `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`
      : hash;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "BLOCKCHAIN_ANCHORED":
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-medium flex items-center gap-1 w-fit shadow-sm border-none">
            <Shield className="h-3 w-3" />
            Terverifikasi Blockchain
          </Badge>
        );
      case "FINALIZED":
        return (
          <Badge className="bg-violet-600 hover:bg-violet-600 text-white font-medium flex items-center gap-1 w-fit shadow-sm border-none">
            Selesai / Finalized
          </Badge>
        );
      case "WITNESS_VERIFICATION":
        return (
          <Badge className="bg-purple-600 hover:bg-purple-600 text-white font-medium flex items-center gap-1 w-fit shadow-sm border-none">
            Verifikasi Saksi
          </Badge>
        );
      case "DOCUMENT_UPLOADED":
        return (
          <Badge className="bg-indigo-600 hover:bg-indigo-600 text-white font-medium flex items-center gap-1 w-fit shadow-sm border-none">
            Form C.Hasil Diunggah
          </Badge>
        );
      case "RECAP_GENERATED":
        return (
          <Badge className="bg-teal-600 hover:bg-teal-600 text-white font-medium flex items-center gap-1 w-fit shadow-sm border-none">
            Rekapitulasi Selesai
          </Badge>
        );
      case "CLOSED":
        return (
          <Badge className="bg-amber-600 hover:bg-amber-600 text-white font-medium flex items-center gap-1 w-fit shadow-sm border-none">
            TPS Ditutup
          </Badge>
        );
      case "OPEN":
        return (
          <Badge className="bg-blue-600 hover:bg-blue-600 text-white font-medium flex items-center gap-1 w-fit shadow-sm animate-pulse border-none">
            Pemilihan Berlangsung
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500 hover:bg-gray-500 text-white font-medium flex items-center gap-1 w-fit shadow-sm border-none">
            {status}
          </Badge>
        );
    }
  };

  if (loading && candidates.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Card className="w-full max-w-md bg-slate-900 border-slate-800 text-slate-100">
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-10 w-10 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-muted-foreground font-medium">Memuat Pusat Transparansi Hasil Pemilu...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Premium Header/Navigation */}
      <nav className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-lg text-white shadow-md shadow-blue-900/20">
              <Shield className="h-6 w-6" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-50 to-slate-200 bg-clip-text text-transparent">
              KRANDON E-VOTE
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors hidden sm:inline-flex items-center gap-1.5">
              <Lock className="h-4 w-4" />
              Petugas / Saksi
            </Link>
            <Button asChild size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-900/30">
              <Link to="/login">
                <LogIn className="h-4 w-4 mr-2" />
                Masuk
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Error Callout */}
        {error && (
          <div className="p-4 bg-red-950/40 border border-red-800/80 text-red-200 rounded-xl flex items-center gap-3 shadow-lg">
            <RefreshCw className="h-5 w-5 text-red-400 shrink-0" />
            <p className="text-sm font-medium">Koneksi data tertunda: {error}</p>
          </div>
        )}

        {/* Hero Transparency Section */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-6 md:p-8 shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.15),rgba(255,255,255,0))]" />
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <Badge className="bg-blue-500/10 hover:bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs px-3 py-1 font-semibold uppercase tracking-wider rounded-full">
                TRANSPARENCY PORTAL
              </Badge>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Pusat Transparansi Hasil Pemilihan
              </h1>
              <p className="text-slate-400 text-base max-w-2xl">
                Visualisasi data perolehan suara Pilkada secara real-time dan terverifikasi secara lokal menggunakan SQLite dan diamankan di jaringan blockchain.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 shrink-0 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Clock className="h-4 w-4 text-blue-500" />
                <span>Terakhir diperbarui:</span>
              </div>
              <span className="font-semibold text-slate-200">
                {lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-800/80">
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Suara Masuk</p>
              <p className="text-2xl md:text-3xl font-extrabold text-white mt-1 flex items-baseline gap-1">
                {totalVotes.toLocaleString("id-ID")}
                <span className="text-xs font-normal text-slate-500">suara</span>
              </p>
            </div>
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Jumlah Kandidat</p>
              <p className="text-2xl md:text-3xl font-extrabold text-white mt-1">
                {candidates.length}
              </p>
            </div>
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">TPS Terdaftar</p>
              <p className="text-2xl md:text-3xl font-extrabold text-white mt-1">
                {tpsList.length}
              </p>
            </div>
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">TPS Terverifikasi</p>
              <p className="text-2xl md:text-3xl font-extrabold text-emerald-400 mt-1 flex items-baseline gap-1">
                {tpsList.filter(t => t.status === "BLOCKCHAIN_ANCHORED").length}
                <span className="text-xs font-normal text-slate-500">/ {tpsList.length}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Charts & Candidates Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Donut Chart Visualization */}
          <Card className="lg:col-span-7 bg-slate-900 border-slate-800 shadow-lg relative overflow-hidden">
            <CardHeader className="border-b border-slate-800 pb-4">
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                Distribusi Persentase Suara
              </CardTitle>
              <CardDescription className="text-slate-400">
                Proporsi total suara sah yang teragregasi dari seluruh rekapitulasi TPS.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {totalVotes === 0 ? (
                <div className="h-[280px] flex flex-col items-center justify-center text-slate-500">
                  <Vote className="h-12 w-12 text-slate-700 mb-3 animate-pulse" />
                  <p className="text-sm font-medium">Belum ada suara masuk dari TPS yang sah.</p>
                </div>
              ) : (
                <div className="h-[280px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={105}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.fill} className="stroke-slate-900 focus:outline-none" strokeWidth={3} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 shadow-2xl text-xs space-y-1">
                              <p className="font-bold text-slate-100">{d.fullName}</p>
                              <p className="text-slate-400 font-medium">{d.name}</p>
                              <div className="flex items-center gap-4 text-blue-400 pt-1">
                                <span className="font-bold text-sm">{d.value.toLocaleString("id-ID")} suara</span>
                                <span className="font-bold text-sm bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{d.percentage}%</span>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Legend 
                        iconType="circle"
                        iconSize={8}
                        formatter={(value, entry: any) => {
                          const { payload } = entry;
                          return (
                            <span className="text-xs font-semibold text-slate-300 ml-1">
                              {payload.name} ({payload.percentage}%)
                            </span>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Candidate Profile / Detailed Votes list */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <h3 className="text-base font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Perolehan Suara Kandidat
            </h3>
            {candidatesWithPercentage.length === 0 ? (
              <Card className="bg-slate-900 border-slate-800 flex-1 flex items-center justify-center p-6 text-slate-500">
                <p className="text-sm">Tidak ada kandidat terdaftar.</p>
              </Card>
            ) : (
              candidatesWithPercentage.map((c, i) => (
                <Card key={c.id} className="bg-slate-900 border-slate-800 hover:border-slate-700/80 transition-all shadow-md group relative overflow-hidden">
                  <div 
                    className="absolute top-0 bottom-0 left-0 w-1 group-hover:w-1.5 transition-all" 
                    style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <CardContent className="p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div 
                        className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0 shadow-inner"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      >
                        {c.ballotNumber}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-white text-sm sm:text-base leading-tight truncate">
                          {getCandidateFullName(c)}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 font-medium">Nomor Urut {c.ballotNumber}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-black tracking-tight text-white">
                        {c.voteCount.toLocaleString("id-ID")}
                      </p>
                      <Badge className="bg-slate-800 hover:bg-slate-800 text-slate-200 border-none font-bold text-xs mt-1">
                        {c.percentage}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Active TPS Workflow & Verification Table */}
        <Card className="bg-slate-900 border-slate-800 shadow-lg">
          <CardHeader className="border-b border-slate-800/80 pb-4">
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-400" />
              Verifikasi Integritas TPS
            </CardTitle>
            <CardDescription className="text-slate-400">
              Berikut adalah daftar TPS aktif dan status alur verifikasinya. Jika status TPS adalah <strong>BLOCKCHAIN_ANCHORED</strong>, data perolehan suara TPS telah terkunci secara kriptografis pada smart contract.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {tpsList.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                Belum ada data wilayah TPS terdaftar.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-950/40 border-b border-slate-800/80">
                    <TableRow className="border-slate-800/80 hover:bg-transparent">
                      <TableHead className="w-16 font-bold text-slate-300">No.</TableHead>
                      <TableHead className="font-bold text-slate-300">Wilayah TPS</TableHead>
                      <TableHead className="font-bold text-slate-300">Kode TPS</TableHead>
                      <TableHead className="font-bold text-slate-300">Status Alur Kerja</TableHead>
                      <TableHead className="font-bold text-slate-300">SHA-256 Document Hash</TableHead>
                      <TableHead className="font-bold text-slate-300">Blockchain Transaction Hash</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tpsList.map((t, index) => (
                      <TableRow key={t.id} className="border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <TableCell className="font-medium text-slate-400">{index + 1}</TableCell>
                        <TableCell className="min-w-[200px]">
                          <div className="font-bold text-slate-200">TPS {t.tpsNumber}</div>
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
                            <span>{t.village}, {t.district}, {t.cityRegency}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-300 font-semibold">{t.tpsCode}</TableCell>
                        <TableCell className="min-w-[150px]">
                          {getStatusBadge(t.status)}
                        </TableCell>
                        <TableCell className="min-w-[200px]">
                          {t.documentHash ? (
                            <div className="flex items-center gap-1.5 font-mono text-xs text-slate-300">
                              <span>{truncateHash(t.documentHash)}</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 hover:bg-slate-800 text-slate-500 hover:text-slate-200"
                                onClick={() => handleCopy(t.documentHash!)}
                              >
                                {copiedText === t.documentHash ? (
                                  <Check className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </TableCell>
                        <TableCell className="min-w-[200px]">
                          {t.txHash ? (
                            <div className="flex items-center gap-1.5 font-mono text-xs text-slate-300">
                              <span className="text-blue-400 font-semibold">{truncateHash(t.txHash)}</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 hover:bg-slate-800 text-slate-500 hover:text-slate-200"
                                onClick={() => handleCopy(t.txHash!)}
                              >
                                {copiedText === t.txHash ? (
                                  <Check className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transparency Framework / Academic Prototype Note */}
        <Card className="bg-slate-900 border-slate-800/80 overflow-hidden shadow-lg">
          <div className="p-6 md:p-8 bg-gradient-to-r from-blue-950/20 to-indigo-950/20 border-b border-slate-800/60">
            <div className="flex items-start gap-4">
              <Shield className="h-8 w-8 text-blue-400 shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">Prinsip Keamanan & Imutabilitas Data</h3>
                <p className="text-sm text-slate-400 leading-relaxed max-w-4xl">
                  Sistem e-voting ini menggunakan model auditabilitas terdistribusi. Setiap TPS yang menyelesaikan pemilihan memverifikasi dan menandatangani formulir digital C.Hasil. Nilai hash SHA-256 formulir tersebut beserta riwayat catatan log audit TPS diunggah dan di-anchor ke jaringan blockchain lokal menggunakan smart contract. Hal ini memastikan bahwa data perolehan suara tidak dapat diubah setelah disahkan secara sah di tingkat TPS.
                </p>
              </div>
            </div>
          </div>
          <CardContent className="p-6 bg-slate-900 text-xs text-slate-500 space-y-2">
            <p className="font-semibold text-slate-400">DISCLAIMER PROTOTIPE AKADEMIK:</p>
            <p>
              Dokumen dan simulasi sistem e-voting ini merupakan bagian dari prototipe akademik tugas akhir / skripsi dan bukan merupakan sistem resmi Komisi Pemilihan Umum (KPU). Seluruh data wilayah dan pemilih yang digunakan adalah data simulasi (synthetic data).
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 py-6 border-t border-slate-800/60">
          <div>© 2026 Krandon Vote Simulator. Hak Cipta Dilindungi.</div>
          <div className="flex items-center gap-1.5">
            <span>Powered by Hardhat & node:sqlite</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Homepage;
