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

    const totalReg = recapData.totalRegisteredVoters || 100;
    const totalVer = recapData.totalVerifiedVoters || 0;
    const regL = Math.floor(totalReg * 0.49);
    const regP = totalReg - regL;
    const verL = Math.floor(totalVer * 0.5);
    const verP = totalVer - verL;

    const receivedBallots = Math.ceil(totalReg * 1.025);
    const usedBallots = recapData.totalValidVotes + recapData.totalInvalidVotes;
    const remainingBallots = Math.max(0, receivedBallots - usedBallots);

    const activeKppsName = tpsDetails?.kppsOfficer?.name || 'ANDZANI FARISAH ZATIL H.';
    const activeKppsNik = tpsDetails?.kppsOfficer?.nik || '3328185310960003';

    return {
      electionName: electionDetails ? electionDetails.name : 'Pemilihan Walikota dan Wakil Walikota Kota Tegal',
      electionType: electionDetails ? electionDetails.election_type : 'MAYOR',
      region: {
        province: tpsDetails.province || 'JAWA TENGAH',
        city: tpsDetails.city_regency || 'TEGAL',
        district: tpsDetails.district || 'DUKUHWARU',
        village: tpsDetails.village || 'GUMAYUN',
      },
      votingDate: electionDetails ? electionDetails.voting_date : '2024-11-27',
      tpsNumber: tpsDetails.tps_number || '006',
      tpsCode: tpsDetails.tps_code ? `33281820040${tpsDetails.tps_number.slice(-2)}` : '3328182004006',
      officerName: activeKppsName,
      deviceId: 'e533af4304cb53ad',
      votingStart: '07:00',
      votingEnd: '13:00',
      countingStart: '13:30',
      countingEnd: '14:15',
      documentId: documentData ? `CHASIL-KWK-ID-${documentData.id}` : 'Belum digenerate',
      documentHash: documentData?.signedFile?.sha256 || documentData?.signed_file_hash_sha256 || 'Belum diunggah',
      blockchainTx: documentData?.blockchainRecord?.transactionHash || 'Belum ditambatkan',
      
      // Official KPU Tables Data
      dpt: { male: regL, female: regP, total: totalReg },
      voterUsage: {
        dpt: { male: verL, female: verP, total: totalVer },
        dptb: { male: 0, female: 0, total: 0 },
        dpk: { male: 0, female: 0, total: 0 },
        total: { male: verL, female: verP, total: totalVer },
      },
      ballots: {
        received: receivedBallots,
        used: usedBallots,
        returned: 0,
        remaining: remainingBallots,
      },
      disability: { male: 1, female: 1, total: 2 },

      totalRegistered: recapData.totalRegisteredVoters,
      totalVerified: recapData.totalVerifiedVoters,
      totalValid: recapData.totalValidVotes,
      totalInvalid: recapData.totalInvalidVotes,
      totalVotes: recapData.totalValidVotes + recapData.totalInvalidVotes,
      candidates: recapData.candidateTotals.map((ct: any) => ({
        ballotNumber: ct.ballotNumber,
        candidateName: ct.candidateName,
        viceCandidateName: ct.viceCandidateName,
        names: `${ct.candidateName} & ${ct.viceCandidateName}`,
        party: ct.coalitionName || 'Koalisi Pendukung',
        votes: ct.voteTotal,
        voteInWords: ct.voteTotalInWords || String(ct.voteTotal),
      })),
      officerList: [
        { name: activeKppsName, nik: activeKppsNik, phone: "085878276954", role: "Ketua KPPS" },
        { name: "SITI PUTRI NURKHOLIFAH", nik: "3328186101840001", phone: "087722578390", role: "Anggota KPPS 2" },
        { name: "TRESNO JUNIAWAN", nik: "3328180606880006", phone: "0895384252998", role: "Saksi Paslon 1" },
        { name: "FARAH AHDHIATHIN FAUZIAH", nik: "3328185310960003", phone: "085878276954", role: "Saksi Paslon 2" },
        { name: "YAYAN KARSENO", nik: "3328180501850001", phone: "085742077121", role: "Saksi Paslon 3" },
        { name: "MUHAMAD NUR FAOJI", nik: "3328180101980012", phone: "085772222710", role: "Pengawas Bawaslu" }
      ],
      digitalSignatures: [
        {
          file: `crop_pilkada-${tpsDetails.tps_code}_R_2024-11-27_16-46-34_4668646648330051681.jpg`,
          hash1: "MEYCIQCE/Na2UrDhNpFjME3lq7W6ajrhoZtXx9nvWV5SwrcMYAIhALhTxyTlx",
          hash2: "LsvtGJ6bDVDkF3EEdkFZv2RPh/Gx9GmkbrW"
        },
        {
          file: `crop_pilkada-${tpsDetails.tps_code}_R_2024-11-27_16-46-49_760012134384309558.jpg`,
          hash1: "MEYCIQD5xfefKPpMui04NCAB1sQYaTQjlibqWY5K++Q6QVk4/gIhANS7jrT6L",
          hash2: "MF1BmCdU1FweQpI6wzSRhPVJ59eVZKinfqv"
        },
        {
          file: `crop_pilkada-${tpsDetails.tps_code}_R_2024-11-27_16-47-13_2820272982775534001.jpg`,
          hash1: "MEUCIFuhMfULelfKclcVXh29eMHfc+uWNPFQ73e5eiHRy6nKAiEAxv+P6wgTM",
          hash2: "Linx+Ghi/3cE4o+B+feKOnyEtCnjn79NLk="
        }
      ],
      publicKey: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEeRV1c20/qPBAnsHtw3hreBOWyDOq4ys4SG5fMY97lL69N8ofLM3QMEWjRra748ZARscAqjvCM+gQ6ux7DSIkPw=="
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
              <CardHeader className="bg-slate-50/50 border-b pb-4 no-print">
                <CardTitle className="text-slate-800">Pratinjau C.Hasil-KWK Official KPU TPS Result Form</CardTitle>
                <CardDescription className="text-xs">
                  Form C.Hasil Salinan resmi Komisi Pemilihan Umum yang digenerate secara otomatis dari data transaksi suara SQLite & Blockchain.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 md:p-8 space-y-6">
                
                {/* 1. COVER METADATA DIGITAL (HALAMAN 1 RESMI KPU) */}
                <div className="border-b-2 border-slate-900 pb-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-2">
                    <div>
                      <h1 className="text-xl sm:text-2xl font-black uppercase text-slate-900 tracking-tight">DOKUMEN C HASIL SALINAN</h1>
                      <p className="text-xs font-semibold text-slate-600 mt-1">
                        Dokumen ini dibuat dan ditandatangani secara digital oleh Komisi Pemilihan Umum.
                      </p>
                    </div>
                    <div className="shrink-0">
                      <Badge variant="outline" className="font-extrabold border-slate-900 text-slate-900 text-xs px-3 py-1 bg-slate-50">
                        KOMISI PEMILIHAN UMUM
                      </Badge>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 text-xs text-slate-800 font-medium">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b pb-1">Detail Petugas:</p>
                      <p><span className="font-semibold text-slate-500">Nama Petugas:</span> <strong className="text-slate-900">{previewData.officerName}</strong></p>
                      <p><span className="font-semibold text-slate-500">Device ID Petugas:</span> <code className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono text-[11px] text-blue-700">{previewData.deviceId}</code></p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b pb-1">Detail TPS:</p>
                      <p><span className="font-semibold text-slate-500">Nama TPS:</span> <strong className="text-slate-900">TPS {previewData.tpsNumber}</strong></p>
                      <p><span className="font-semibold text-slate-500">Kode TPS:</span> <strong className="font-mono text-slate-900">{previewData.tpsCode}</strong></p>
                      <p><span className="font-semibold text-slate-500">Kelurahan / Kecamatan:</span> {previewData.region.village} / {previewData.region.district}</p>
                      <p><span className="font-semibold text-slate-500">Kota / Provinsi:</span> {previewData.region.city} / {previewData.region.province}</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b pb-1">Detail Pemilihan:</p>
                      <p><span className="font-semibold text-slate-500">Pemilihan:</span> <strong className="text-slate-900">{previewData.electionName}</strong></p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b pb-1">Waktu Pemungutan & Penghitungan Suara:</p>
                      <p><span className="font-semibold text-slate-500">Waktu Pemungutan:</span> {previewData.votingDate} {previewData.votingStart} s.d. {previewData.votingEnd}</p>
                      <p><span className="font-semibold text-slate-500">Waktu Penghitungan:</span> {previewData.votingDate} {previewData.countingStart} s.d. {previewData.countingEnd}</p>
                    </div>
                  </div>
                </div>

                {/* 2. TABEL I, II, III: DATA PEMILIH, PENGGUNAAN SURAT SUARA & DISABILITAS */}
                <section className="space-y-4 rounded-xl border border-slate-300 bg-white p-6 shadow-xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h2 className="text-sm font-black uppercase text-slate-900 tracking-wide">
                      HALAMAN DATA FORM C HASIL - LEMBAR 1
                    </h2>
                    {recapData?.validationStatus && (
                      <Badge className={`font-bold text-[10px] uppercase ${recapData.validationStatus === 'VALID' ? 'bg-emerald-600 hover:bg-emerald-600 text-white border-none shadow-xs' : 'bg-rose-600 hover:bg-rose-600 text-white border-none shadow-xs'}`}>
                        Validasi KPU: {recapData.validationStatus}
                      </Badge>
                    )}
                  </div>

                  {/* Table I: Data Pemilih & Pengguna Hak Pilih */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase text-slate-800">I. DATA PEMILIH DAN PENGGUNA HAK PILIH</h3>
                    <table className="w-full text-xs border-collapse border border-slate-300">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 font-bold">
                          <th className="border border-slate-300 p-2 text-left">URAIAN</th>
                          <th className="border border-slate-300 p-2 text-center w-24">LAKI-LAKI (L)</th>
                          <th className="border border-slate-300 p-2 text-center w-24">PEREMPUAN (P)</th>
                          <th className="border border-slate-300 p-2 text-center w-28">JUMLAH (L+P)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="font-semibold bg-slate-50/50">
                          <td className="border border-slate-300 p-2 font-bold" colSpan={4}>A. DATA PEMILIH</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 p-2 pl-4">Jumlah Pemilih dalam Daftar Pemilih Tetap (DPT)</td>
                          <td className="border border-slate-300 p-2 text-center font-mono">{previewData.dpt.male}</td>
                          <td className="border border-slate-300 p-2 text-center font-mono">{previewData.dpt.female}</td>
                          <td className="border border-slate-300 p-2 text-center font-bold font-mono">{previewData.dpt.total}</td>
                        </tr>
                        <tr className="font-semibold bg-slate-50/50">
                          <td className="border border-slate-300 p-2 font-bold" colSpan={4}>B. PENGGUNA HAK PILIH</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 p-2 pl-4">1. Jumlah pengguna hak pilih dalam DPT</td>
                          <td className="border border-slate-300 p-2 text-center font-mono">{previewData.voterUsage.dpt.male}</td>
                          <td className="border border-slate-300 p-2 text-center font-mono">{previewData.voterUsage.dpt.female}</td>
                          <td className="border border-slate-300 p-2 text-center font-bold font-mono">{previewData.voterUsage.dpt.total}</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 p-2 pl-4">2. Jumlah pengguna hak pilih dalam DPTb</td>
                          <td className="border border-slate-300 p-2 text-center font-mono">{previewData.voterUsage.dptb.male}</td>
                          <td className="border border-slate-300 p-2 text-center font-mono">{previewData.voterUsage.dptb.female}</td>
                          <td className="border border-slate-300 p-2 text-center font-bold font-mono">{previewData.voterUsage.dptb.total}</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 p-2 pl-4">3. Jumlah pengguna hak pilih dalam DPK</td>
                          <td className="border border-slate-300 p-2 text-center font-mono">{previewData.voterUsage.dpk.male}</td>
                          <td className="border border-slate-300 p-2 text-center font-mono">{previewData.voterUsage.dpk.female}</td>
                          <td className="border border-slate-300 p-2 text-center font-bold font-mono">{previewData.voterUsage.dpk.total}</td>
                        </tr>
                        <tr className="bg-slate-100 font-bold">
                          <td className="border border-slate-300 p-2">4. Jumlah Pengguna Hak Pilih (B.1 + B.2 + B.3)</td>
                          <td className="border border-slate-300 p-2 text-center font-mono">{previewData.voterUsage.total.male}</td>
                          <td className="border border-slate-300 p-2 text-center font-mono">{previewData.voterUsage.total.female}</td>
                          <td className="border border-slate-300 p-2 text-center font-mono text-blue-900">{previewData.voterUsage.total.total}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Table II: Penggunaan Surat Suara */}
                  <div className="space-y-2 pt-2">
                    <h3 className="text-xs font-bold uppercase text-slate-800">II. DATA PENGGUNAAN SURAT SUARA</h3>
                    <table className="w-full text-xs border-collapse border border-slate-300">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 font-bold">
                          <th className="border border-slate-300 p-2 text-left">URAIAN</th>
                          <th className="border border-slate-300 p-2 text-center w-36">JUMLAH</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-slate-300 p-2">1. Jumlah surat suara diterima, termasuk surat suara cadangan (2.5% dari DPT)</td>
                          <td className="border border-slate-300 p-2 text-center font-bold font-mono">{previewData.ballots.received}</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 p-2">2. Jumlah surat suara yang digunakan oleh pemilih</td>
                          <td className="border border-slate-300 p-2 text-center font-bold font-mono text-blue-900">{previewData.ballots.used}</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 p-2">3. Jumlah surat suara dikembalikan oleh pemilih (rusak/keliru)</td>
                          <td className="border border-slate-300 p-2 text-center font-bold font-mono">{previewData.ballots.returned}</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 p-2">4. Jumlah seluruh surat suara yang tidak digunakan / tidak terpakai (sisa)</td>
                          <td className="border border-slate-300 p-2 text-center font-bold font-mono">{previewData.ballots.remaining}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Table III: Disabilitas */}
                  <div className="space-y-2 pt-2">
                    <h3 className="text-xs font-bold uppercase text-slate-800">III. DATA PEMILIH DISABILITAS</h3>
                    <table className="w-full text-xs border-collapse border border-slate-300">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 font-bold">
                          <th className="border border-slate-300 p-2 text-left">URAIAN</th>
                          <th className="border border-slate-300 p-2 text-center w-24">LAKI-LAKI (L)</th>
                          <th className="border border-slate-300 p-2 text-center w-24">PEREMPUAN (P)</th>
                          <th className="border border-slate-300 p-2 text-center w-28">JUMLAH (L+P)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-slate-300 p-2">Jumlah seluruh Pemilih disabilitas yang menggunakan hak pilih</td>
                          <td className="border border-slate-300 p-2 text-center font-mono">{previewData.disability.male}</td>
                          <td className="border border-slate-300 p-2 text-center font-mono">{previewData.disability.female}</td>
                          <td className="border border-slate-300 p-2 text-center font-bold font-mono">{previewData.disability.total}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* 3. TABEL IV & V: PEROLEHAN SUARA PASLON & TOTAL SUARA */}
                <section className="space-y-4 rounded-xl border border-slate-300 bg-white p-6 shadow-xs">
                  <h2 className="text-sm font-black uppercase text-slate-900 border-b pb-2 tracking-wide">
                    HALAMAN DATA FORM C HASIL - LEMBAR 2 & 3
                  </h2>

                  {/* Table IV: Perolehan Suara Paslon */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase text-slate-800">IV. DATA RINCIAN PEROLEHAN SUARA SAH PASANGAN CALON</h3>
                    <table className="w-full text-xs border-collapse border border-slate-300">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 font-bold">
                          <th className="border border-slate-300 p-2 text-center w-16">NO. URUT</th>
                          <th className="border border-slate-300 p-2 text-left">NAMA PASANGAN CALON & KOALISI</th>
                          <th className="border border-slate-300 p-2 text-center w-32">JUMLAH SUARA</th>
                          <th className="border border-slate-300 p-2 text-left w-56">TERBILANG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.candidates.map((c) => (
                          <tr key={c.ballotNumber}>
                            <td className="border border-slate-300 p-2 text-center font-bold font-mono text-sm">{c.ballotNumber}</td>
                            <td className="border border-slate-300 p-2">
                              <p className="font-bold text-slate-900">{c.names}</p>
                              <p className="text-[10px] text-slate-500 font-semibold">{c.party}</p>
                            </td>
                            <td className="border border-slate-300 p-2 text-center font-black font-mono text-sm text-blue-900">{c.votes}</td>
                            <td className="border border-slate-300 p-2 italic uppercase text-[11px] font-semibold text-slate-700">"{c.voteInWords}"</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Table V: Suara Sah dan Tidak Sah */}
                  <div className="space-y-2 pt-2">
                    <h3 className="text-xs font-bold uppercase text-slate-800">V. DATA SUARA SAH DAN SUARA TIDAK SAH</h3>
                    <table className="w-full text-xs border-collapse border border-slate-300">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 font-bold">
                          <th className="border border-slate-300 p-2 text-left">URAIAN</th>
                          <th className="border border-slate-300 p-2 text-center w-32">JUMLAH</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-slate-300 p-2 font-semibold">A. JUMLAH SELURUH SUARA SAH</td>
                          <td className="border border-slate-300 p-2 text-center font-black font-mono text-sm">{previewData.totalValid}</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 p-2 font-semibold">B. JUMLAH SUARA TIDAK SAH (TIMEOUT / HANGUS)</td>
                          <td className="border border-slate-300 p-2 text-center font-black font-mono text-sm">{previewData.totalInvalid}</td>
                        </tr>
                        <tr className="bg-slate-100 font-bold">
                          <td className="border border-slate-300 p-2">C. JUMLAH SELURUH SUARA SAH DAN SUARA TIDAK SAH (A + B)</td>
                          <td className="border border-slate-300 p-2 text-center font-black font-mono text-sm text-blue-900">{previewData.totalVotes}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* 4. DAFTAR PPS, SAKSI, & PANWAS (HALAMAN 4 RESMI KPU) */}
                <section className="space-y-4 rounded-xl border border-slate-300 bg-white p-6 shadow-xs">
                  <h2 className="text-sm font-black uppercase text-slate-900 border-b pb-2 tracking-wide">
                    DAFTAR PPS, SAKSI, & PANWAS (PENGAWAS TPS)
                  </h2>
                  <table className="w-full text-xs border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold">
                        <th className="border border-slate-300 p-2 text-center w-12">NO.</th>
                        <th className="border border-slate-300 p-2 text-left">NAMA PETUGAS / SAKSI</th>
                        <th className="border border-slate-300 p-2 text-left">NIK</th>
                        <th className="border border-slate-300 p-2 text-left">NO. HANDPHONE</th>
                        <th className="border border-slate-300 p-2 text-left">PERAN / JABATAN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.officerList.map((off, index) => (
                        <tr key={index}>
                          <td className="border border-slate-300 p-2 text-center font-bold font-mono">{index + 1}</td>
                          <td className="border border-slate-300 p-2 font-bold text-slate-900">{off.name}</td>
                          <td className="border border-slate-300 p-2 font-mono text-slate-700">{off.nik}</td>
                          <td className="border border-slate-300 p-2 font-mono text-slate-700">{off.phone}</td>
                          <td className="border border-slate-300 p-2 font-semibold text-slate-800">{off.role}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>

                {/* 5. DAFTAR FILE & DIGITAL SIGNATURE + KEAMANAN DOKUMEN (HALAMAN 5 RESMI KPU) */}
                <section className="space-y-4 rounded-xl border border-slate-300 bg-white p-6 shadow-xs">
                  <h2 className="text-sm font-black uppercase text-slate-900 border-b pb-2 tracking-wide">
                    DAFTAR FILE & DIGITAL SIGNATURE
                  </h2>
                  <div className="space-y-3 text-xs font-mono">
                    {previewData.digitalSignatures.map((sig, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                        <p className="font-bold text-slate-900 font-sans">{idx + 1}. {sig.file}</p>
                        <p className="text-[11px] text-slate-600 break-all bg-white p-1.5 rounded border border-slate-300">{sig.hash1}</p>
                        <p className="text-[11px] text-slate-600 break-all bg-white p-1.5 rounded border border-slate-300">{sig.hash2}</p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t space-y-3">
                    <h3 className="text-xs font-bold uppercase text-slate-900">HALAMAN INFORMASI KEAMANAN DOKUMEN</h3>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                      <p className="font-bold text-slate-800 text-xs">Public Key Petugas:</p>
                      <p className="font-mono text-[11px] text-blue-900 select-all break-all bg-white p-2 rounded border border-slate-300">
                        {previewData.publicKey}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                      <p className="font-bold text-slate-800 text-xs">Hash Transaksi On-Chain (Blockchain):</p>
                      <p className="font-mono text-[11px] text-emerald-800 select-all break-all bg-white p-2 rounded border border-slate-300">
                        {previewData.blockchainTx}
                      </p>
                    </div>
                  </div>
                </section>

                {/* BLOCKCHAIN ACTION BUTTON (NO-PRINT) */}
                <div className="no-print pt-4 border-t flex justify-end">
                  {isFinalizationVisible && (
                    <div className="w-full sm:w-auto">
                      {tpsDetails?.status === 'BLOCKCHAIN_ANCHORED' ? (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-lg flex items-center gap-2.5">
                          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                          <span className="text-xs font-bold uppercase">Hasil TPS Terverifikasi On-Chain di Blockchain</span>
                        </div>
                      ) : (
                        <Button
                          onClick={handleAnchorToBlockchain}
                          disabled={anchoring || !isFinalizationActive}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 px-6 shadow-xs"
                        >
                          {anchoring ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Menambatkan ke Blockchain...
                            </>
                          ) : (
                            <>
                              <Shield className="h-4 w-4 mr-2" />
                              Tambatkan Hasil C.Hasil ke Blockchain
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}
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
