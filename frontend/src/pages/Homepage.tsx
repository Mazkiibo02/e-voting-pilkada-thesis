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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Eye,
  RefreshCw,
  Copy,
  Check,
  MapPin,
} from "lucide-react";

type Candidate = {
  id: number;
  ballotNumber: number;
  candidateName: string | null;
  viceCandidateName: string | null;
  motto: string | null;
  vision: string | null;
  mission: string | null;
  education: string | null;
  careerPath: string | null;
  voteCount: number;
  photoUrl?: string | null;
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
  registeredVotersTotal: number;
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
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/public/results`);
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

  const formatList = (text: string | null) => {
    if (!text) return <p className="text-sm text-slate-500">-</p>;
    let items: string[] = [];
    try {
      items = JSON.parse(text);
      if (!Array.isArray(items)) items = text.split('\n');
    } catch {
      items = text.split('\n');
    }
    return (
      <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
        {items.map((item, idx) => (
          item.trim() ? <li key={idx}>{item.trim()}</li> : null
        ))}
      </ul>
    );
  };

  const totalVotes = candidates.reduce((sum, c) => sum + c.voteCount, 0);
  const totalDPT = tpsList.reduce((sum, t) => sum + (t.registeredVotersTotal || 0), 0);
  
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-slate-900">
        <Card className="w-full max-w-md bg-white border-gray-200 text-slate-900 shadow-lg">
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-10 w-10 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-slate-600 font-medium">Memuat Pusat Transparansi Hasil Pemilu...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Premium Header/Navigation */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-lg text-white shadow-md shadow-blue-100">
              <Shield className="h-6 w-6" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-800 bg-clip-text text-transparent">
              E-VOTING PILKADA KOTA TEGAL
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button asChild size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-100">
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
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center gap-3 shadow-md">
            <RefreshCw className="h-5 w-5 text-red-600 shrink-0" />
            <p className="text-sm font-medium">Koneksi data tertunda: {error}</p>
          </div>
        )}

        {/* Hero Transparency Section */}
        <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gradient-to-b from-white to-gray-50 p-6 md:p-8 shadow-md">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.08),rgba(255,255,255,0))]" />
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <Badge className="bg-blue-50 hover:bg-blue-50 text-blue-600 border border-blue-200 text-xs px-3 py-1 font-semibold uppercase tracking-wider rounded-full">
                TRANSPARENCY PORTAL
              </Badge>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                Pusat Transparansi Hasil Pemilihan
              </h1>
              <p className="text-slate-600 text-base max-w-2xl">
                Visualisasi data perolehan suara Pilkada secara real-time dan terverifikasi secara lokal menggunakan SQLite dan diamankan di jaringan blockchain.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 shrink-0 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>Terakhir diperbarui:</span>
              </div>
              <span className="font-semibold text-slate-800">
                {lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8 pt-8 border-t border-gray-200">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/60">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Suara Masuk</p>
              <p className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1 flex items-baseline gap-1">
                {totalVotes.toLocaleString("id-ID")}
                <span className="text-xs font-normal text-slate-500">suara</span>
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/60">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Pemilih (DPT)</p>
              <p className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">
                {totalDPT.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/60">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Partisipasi</p>
              <p className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1 flex items-baseline gap-1">
                {totalDPT > 0 ? ((totalVotes / totalDPT) * 100).toFixed(1) : 0}
                <span className="text-xs font-normal text-slate-500">%</span>
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/60">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">TPS Terdaftar</p>
              <p className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">
                {tpsList.length}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/60">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">TPS Terverifikasi</p>
              <p className="text-2xl md:text-3xl font-extrabold text-emerald-600 mt-1 flex items-baseline gap-1">
                {tpsList.filter(t => t.status === "BLOCKCHAIN_ANCHORED").length}
                <span className="text-xs font-normal text-slate-500">/ {tpsList.length}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Charts & Candidates Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Donut Chart Visualization */}
          <Card className="lg:col-span-7 bg-white border-gray-200 shadow-md relative overflow-hidden">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Distribusi Persentase Suara
              </CardTitle>
              <CardDescription className="text-slate-500">
                Proporsi total suara sah yang teragregasi dari seluruh rekapitulasi TPS.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {totalVotes === 0 ? (
                <div className="h-[280px] flex flex-col items-center justify-center text-slate-500">
                  <Vote className="h-12 w-12 text-slate-300 mb-3 animate-pulse" />
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
                          <Cell key={`cell-${idx}`} fill={entry.fill} className="stroke-white focus:outline-none" strokeWidth={3} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-xl text-xs space-y-1">
                              <p className="font-bold text-slate-900">{d.fullName}</p>
                              <p className="text-slate-500 font-medium">{d.name}</p>
                              <div className="flex items-center gap-4 text-blue-600 pt-1">
                                <span className="font-bold text-sm">{d.value.toLocaleString("id-ID")} suara</span>
                                <span className="font-bold text-sm bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{d.percentage}%</span>
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
                            <span className="text-xs font-semibold text-slate-700 ml-1">
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
            <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Perolehan Suara Kandidat
            </h3>
            {candidatesWithPercentage.length === 0 ? (
              <Card className="bg-white border-gray-200 flex-1 flex items-center justify-center p-6 text-slate-500">
                <p className="text-sm">Tidak ada kandidat terdaftar.</p>
              </Card>
            ) : (
              candidatesWithPercentage.map((c, i) => (
                <Card key={c.id} className="bg-white border-gray-200 hover:border-gray-300 transition-all shadow-md group relative overflow-hidden flex flex-col">
                  <div 
                    className="absolute top-0 bottom-0 left-0 w-1 group-hover:w-1.5 transition-all" 
                    style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                      <div className="relative shrink-0 w-20 h-28 rounded-lg overflow-hidden border-2 border-red-600 shadow-sm bg-white flex flex-col">
                        <div className="bg-red-600 text-white font-black text-xs text-center py-0.5 tracking-wider border-b border-red-700">
                          {c.ballotNumber.toString().padStart(2, '0')}
                        </div>
                        <div className="flex-1 w-full bg-slate-100 relative flex items-center justify-center overflow-hidden">
                          {c.photoUrl ? (
                            <img 
                              src={`${import.meta.env.VITE_API_BASE_URL}${c.photoUrl}`} 
                              alt={getCandidateFullName(c)}
                              className="w-full h-full object-cover object-top"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Users className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm sm:text-base leading-tight truncate">
                          {getCandidateFullName(c)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Nomor Urut {c.ballotNumber}</p>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="link" size="sm" className="p-0 h-auto mt-1 text-blue-600 font-semibold text-xs">
                              Lihat Profil
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="text-xl font-bold">
                                Profil Pasangan Calon {c.ballotNumber}
                              </DialogTitle>
                              <DialogDescription>
                                {getCandidateFullName(c)}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="mt-4 space-y-6">
                              {c.photoUrl ? (
                                <div className="w-48 h-64 mx-auto mb-4 rounded-xl border-4 border-red-600 overflow-hidden shadow-md bg-white flex flex-col relative">
                                  <div className="bg-red-600 text-white font-extrabold text-sm text-center py-1 tracking-wider border-b border-red-700">
                                    PASANGAN CALON {c.ballotNumber.toString().padStart(2, '0')}
                                  </div>
                                  <div className="flex-1 w-full bg-slate-100 relative flex items-center justify-center overflow-hidden">
                                    <img
                                      src={`${import.meta.env.VITE_API_BASE_URL}${c.photoUrl}`}
                                      alt={getCandidateFullName(c)}
                                      className="w-full h-full object-cover object-top"
                                    />
                                  </div>
                                  <div className="bg-slate-900 text-white text-[10px] font-bold text-center py-1 truncate px-2">
                                    SURAT SUARA PILKADA KOTA TEGAL
                                  </div>
                                </div>
                              ) : (
                                <div className="w-48 h-64 border-4 border-dashed border-gray-300 rounded-xl mx-auto mb-4 flex flex-col items-center justify-center bg-gray-50">
                                  <Users className="h-12 w-12 text-gray-400 mb-2" />
                                  <span className="text-xs font-semibold text-gray-400">Foto Paslon</span>
                                </div>
                              )}
                              {c.motto && (
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Motto</h4>
                                  <p className="text-sm text-slate-700 italic">"{c.motto}"</p>
                                </div>
                              )}
                              <div>
                                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Visi</h4>
                                {formatList(c.vision)}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Misi</h4>
                                {formatList(c.mission)}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Riwayat Pendidikan</h4>
                                {formatList(c.education)}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Riwayat Karier</h4>
                                {formatList(c.careerPath)}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    <div className="text-left sm:text-right w-full sm:w-auto shrink-0 pl-16 sm:pl-0">
                      <p className="text-2xl font-black tracking-tight text-slate-900">
                        {c.voteCount.toLocaleString("id-ID")}
                      </p>
                      <Badge className="bg-gray-100 hover:bg-gray-200 text-slate-700 border-none font-bold text-xs mt-1">
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
        <Card className="bg-white border-gray-200 shadow-md">
          <CardHeader className="border-b border-gray-100 pb-4">
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600" />
              Verifikasi Integritas TPS
            </CardTitle>
            <CardDescription className="text-slate-500">
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
                  <TableHeader className="bg-gray-50 border-b border-gray-200">
                    <TableRow className="border-gray-200 hover:bg-transparent">
                      <TableHead className="w-16 font-bold text-slate-700">No.</TableHead>
                      <TableHead className="font-bold text-slate-700">Wilayah TPS</TableHead>
                      <TableHead className="font-bold text-slate-700">Kode TPS</TableHead>
                      <TableHead className="font-bold text-slate-700">Status Alur Kerja</TableHead>
                      <TableHead className="font-bold text-slate-700">SHA-256 Document Hash</TableHead>
                      <TableHead className="font-bold text-slate-700">Blockchain Transaction Hash</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tpsList.map((t, index) => (
                      <TableRow key={t.id} className="border-gray-200 hover:bg-gray-50 transition-colors">
                        <TableCell className="font-medium text-slate-500">{index + 1}</TableCell>
                        <TableCell className="min-w-[200px]">
                          <div className="font-bold text-slate-900">TPS {t.tpsNumber}</div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{t.village}, {t.district}, {t.cityRegency}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-800 font-semibold">{t.tpsCode}</TableCell>
                        <TableCell className="min-w-[150px]">
                          {getStatusBadge(t.status)}
                        </TableCell>
                        <TableCell className="min-w-[200px]">
                          {t.documentHash ? (
                            <div className="flex items-center gap-1.5 font-mono text-xs text-slate-800">
                              <span>{truncateHash(t.documentHash)}</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 hover:bg-gray-100 text-slate-500 hover:text-slate-800"
                                onClick={() => handleCopy(t.documentHash!)}
                              >
                                {copiedText === t.documentHash ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="min-w-[200px]">
                          {t.txHash ? (
                            <div className="flex items-center gap-1.5 font-mono text-xs text-slate-800">
                              <span className="text-blue-600 font-semibold">{truncateHash(t.txHash)}</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 hover:bg-gray-100 text-slate-500 hover:text-slate-800"
                                onClick={() => handleCopy(t.txHash!)}
                              >
                                {copiedText === t.txHash ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
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
        <Card className="bg-white border-gray-200 overflow-hidden shadow-md">
          <div className="p-6 md:p-8 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-b border-gray-200">
            <div className="flex items-start gap-4">
              <Shield className="h-8 w-8 text-blue-600 shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900">Prinsip Keamanan & Imutabilitas Data</h3>
                <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
                  Sistem e-voting ini menggunakan model auditabilitas terdistribusi. Setiap TPS yang menyelesaikan pemilihan memverifikasi dan menandatangani formulir digital C.Hasil. Nilai hash SHA-256 formulir tersebut beserta riwayat catatan log audit TPS diunggah dan di-anchor ke jaringan blockchain lokal menggunakan smart contract. Hal ini memastikan bahwa data perolehan suara tidak dapat diubah setelah disahkan secara sah di tingkat TPS.
                </p>
              </div>
            </div>
          </div>
          <CardContent className="p-6 bg-gray-50 text-xs text-slate-500 space-y-2">
            <p className="font-semibold text-slate-600">DISCLAIMER PROTOTIPE AKADEMIK:</p>
            <p>
              Dokumen dan simulasi sistem e-voting ini merupakan bagian dari prototipe akademik tugas akhir / skripsi dan bukan merupakan sistem resmi Komisi Pemilihan Umum (KPU). Seluruh data wilayah dan pemilih yang digunakan adalah data simulasi (synthetic data).
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 py-6 border-t border-gray-200">
          <div>© 2026 E-Voting Pilkada Kota Tegal Simulator. Hak Cipta Dilindungi.</div>
          <div className="flex items-center gap-1.5">
            <span>Powered by Hardhat & node:sqlite</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Homepage;
