import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowDown, FileDown, FileText, ImageIcon, Shield, Upload, XCircle, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const bytesToReadable = (value: number) => {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
};

const ChasilPreview = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Data states
  const [tpsList, setTpsList] = useState<any[]>([]);
  const [selectedTpsId, setSelectedTpsId] = useState<number | null>(null);
  const [tpsDetails, setTpsDetails] = useState<any | null>(null);
  const [electionDetails, setElectionDetails] = useState<any | null>(null);
  const [recapData, setRecapData] = useState<any | null>(null);
  const [documentData, setDocumentData] = useState<any | null>(null);
  
  // Loading & UI states
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [anchoring, setAnchoring] = useState(false);
  
  // File states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // New processing state for closing voting
  const [processingRecap, setProcessingRecap] = useState(false);

  const handleCloseVotingAndGenerateRecap = async () => {
    if (selectedTpsId === null) return;
    if (!confirm("Apakah Anda yakin ingin menutup pemungutan suara di TPS ini dan men-generate rekapitulasi hasil? Setelah ditutup, pemilih tidak dapat mengirimkan suara lagi.")) return;

    setProcessingRecap(true);
    try {
      const token = localStorage.getItem('token');
      
      // 1. Close TPS status
      const statusRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tps/${selectedTpsId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'CLOSED' })
      });

      if (!statusRes.ok) {
        const errData = await statusRes.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal mengubah status TPS.');
      }

      // 2. Generate Recap
      const recapRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/recaps/tps/${selectedTpsId}/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!recapRes.ok) {
        const errData = await recapRes.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal men-generate rekapitulasi suara.');
      }

      // 3. Generate Form C.Hasil
      const docRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/documents/tps/${selectedTpsId}/chasil/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!docRes.ok) {
        const errData = await docRes.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal men-generate dokumen C.Hasil.');
      }

      toast.success('Pemungutan suara berhasil ditutup dan rekapitulasi selesai!');
      await fetchTpsData(selectedTpsId);
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat memproses penutupan pemilu.');
    } finally {
      setProcessingRecap(false);
    }
  };


  // Authenticate on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // Fetch TPS list
  const fetchTpsList = async () => {
    setLoadingList(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tps`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Gagal mengambil daftar TPS');
      const json = await res.json();
      setTpsList(json.items || []);
      if (json.items && json.items.length > 0) {
        setSelectedTpsId(json.items[0].id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat TPS');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchTpsList();
  }, []);

  // Fetch selected TPS details and data
  const fetchTpsData = async (tpsId: number) => {
    setLoadingDetails(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch TPS Info
      const tpsRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tps/${tpsId}`, { headers });
      if (!tpsRes.ok) throw new Error('Gagal mengambil info TPS');
      const tpsJson = await tpsRes.json();
      const tpsInfo = tpsJson.data;
      setTpsDetails(tpsInfo);

      // 2. Fetch Election Info
      const electionRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/elections/${tpsInfo.election_id}`, { headers });
      if (electionRes.ok) {
        const electionJson = await electionRes.json();
        setElectionDetails(electionJson.data);
      }

      // 3. Fetch Recap Data
      const recapRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/recaps/tps/${tpsId}`, { headers });
      if (recapRes.ok) {
        const recapJson = await recapRes.json();
        setRecapData(recapJson.data);
      } else {
        setRecapData(null);
      }

      // 4. Fetch Document Data
      const docRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/documents/tps/${tpsId}`, { headers });
      if (docRes.ok) {
        const docJson = await docRes.json();
        setDocumentData(docJson.data);
      } else {
        setDocumentData(null);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal mengambil data lengkap TPS');
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (selectedTpsId !== null) {
      fetchTpsData(selectedTpsId);
      setSelectedFile(null);
      setPreviewUrl(null);
      setPreviewError(null);
    }
  }, [selectedTpsId]);

  // Clean up Object URL
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handlePrint = () => {
    window.print();
  };

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPreviewError(null);
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const supportedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!supportedTypes.includes(file.type)) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setPreviewError('Tipe file tidak didukung. Silakan pilih PDF, JPG, JPEG, atau PNG.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile) {
      toast.error('Pilih file terlebih dahulu sebelum konfirmasi upload.');
      return;
    }

    if (!documentData) {
      toast.error('Data dokumen tidak ditemukan. Silakan generate form terlebih dahulu.');
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('signedForm', selectedFile);

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/documents/${documentData.id}/signed-upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Gagal mengunggah file.');
      }

      toast.success('File tanda tangan berhasil diunggah!');
      
      if (selectedTpsId !== null) {
        await fetchTpsData(selectedTpsId);
      }
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat mengunggah');
    } finally {
      setUploading(false);
    }
  };

  const handleAnchorToBlockchain = async () => {
    if (selectedTpsId === null) return;

    setAnchoring(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/finalization/tps/${selectedTpsId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Gagal menambatkan data ke blockchain.');
      }

      toast.success('Hasil TPS berhasil ditambatkan ke Blockchain!');
      await fetchTpsData(selectedTpsId);
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat finalisasi blockchain');
    } finally {
      setAnchoring(false);
    }
  };

  // Compile preview details dynamically
  const previewData = useMemo(() => {
    if (!tpsDetails || !recapData) return null;
    return {
      electionName: electionDetails ? electionDetails.name : 'Pilkada 2026',
      electionType: electionDetails ? electionDetails.election_type : 'Pilkada',
      region: {
        province: tpsDetails.province || 'Jawa Tengah',
        city: tpsDetails.city_regency || 'Kota Tegal',
        district: tpsDetails.district || 'Kecamatan Tegal Timur',
        village: tpsDetails.village || 'Kelurahan',
      },
      votingDate: electionDetails ? electionDetails.voting_date : '2026-06-23',
      tpsNumber: tpsDetails.tps_number || '01',
      tpsCode: tpsDetails.tps_code || 'KR-01',
      officerName: 'Ketua KPPS',
      votingStart: '07:00',
      votingEnd: '13:00',
      countingStart: '13:15',
      countingEnd: '15:00',
      documentId: documentData ? `CHASIL-KWK-ID-${documentData.id}` : 'Belum digenerate',
      documentHash: documentData?.signedFile?.sha256 || documentData?.signed_file_hash_sha256 || 'Belum diunggah',
      blockchainTx: documentData?.blockchainRecord?.transactionHash || 'Belum ditambatkan',
      totalRegistered: recapData.totalRegisteredVoters,
      totalVerified: recapData.totalVerifiedVoters,
      totalValid: recapData.totalValidVotes,
      totalInvalid: recapData.totalInvalidVotes,
      totalVotes: recapData.totalValidVotes + recapData.totalInvalidVotes,
      candidates: recapData.candidateTotals.map((ct: any) => ({
        ballotNumber: ct.ballotNumber,
        names: `${ct.candidateName} & ${ct.viceCandidateName}`,
        party: 'Koalisi Pendukung',
        votes: ct.voteTotal,
      })),
    };
  }, [tpsDetails, electionDetails, recapData, documentData]);

  // Check if anchoring button should be visible/active
  const isFinalizationVisible = useMemo(() => {
    if (!tpsDetails) return false;
    const allowed = ['RECAP_GENERATED', 'DOCUMENT_UPLOADED', 'WITNESS_VERIFICATION', 'BLOCKCHAIN_ANCHORED'];
    return allowed.includes(tpsDetails.status);
  }, [tpsDetails]);

  const isFinalizationActive = useMemo(() => {
    if (!tpsDetails) return false;
    return tpsDetails.status !== 'BLOCKCHAIN_ANCHORED';
  }, [tpsDetails]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm no-print">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Preview & Finalisasi Dokumen C.Hasil</h1>
              <p className="text-sm text-muted-foreground font-medium">Dashboard Administrator & KPPS</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* TPS Selection Panel */}
        <div className="no-print p-4 bg-card border rounded-lg flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-700">Pilih TPS Penugasan:</span>
            {loadingList ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <select
                value={selectedTpsId || ''}
                onChange={(e) => setSelectedTpsId(Number(e.target.value))}
                className="bg-background border rounded px-3 py-1.5 text-sm font-medium w-[250px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {tpsList.map((t) => (
                  <option key={t.id} value={t.id}>
                    TPS {t.tps_number} ({t.tps_code})
                  </option>
                ))}
              </select>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/admin')} className="font-semibold">
              Kembali ke Dashboard
            </Button>
            <Button size="sm" onClick={handlePrint} disabled={!recapData} className="font-semibold">
              <FileDown className="mr-2 h-4 w-4" />
              Cetak / Simpan PDF
            </Button>
          </div>
        </div>

        {loadingDetails ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-sm font-medium">Memuat data lengkap TPS...</p>
          </div>
        ) : !recapData ? (
          <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
            <CardContent className="pt-6 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm text-amber-800">Menunggu Rekapitulasi Data</h3>
                <p className="text-xs text-amber-700 font-medium mt-1 leading-relaxed">
                  TPS ini belum memiliki data rekapitulasi yang valid. KPPS harus menutup pemungutan suara di TPS
                  dan men-generate rekapitulasi data suara terlebih dahulu.
                </p>
                <Button 
                  size="sm" 
                  className="mt-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-2"
                  onClick={handleCloseVotingAndGenerateRecap}
                  disabled={processingRecap}
                >
                  {processingRecap ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      Memproses...
                    </>
                  ) : (
                    "Tutup Pemungutan Suara & Generate Rekap"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

        ) : previewData ? (
          <>
            <Card className="printable-area bg-white border-slate-200/80 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b pb-4">
                <CardTitle className="text-slate-800">Pratinjau C.Hasil-KWK-inspired TPS Result Form</CardTitle>
                <CardDescription className="text-xs">
                  Form ini digenerate secara otomatis menggunakan data suara riil dalam SQLite database.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
                  <div className="space-y-6">
                    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Nama Pemilihan</p>
                          <h2 className="text-lg font-bold text-slate-800">{previewData.electionName}</h2>
                        </div>
                        <Badge variant="secondary" className="font-bold text-[10px] uppercase">{previewData.electionType}</Badge>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 text-xs font-medium text-slate-600">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Wilayah Pemilihan</p>
                          <p className="mt-1">{previewData.region.province} / {previewData.region.city}</p>
                          <p>{previewData.region.district} / {previewData.region.village}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tanggal Pemungutan</p>
                          <p className="mt-1">{new Date(previewData.votingDate).toLocaleDateString("id-ID", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 text-xs font-medium text-slate-600">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tempat Pemungutan Suara (TPS)</p>
                          <p className="mt-1">TPS {previewData.tpsNumber} / Kode: {previewData.tpsCode}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ketua KPPS</p>
                          <p className="mt-1">{previewData.officerName}</p>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-6">
                      <div className="flex items-center justify-between gap-3">
                        <Badge variant="outline" className="bg-white font-bold text-[10px] uppercase">Ringkasan Partisipasi</Badge>
                        {recapData?.validationStatus && (
                          <Badge className={`font-bold text-[10px] uppercase ${recapData.validationStatus === 'VALID' ? 'bg-emerald-600 hover:bg-emerald-600 text-white border-none shadow-sm' : 'bg-rose-600 hover:bg-rose-600 text-white border-none shadow-sm'}`}>
                            Validasi: {recapData.validationStatus}
                          </Badge>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-lg border border-slate-200 bg-white p-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DPT Terdaftar</p>
                          <p className="mt-2 text-xl font-black text-slate-800">{previewData.totalRegistered}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hadir / Terverifikasi</p>
                          <p className="mt-2 text-xl font-black text-slate-800">{previewData.totalVerified}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Suara Sah</p>
                          <p className="mt-2 text-xl font-black text-slate-800">{previewData.totalValid}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Suara Tidak Sah</p>
                          <p className="mt-2 text-xl font-black text-slate-800">{previewData.totalInvalid}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Suara Masuk</p>
                          <p className="mt-2 text-xl font-black text-slate-800">{previewData.totalVotes}</p>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-slate-800">Hasil Perolehan Suara Pasangan Calon</p>
                          <p className="text-xs text-muted-foreground font-medium">Berdasarkan hasil rekapitulasi data suara lokal.</p>
                        </div>
                        <Badge variant="outline" className="font-bold text-[10px]">{previewData.candidates.length} Pasangan Calon</Badge>
                      </div>
                      <div className="divide-y divide-slate-200 border-t">
                        {previewData.candidates.map((row) => (
                          <div key={row.ballotNumber} className="flex items-center justify-between py-4">
                            <div>
                              <p className="text-sm font-bold text-slate-800">No {row.ballotNumber}: {row.names}</p>
                              <p className="text-[11px] font-medium text-slate-500 mt-0.5">{row.party}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-black text-slate-900 font-mono">{row.votes}</p>
                              <p className="text-[10px] text-muted-foreground font-medium">Suara</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  {/* Document Security / Blockchain status */}
                  <div className="space-y-6">
                    <Card className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <CardHeader className="p-0 pb-4">
                        <CardTitle className="text-base text-slate-800">Keamanan & Integritas Dokumen</CardTitle>
                        <CardDescription className="text-xs">Detail status dokumen C.Hasil on-chain.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 p-0 pt-2">
                        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ID Metadata Dokumen</p>
                          <p className="mt-1 font-semibold text-xs text-slate-700">{previewData.documentId}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SHA-256 Hash Dokumen</p>
                          <p className="mt-1 font-mono text-[11px] text-slate-700 select-all break-all bg-white p-2 border rounded">
                            {previewData.documentHash}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hash Transaksi Blockchain</p>
                          <p className="mt-1 font-mono text-[11px] text-slate-700 select-all break-all bg-white p-2 border rounded">
                            {previewData.blockchainTx}
                          </p>
                        </div>

                        {isFinalizationVisible && (
                          <div className="pt-2">
                            {tpsDetails?.status === 'BLOCKCHAIN_ANCHORED' ? (
                              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-lg flex items-start gap-2.5">
                                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-wider">Hasil Terverifikasi On-Chain</p>
                                  <p className="text-[11px] font-medium leading-relaxed mt-0.5">
                                    Seluruh hasil TPS ini telah ditambatkan secara permanen ke blockchain lokal.
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <Button
                                onClick={handleAnchorToBlockchain}
                                disabled={anchoring || !isFinalizationActive}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 flex items-center justify-center shadow-sm"
                              >
                                {anchoring ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Menambatkan ke Blockchain...
                                  </>
                                ) : (
                                  <>
                                    <Shield className="h-4 w-4 mr-2" />
                                    Tambatkan ke Blockchain
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <CardHeader className="p-0 pb-4">
                        <CardTitle className="text-base text-slate-800">Tanda Tangan</CardTitle>
                        <CardDescription className="text-xs">Area penandatanganan hasil TPS fisik.</CardDescription>
                      </CardHeader>
                      <CardContent className="p-0 space-y-4">
                        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">KPPS Ketua</p>
                          <div className="mt-4 h-12 rounded-lg border border-dashed border-slate-300 bg-white flex items-center justify-center text-[10px] text-slate-400 font-semibold uppercase">
                            Ttd KPPS
                          </div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Saksi-Saksi TPS</p>
                          <div className="mt-4 h-12 rounded-lg border border-dashed border-slate-300 bg-white flex items-center justify-center text-[10px] text-slate-400 font-semibold uppercase">
                            Ttd Saksi
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Signed Document Upload Panel */}
            <Card className="no-print bg-white border-slate-200/80 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b pb-4">
                <CardTitle className="text-slate-800">Unggah Berkas Fisik Tanda Tangan</CardTitle>
                <CardDescription className="text-xs">
                  Unggah pindaian atau foto formulir C.Hasil yang telah ditandatangani KPPS dan Saksi.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={tpsDetails?.status === 'BLOCKCHAIN_ANCHORED'} className="font-semibold text-xs">
                        <Upload className="mr-2 h-4 w-4" />
                        Pilih File Pindaian
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={handleFileSelection}
                      />
                      {selectedFile && (
                        <Badge variant="secondary" className="font-semibold">{selectedFile.name}</Badge>
                      )}
                    </div>
                    
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status Berkas Upload</p>
                      <p className="mt-2 text-xs font-semibold text-slate-700 leading-relaxed">
                        {tpsDetails?.status === 'BLOCKCHAIN_ANCHORED' 
                          ? 'TPS telah di-anchor di blockchain. Unggahan file ditutup.'
                          : selectedFile 
                            ? 'File siap dipratinjau. Silakan periksa isi file secara visual lalu konfirmasi.' 
                            : documentData?.signedFile 
                              ? 'Berkas tanda tangan fisik telah berhasil diunggah.'
                              : 'Belum ada berkas fisik diunggah.'
                        }
                      </p>
                    </div>

                    {previewError && (
                      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive-foreground font-semibold">
                        {previewError}
                      </div>
                    )}

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <FileText className="h-4 w-4" /> Metadata Berkas
                      </div>
                      {selectedFile ? (
                        <div className="space-y-2 text-xs font-medium text-slate-700">
                          <p><span className="font-bold">Nama file:</span> {selectedFile.name}</p>
                          <p><span className="font-bold">Tipe file:</span> {selectedFile.type || 'Tidak diketahui'}</p>
                          <p><span className="font-bold">Ukuran:</span> {bytesToReadable(selectedFile.size)}</p>
                        </div>
                      ) : documentData?.signedFile ? (
                        <div className="space-y-2 text-xs font-medium text-slate-700">
                          <p><span className="font-bold">Nama file:</span> {documentData.signedFile.originalName}</p>
                          <p><span className="font-bold">Tipe file:</span> {documentData.signedFile.mimeType}</p>
                          <p><span className="font-bold">Ukuran:</span> {bytesToReadable(documentData.signedFile.sizeBytes)}</p>
                          <p><span className="font-bold">Diunggah pada:</span> {new Date(documentData.signedFile.uploadedAt).toLocaleString("id-ID")}</p>
                        </div>
                      ) : (
                        <p className="text-xs font-semibold text-slate-400">Tidak ada berkas yang dipilih.</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button 
                        onClick={handleConfirmUpload} 
                        disabled={!selectedFile || uploading || tpsDetails?.status === 'BLOCKCHAIN_ANCHORED'}
                        className="font-bold text-xs"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Mengunggah...
                          </>
                        ) : (
                          <>
                            <ArrowDown className="mr-2 h-4 w-4" />
                            Konfirmasi Unggah
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="secondary" 
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(null);
                          setPreviewError(null);
                        }}
                        disabled={!selectedFile}
                        className="font-bold text-xs"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Hapus Pilihan
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <p className="mb-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Pratinjau Berkas Unggahan</p>
                    {selectedFile && previewUrl ? (
                      selectedFile.type === 'application/pdf' ? (
                        <object data={previewUrl} type="application/pdf" className="h-[360px] w-full rounded-lg border bg-white shadow-inner">
                          <p className="p-6 text-xs text-slate-500 font-medium">Pratinjau PDF tidak tersedia.</p>
                        </object>
                      ) : (
                        <img src={previewUrl} alt="Pratinjau file" className="h-[360px] w-full rounded-lg object-contain bg-white border shadow-inner" />
                      )
                    ) : documentData?.signedFile ? (
                      documentData.signedFile.mimeType === 'application/pdf' ? (
                        <object data={`${import.meta.env.VITE_API_BASE_URL}/documents/${documentData.id}/signed-preview`} type="application/pdf" className="h-[360px] w-full rounded-lg border bg-white shadow-inner">
                          <p className="p-6 text-xs text-slate-500 font-medium">Pratinjau PDF tidak tersedia.</p>
                        </object>
                      ) : (
                        <img 
                          src={`${import.meta.env.VITE_API_BASE_URL}/documents/${documentData.id}/signed-preview`} 
                          alt="Berkas diunggah" 
                          className="h-[360px] w-full rounded-lg object-contain bg-white border shadow-inner" 
                        />
                      )
                    ) : (
                      <div className="flex h-[360px] w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-center text-xs font-medium text-slate-400 p-6">
                        Pilih file PDF/JPG/JPEG/PNG atau lihat pindaian yang sudah diunggah di sini.
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </main>
      <footer className="text-center text-xs text-muted-foreground py-8 border-t mt-12 bg-white no-print">
        Simulasi Sistem E-Voting – 2025
      </footer>
    </div>
  );
};

export default ChasilPreview;
