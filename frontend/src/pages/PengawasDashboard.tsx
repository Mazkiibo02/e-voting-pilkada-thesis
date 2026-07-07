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
  Shield, Vote, LogOut, RefreshCw, CheckCircle, AlertTriangle, FileText, Download,
  Upload, File, MapPin, Calendar, AlertCircle, Activity
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
  registered_voters_total: number;
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
  signedDownloadUrl: string | null;
  previewUrl: string;
  signedFileHashSha256: string | null;
  signedFileUploadedAt: string | null;
}

interface VerificationRecord {
  id: number;
  status: "APPROVED" | "OBJECTED";
  note: string | null;
  evidenceFilePath: string | null;
  evidenceFileOriginalName: string | null;
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

const PengawasDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<WitnessRecapResponse | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      const json = await res.json();
      if (res.ok) {
        setData(json.data);
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
      }
      
      // Fetch Audit Logs
      const logsRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/audit-logs?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const logsJson = await logsRes.json();
      if (logsRes.ok) {
        setAuditLogs(logsJson.items || []);
      }
    } catch (err: any) {
      toast.error("Gagal memuat data pengawas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecapData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
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
    if (!actionType) return toast.error("Silakan pilih status verifikasi.");
    if (actionType === "OBJECTED" && !notes.trim()) return toast.error("Catatan wajib diisi.");

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("status", actionType);
      formData.append("notes", notes);
      if (actionType === "OBJECTED" && evidenceFile) formData.append("evidenceFile", evidenceFile);

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/witness/verify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) throw new Error("Gagal mengirim verifikasi.");

      toast.success("Verifikasi (Co-Sign) pengawas berhasil disimpan.");
      fetchRecapData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <RefreshCw className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium">Memuat data dashboard pengawas...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { tps, election, recap, document, verification } = data;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg text-purple-700">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">Dashboard Pengawas TPS</h1>
              <p className="text-xs text-muted-foreground font-medium">Pengawasan Aktif Bawaslu</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-rose-600 hover:bg-rose-50 font-medium">
            <LogOut className="h-4 w-4 mr-2" /> Keluar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="md:col-span-2 border-slate-200/80 shadow-sm bg-gradient-to-br from-purple-50 to-transparent">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-purple-700 text-xs font-bold uppercase tracking-wider mb-1">
                <Vote className="h-4 w-4" /> Pemilihan Aktif
              </div>
              <CardTitle className="text-xl md:text-2xl text-slate-800">{election.name}</CardTitle>
              <CardDescription className="flex items-center gap-4 text-xs font-medium text-slate-500 pt-1">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(election.voting_date).toLocaleDateString("id-ID")}
                </span>
                <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                  {election.election_type}
                </span>
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-slate-700 text-xs font-bold uppercase tracking-wider mb-1">
                <MapPin className="h-4 w-4" /> Lokasi TPS Pengawasan
              </div>
              <CardTitle className="text-lg text-slate-800">TPS {tps.tps_number}</CardTitle>
              <CardDescription className="text-xs font-medium text-slate-500">Kode: {tps.tps_code}</CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 font-medium space-y-1">
              <div>{tps.address}</div>
              <div>Kel. {tps.village}, Kec. {tps.district}</div>
              <div>{tps.city_regency}, {tps.province}</div>
            </CardContent>
          </Card>
        </div>

        {/* Audit Logs Section */}
        <Card className="mb-8 shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base text-slate-800 flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              Real-time Audit Log
            </CardTitle>
            <CardDescription className="text-xs">Log aktivitas sistem di TPS ini</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="max-h-[300px] overflow-auto mt-4 border rounded-md">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0">
                  <TableRow>
                    <TableHead className="w-[150px]">Waktu</TableHead>
                    <TableHead>Aksi</TableHead>
                    <TableHead>Aktor</TableHead>
                    <TableHead>Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-500 py-4">Belum ada aktivitas terekam.</TableCell>
                    </TableRow>
                  ) : (
                    auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs font-mono">{new Date(log.created_at).toLocaleString('id-ID')}</TableCell>
                        <TableCell className="text-xs font-semibold">{log.action}</TableCell>
                        <TableCell className="text-xs">{log.actor_display || log.actor_name}</TableCell>
                        <TableCell className="text-xs text-slate-600">{log.description}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {!recap && (
          <Card className="border-amber-200 bg-amber-50/50 mb-8 shadow-sm">
            <CardContent className="pt-6 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm text-amber-800">Menunggu Rekapitulasi TPS</h3>
                <p className="text-xs text-amber-700 font-medium mt-1 leading-relaxed">
                  Data rekapitulasi C.Hasil belum diterbitkan oleh KPPS. Anda dapat melakukan verifikasi (Co-Sign) setelah rekapitulasi selesai.
                </p>
                <Button size="sm" variant="outline" onClick={fetchRecapData} className="mt-3 bg-white border-amber-300 text-amber-800 hover:bg-amber-100/50">
                  <RefreshCw className="h-3 w-3 mr-2" /> Perbarui Data
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {recap && (
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-8">
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
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Co-Sign / Verification Form */}
            <div className="space-y-8">
              <Card className="border-slate-200/80 shadow-sm overflow-hidden border-t-4 border-t-purple-600">
                <CardHeader className="bg-slate-50/75 border-b pb-4">
                  <CardTitle className="text-base text-slate-800">Verifikasi & Sahkan (Co-Sign) Pengawas</CardTitle>
                  <CardDescription className="text-xs">Pernyataan persetujuan atau pengajuan sengketa oleh Pengawas</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {verification && !isEditing ? (
                    <div className="space-y-6">
                      {verification.status === "APPROVED" ? (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-center flex flex-col items-center">
                          <CheckCircle className="h-10 w-10 text-emerald-600 mb-2" />
                          <h4 className="font-extrabold text-sm text-emerald-900">TPS TELAH DISAHKAN PENGAWAS</h4>
                          <span className="text-[10px] text-emerald-600 font-mono font-bold mt-2">
                            Tgl: {new Date(verification.signedAt).toLocaleString("id-ID")}
                          </span>
                        </div>
                      ) : (
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-center flex flex-col items-center">
                          <AlertTriangle className="h-10 w-10 text-rose-600 mb-2" />
                          <h4 className="font-extrabold text-sm text-rose-900">SENGKETA TELAH DIAJUKAN PENGAWAS</h4>
                          <span className="text-[10px] text-rose-600 font-mono font-bold mt-2">
                            Tgl: {new Date(verification.signedAt).toLocaleString("id-ID")}
                          </span>
                        </div>
                      )}
                      {verification.note && (
                        <div className="p-3.5 bg-slate-50 border rounded-lg">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Catatan Pengawas:</div>
                          <p className="text-xs font-semibold text-slate-800 leading-relaxed bg-white border p-2.5 rounded whitespace-pre-wrap">
                            {verification.note}
                          </p>
                        </div>
                      )}
                      <Button variant="outline" className="w-full text-xs font-bold mt-4" onClick={() => setIsEditing(true)}>Ubah Verifikasi</Button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-3">
                        <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Langkah 1: Tentukan Status</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <Button type="button" variant={actionType === "APPROVED" ? "default" : "outline"}
                            className={`h-11 font-bold text-xs ${actionType === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600" : ""}`}
                            onClick={() => { setActionType("APPROVED"); setNotes(""); setEvidenceFile(null); }}>
                            <CheckCircle className="h-4 w-4 mr-2" /> Verifikasi & Sahkan
                          </Button>
                          <Button type="button" variant={actionType === "OBJECTED" ? "default" : "outline"}
                            className={`h-11 font-bold text-xs ${actionType === "OBJECTED" ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-600" : ""}`}
                            onClick={() => setActionType("OBJECTED")}>
                            <AlertTriangle className="h-4 w-4 mr-2" /> Ajukan Sengketa
                          </Button>
                        </div>
                      </div>

                      {actionType === "OBJECTED" && (
                        <div className="space-y-4 pt-2 border-t">
                          <div className="space-y-2">
                            <Label htmlFor="notes" className="text-xs font-bold text-slate-700 uppercase">Catatan / Alasan <span className="text-destructive">*</span></Label>
                            <Textarea id="notes" placeholder="Detail sengketa..." className="min-h-[100px] text-xs" value={notes} onChange={(e) => setNotes(e.target.value)} required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="evidence" className="text-xs font-bold text-slate-700 uppercase">Unggah Bukti Sengketa (Opsional)</Label>
                            <div className="border border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer relative">
                              <input id="evidence" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
                              <Upload className="h-6 w-6 text-slate-400 mb-1.5" />
                              <span className="text-[11px] font-bold text-slate-700">Pilih Berkas Bukti</span>
                            </div>
                            {evidenceFile && <div className="text-xs font-semibold">{evidenceFile.name}</div>}
                          </div>
                        </div>
                      )}

                      {actionType && (
                        <div className="flex gap-2 pt-2">
                          {verification && <Button type="button" variant="outline" className="w-1/3 text-xs font-bold" onClick={() => setIsEditing(false)}>Batal</Button>}
                          <Button type="submit" disabled={submitting} className={`flex-1 font-bold text-xs bg-purple-600 hover:bg-purple-700 text-white`}>
                            {submitting ? "Menyimpan..." : "Simpan (Co-Sign)"}
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
    </div>
  );
};

export default PengawasDashboard;
