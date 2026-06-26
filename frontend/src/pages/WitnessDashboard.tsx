import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Shield,
  Vote,
  LogOut,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  FileText,
  Download,
  Upload,
  File,
  MapPin,
  Calendar,
  AlertCircle
} from "lucide-react";

interface TpsInfo {
  id: number;
  tps_number: string;
  tps_code: string;
  province: string;
  city_regency: string;
  district: string;
  village: string;
  address: string;
  status: string;
}

interface ElectionInfo {
  id: number;
  name: string;
  election_type: string;
  region_name: string;
  voting_date: string;
}

interface RecapInfo {
  id: number;
  validationStatus: string;
  totalRegisteredVoters: number;
  totalVerifiedVoters: number;
  totalValidVotes: number;
  totalInvalidVotes: number;
}

interface CandidateTotal {
  candidatePairId: number;
  ballotNumber: number;
  candidateName: string;
  viceCandidateName: string;
  voteTotal: number;
  voteTotalInWords: string;
}

interface DocumentInfo {
  id: number;
  status: string;
  generatedPdfPath: string;
  uploadedSignedFilePath: string | null;
  signedFileOriginalName: string | null;
  signedFileMimeType: string | null;
  signedFileSize: number | null;
  signedFileHashSha256: string | null;
  signedFileUploadedAt: string | null;
  previewUrl: string;
  downloadUrl: string;
  signedPreviewUrl: string | null;
  signedDownloadUrl: string | null;
}

interface VerificationRecord {
  id: number;
  status: "APPROVED" | "OBJECTED";
  note: string | null;
  evidenceFilePath: string | null;
  evidenceFileOriginalName: string | null;
  evidenceFileMimeType: string | null;
  evidenceFileSize: number | null;
  signedAt: string;
}

interface WitnessRecapResponse {
  tps: TpsInfo;
  election: ElectionInfo;
  recap: RecapInfo | null;
  candidateTotals: CandidateTotal[];
  document: DocumentInfo | null;
  verification: VerificationRecord | null;
}

const WitnessDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<WitnessRecapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [actionType, setActionType] = useState<"APPROVED" | "OBJECTED" | null>(null);
  const [notes, setNotes] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const fetchRecapData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Sesi Anda telah berakhir. Silakan login kembali.");
        navigate("/login");
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/witness/recap`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.status === 401 || res.status === 403) {
        toast.error("Akses ditolak. Sesi tidak valid.");
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Gagal mengambil data rekap TPS.");
      }

      const json = await res.json();
      setData(json.data);

      // Prepopulate form if verification exists
      if (json.data.verification) {
        setActionType(json.data.verification.status);
        setNotes(json.data.verification.note || "");
        setIsEditing(false);
      } else {
        setActionType(null);
        setNotes("");
        setEvidenceFile(null);
        setIsEditing(true);
      }
    } catch (err: any) {
      console.error("Fetch recap error:", err);
      toast.error(err.message || "Gagal memuat rekap saksi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecapData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    toast.success("Logout berhasil.");
    navigate("/login");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Ukuran file tidak boleh melebihi 5MB.");
        e.target.value = "";
        return;
      }
      setEvidenceFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionType) {
      toast.error("Silakan pilih status verifikasi.");
      return;
    }

    if (actionType === "OBJECTED" && !notes.trim()) {
      toast.error("Catatan alasan keberatan wajib diisi.");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("status", actionType);
      formData.append("notes", notes);
      if (actionType === "OBJECTED" && evidenceFile) {
        formData.append("evidenceFile", evidenceFile);
      }

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/witness/verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Gagal mengirim verifikasi.");
      }

      toast.success("Verifikasi saksi berhasil disimpan.");
      fetchRecapData();
    } catch (err: any) {
      console.error("Verification submit error:", err);
      toast.error(err.message || "Terjadi kesalahan saat mengirim verifikasi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <RefreshCw className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium">Memuat data verifikasi saksi...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Terjadi Kesalahan</CardTitle>
            <CardDescription>Gagal memuat rekap saksi atau TPS tidak ditugaskan.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-4">
            <Button onClick={fetchRecapData}>Coba Lagi</Button>
            <Button variant="outline" onClick={handleLogout}>Keluar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { tps, election, recap, candidateTotals, document, verification } = data;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">Portal Verifikasi Saksi TPS</h1>
              <p className="text-xs text-muted-foreground font-medium">Saksi Pilkada Berbasis Blockchain</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-700">Saksi TPS {tps.tps_number}</span>
              <span className="text-[10px] text-muted-foreground font-medium font-mono">{tps.tps_code}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-medium">
              <LogOut className="h-4 w-4 mr-2" />
              Keluar
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* TPS Location and Election Title */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="md:col-span-2 border-slate-200/80 shadow-sm bg-gradient-to-br from-primary/[0.03] to-transparent">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
                <Vote className="h-4 w-4" />
                Pemilihan Aktif
              </div>
              <CardTitle className="text-xl md:text-2xl text-slate-800">{election.name}</CardTitle>
              <CardDescription className="flex items-center gap-4 text-xs font-medium text-slate-500 pt-1">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Tanggal: {new Date(election.voting_date).toLocaleDateString("id-ID", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                  {election.election_type}
                </span>
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-slate-700 text-xs font-bold uppercase tracking-wider mb-1">
                <MapPin className="h-4 w-4" />
                Lokasi TPS Penugasan
              </div>
              <CardTitle className="text-lg text-slate-800">TPS {tps.tps_number}</CardTitle>
              <CardDescription className="text-xs font-medium text-slate-500">Kode: {tps.tps_code}</CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 leading-relaxed font-medium space-y-1">
              <div>{tps.address}</div>
              <div>Kel. {tps.village}, Kec. {tps.district}</div>
              <div>{tps.city_regency}, {tps.province}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recap Status Warnings */}
        {!recap && (
          <Card className="border-amber-200 bg-amber-50/50 mb-8 shadow-sm">
            <CardContent className="pt-6 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm text-amber-800">Menunggu Rekapitulasi TPS</h3>
                <p className="text-xs text-amber-700 font-medium mt-1 leading-relaxed">
                  KPPS belum melakukan finalisasi penutupan TPS dan pembuatan rekapitulasi data suara. 
                  Halaman ini akan diperbarui secara otomatis setelah data rekapitulasi dihasilkan oleh KPPS.
                </p>
                <Button size="sm" variant="outline" onClick={fetchRecapData} className="mt-3 border-amber-300 text-amber-800 hover:bg-amber-100/50 bg-white">
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Perbarui Data
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {recap && (
          <div className="grid lg:grid-cols-3 gap-8 items-start">
            {/* Left/Middle Content - Recap Totals and Candidate Votes */}
            <div className="lg:col-span-2 space-y-8">
              {/* Summary Stats Card */}
              <Card className="border-slate-200/80 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/75 border-b pb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-base text-slate-800">Statistik Rekapitulasi Suara</CardTitle>
                      <CardDescription className="text-xs">Data partisipasi pemilih di TPS {tps.tps_number}</CardDescription>
                    </div>
                    <Badge variant={recap.validationStatus === "VALID" ? "success" : "destructive"} className="text-xs font-bold px-2.5 py-0.5 rounded">
                      REKAP {recap.validationStatus}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 border rounded-lg">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">DPT Terdaftar</p>
                      <p className="text-xl font-extrabold text-slate-800 mt-1">100</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Pemilih Fisik</p>
                    </div>
                    <div className="p-4 bg-slate-50 border rounded-lg">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Pemilih Terverifikasi</p>
                      <p className="text-xl font-extrabold text-slate-800 mt-1">{recap.totalVerifiedVoters}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Hadir di TPS</p>
                    </div>
                    <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                      <p className="text-[10px] font-bold text-emerald-800 uppercase">Suara Sah</p>
                      <p className="text-xl font-extrabold text-emerald-900 mt-1">{recap.totalValidVotes}</p>
                      <p className="text-[10px] text-emerald-800/70 mt-0.5">Total Suara Masuk</p>
                    </div>
                    <div className="p-4 bg-slate-50 border rounded-lg">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Suara Tidak Sah</p>
                      <p className="text-xl font-extrabold text-slate-800 mt-1">{recap.totalInvalidVotes}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Sistem Booth</p>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between text-xs text-blue-900 font-medium">
                    <span>Tingkat Partisipasi Pemilih:</span>
                    <span className="font-bold text-sm bg-blue-100/50 px-2 py-0.5 rounded">
                      {`${Math.min(Math.round((recap.totalValidVotes / 100) * 100), 100)}%`}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Candidate Votes Card */}
              <Card className="border-slate-200/80 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/75 border-b pb-4">
                  <CardTitle className="text-base text-slate-800">Perolehan Suara Calon</CardTitle>
                  <CardDescription className="text-xs">Hasil penghitungan suara masing-masing pasangan calon (Read-only)</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="w-[80px] text-center font-bold">No. Urut</TableHead>
                        <TableHead className="font-bold">Pasangan Calon</TableHead>
                        <TableHead className="font-bold">Partai / Koalisi</TableHead>
                        <TableHead className="w-[120px] text-right font-bold">Jumlah Suara</TableHead>
                        <TableHead className="w-[200px] font-bold">Terbilang (Format C.Hasil)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {candidateTotals.map((candidate) => (
                        <TableRow key={candidate.candidatePairId} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="text-center font-extrabold text-slate-700 text-sm">
                            <span className="bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                              {candidate.ballotNumber}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="font-bold text-slate-800 text-sm">{candidate.candidateName}</div>
                            <div className="text-xs text-slate-500 font-medium mt-0.5">Wakil: {candidate.viceCandidateName}</div>
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-slate-600">
                            {candidate.ballotNumber === 1 ? "Party Alpha" : candidate.ballotNumber === 2 ? "Party Beta" : "Party Gamma"}
                          </TableCell>
                          <TableCell className="text-right font-black text-slate-900 text-base font-mono">
                            {candidate.voteTotal}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-slate-500 italic uppercase">
                            "{candidate.voteTotalInWords}"
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Document C.Hasil Info Card */}
              {document && (
                <Card className="border-slate-200/80 shadow-sm overflow-hidden">
                  <CardHeader className="bg-slate-50/75 border-b pb-4">
                    <CardTitle className="text-base text-slate-800">Formulir C.Hasil-KWK Hasil Pindai</CardTitle>
                    <CardDescription className="text-xs">Salinan formulir fisik yang diunggah oleh KPPS</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg bg-slate-50/50">
                      <div className="flex items-start gap-3">
                        <div className="bg-primary/10 p-2.5 rounded-lg text-primary mt-0.5">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-800">Dokumen C.Hasil Terkini</div>
                          <div className="text-xs text-slate-500 font-medium mt-0.5">
                            Status: <Badge variant="outline" className="text-[10px] uppercase font-bold">{document.status}</Badge>
                          </div>
                          {document.signedFileUploadedAt && (
                            <div className="text-[10px] text-slate-400 font-medium mt-1 font-mono">
                              Diunggah: {new Date(document.signedFileUploadedAt).toLocaleString("id-ID")}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button variant="outline" size="sm" className="text-xs font-semibold" onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL}${document.previewUrl}`, "_blank")}>
                          Preview Form HTML
                        </Button>
                        {document.signedDownloadUrl && (
                          <Button size="sm" className="text-xs font-semibold bg-primary hover:bg-primary/90" onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL}${document.signedDownloadUrl}`, "_blank")}>
                            <Download className="h-3.5 w-3.5 mr-1.5" />
                            Unduh Pindai Fisik
                          </Button>
                        )}
                      </div>
                    </div>

                    {document.signedFileHashSha256 && (
                      <div className="p-3 bg-slate-100 border rounded-lg">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SHA-256 Hash Tamper Detection</div>
                        <div className="text-[11px] font-mono text-slate-700 mt-1 select-all break-all bg-white p-2 rounded border">
                          {document.signedFileHashSha256}
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-1.5 font-medium leading-relaxed">
                          * Kode Hash SHA-256 di atas menjamin berkas pindaian C.Hasil yang Anda unduh identik dengan yang diunggah oleh KPPS dan tidak dimanipulasi setelah proses unggah.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Content - Witness Verification Form */}
            <div className="space-y-8">
              <Card className="border-slate-200/80 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/75 border-b pb-4">
                  <CardTitle className="text-base text-slate-800">Verifikasi & Tanda Tangan Saksi</CardTitle>
                  <CardDescription className="text-xs">Pernyataan persetujuan atau keberatan atas rekapitulasi data suara</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {verification && !isEditing ? (
                    <div className="space-y-6">
                      {verification.status === "APPROVED" ? (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-center flex flex-col items-center">
                          <CheckCircle className="h-10 w-10 text-emerald-600 mb-2" />
                          <h4 className="font-extrabold text-sm text-emerald-900">TPS TELAH DISETUJUI</h4>
                          <p className="text-xs text-emerald-800/80 font-medium mt-1 leading-relaxed">
                            Anda telah menandatangani verifikasi ini dan menyatakan setuju terhadap rekapitulasi data TPS.
                          </p>
                          <span className="text-[10px] text-emerald-600 font-mono font-bold mt-2">
                            Tgl: {new Date(verification.signedAt).toLocaleString("id-ID")}
                          </span>
                        </div>
                      ) : (
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-center flex flex-col items-center">
                          <AlertTriangle className="h-10 w-10 text-rose-600 mb-2" />
                          <h4 className="font-extrabold text-sm text-rose-900">KEBERATAN TELAH DIAJUKAN</h4>
                          <p className="text-xs text-rose-800/80 font-medium mt-1 leading-relaxed">
                            Anda menyatakan keberatan terhadap rekapitulasi data TPS ini.
                          </p>
                          <span className="text-[10px] text-rose-600 font-mono font-bold mt-2">
                            Tgl: {new Date(verification.signedAt).toLocaleString("id-ID")}
                          </span>
                        </div>
                      )}

                      {verification.note && (
                        <div className="p-3.5 bg-slate-50 border rounded-lg">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Alasan Keberatan / Catatan:</div>
                          <p className="text-xs font-semibold text-slate-800 leading-relaxed bg-white border p-2.5 rounded whitespace-pre-wrap">
                            {verification.note}
                          </p>
                        </div>
                      )}

                      {verification.evidenceFilePath && (
                        <div className="p-3 border rounded-lg bg-slate-50/50 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 truncate">
                            <File className="h-4 w-4 text-slate-400 shrink-0" />
                            <span className="text-xs font-semibold text-slate-700 truncate select-all">
                              {verification.evidenceFileOriginalName || "evidence.pdf"}
                            </span>
                          </div>
                          <Button size="sm" variant="ghost" className="h-8 text-primary hover:text-primary-foreground text-xs font-bold" onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL}/witness/evidence/${verification.id}`, "_blank")}>
                            <Download className="h-3.5 w-3.5 mr-1" />
                            Unduh
                          </Button>
                        </div>
                      )}

                      <Button variant="outline" className="w-full text-xs font-bold mt-4" onClick={() => setIsEditing(true)}>
                        Ubah Verifikasi
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-3">
                        <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Langkah 1: Tentukan Status</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            type="button"
                            variant={actionType === "APPROVED" ? "default" : "outline"}
                            className={`h-11 font-bold text-xs ${actionType === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                            onClick={() => {
                              setActionType("APPROVED");
                              setNotes("");
                              setEvidenceFile(null);
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Setujui Hasil
                          </Button>
                          <Button
                            type="button"
                            variant={actionType === "OBJECTED" ? "default" : "outline"}
                            className={`h-11 font-bold text-xs ${actionType === "OBJECTED" ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-600" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                            onClick={() => {
                              setActionType("OBJECTED");
                            }}
                          >
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Ajukan Keberatan
                          </Button>
                        </div>
                      </div>

                      {actionType === "APPROVED" && (
                        <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg text-emerald-800 text-xs font-medium leading-relaxed space-y-2">
                          <div className="flex items-center gap-1.5 font-bold">
                            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                            Pernyataan Saksi Setuju
                          </div>
                          <div>
                            Dengan ini saya menyatakan setuju bahwa seluruh perolehan suara di TPS {tps.tps_number} yang dicantumkan dalam rekapitulasi di atas adalah sah, benar, dan sesuai dengan formulir fisik C.Hasil.
                          </div>
                        </div>
                      )}

                      {actionType === "OBJECTED" && (
                        <div className="space-y-4 pt-2 border-t">
                          <div className="space-y-2">
                            <Label htmlFor="notes" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                              Langkah 2: Alasan Keberatan <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                              id="notes"
                              placeholder="Tuliskan poin keberatan Anda secara detail (misal: selisih jumlah suara, dugaan manipulasi, dll)..."
                              className="min-h-[100px] text-xs leading-relaxed"
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="evidence" className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                              Langkah 3: Unggah Bukti Keberatan (Opsional)
                            </Label>
                            <div className="border border-dashed rounded-lg p-4 bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col items-center justify-center cursor-pointer relative">
                              <input
                                id="evidence"
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={handleFileChange}
                                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                              />
                              <Upload className="h-6 w-6 text-slate-400 mb-1.5" />
                              <span className="text-[11px] font-bold text-slate-700">Pilih Berkas Bukti</span>
                              <span className="text-[9px] text-muted-foreground mt-0.5">Format: PDF, JPG, PNG (Maks 5MB)</span>
                            </div>
                            {evidenceFile && (
                              <div className="p-2 border rounded bg-white flex items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-1.5 truncate text-slate-700 font-medium">
                                  <File className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{evidenceFile.name}</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                                  {(evidenceFile.size / 1024 / 1024).toFixed(2)} MB
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {actionType && (
                        <div className="flex gap-2 pt-2">
                          {verification && (
                            <Button type="button" variant="outline" className="w-1/3 text-xs font-bold" onClick={() => setIsEditing(false)}>
                              Batal
                            </Button>
                          )}
                          <Button
                            type="submit"
                            disabled={submitting}
                            className={`flex-1 font-bold text-xs ${actionType === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-rose-600 hover:bg-rose-700 text-white"}`}
                          >
                            {submitting ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Mengirim...
                              </>
                            ) : (
                              "Kirim Verifikasi"
                            )}
                          </Button>
                        </div>
                      )}
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
      <footer className="text-center text-sm text-muted-foreground py-8 border-t mt-12 bg-white">
        Simulasi Sistem E-Voting – 2025
      </footer>
    </div>
  );
};

export default WitnessDashboard;
