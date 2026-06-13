import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowDown, FileDown, FileText, ImageIcon, Shield, Upload, XCircle } from 'lucide-react';
import { getCandidates, getStatisticsByTps, getTpsList, type Candidate } from '@/lib/storage';
import { toast } from 'sonner';

const PREVIEW_TPS = 'TPS 01';

const bytesToReadable = (value: number) => {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
};

const ChasilPreview = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [uploadConfirmed, setUploadConfirmed] = useState(false);

  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin');
    if (!isAdmin) {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const stats = getStatisticsByTps(PREVIEW_TPS);
  const candidates = getCandidates();

  const previewData = useMemo(() => {
    const totalRegistered = stats.totalRegistered || 120;
    const totalValidVotes = stats.totalVotes;
    const totalVerifiedVotes = Math.max(totalValidVotes + 8, Math.min(totalRegistered, totalValidVotes + 20));
    const totalInvalidVotes = Math.max(0, totalVerifiedVotes - totalValidVotes);
    const totalVotes = totalValidVotes + totalInvalidVotes;

    return {
      electionName: 'Pilkada Kabupaten Krandon 2025',
      electionType: 'Pilkada',
      region: {
        province: 'Jawa Tengah',
        city: 'Kota Krandon',
        district: 'Kecamatan Sumber',
        village: 'Desa Krandon',
      },
      votingDate: '12 Juni 2025',
      tpsNumber: PREVIEW_TPS,
      tpsCode: 'KR-01-2025',
      officerName: 'Ketua KPPS: Siti Nurhayati',
      votingStart: '07:00',
      votingEnd: '13:00',
      countingStart: '13:15',
      countingEnd: '15:00',
      documentId: 'CHASIL-KWK-2025-TPS01',
      documentHash: '0xHASH-PLACEHOLDER-2025',
      blockchainTx: '0xTRANSACTION-PLACEHOLDER-ABC123',
      totalRegistered,
      totalVerified: totalVerifiedVotes,
      totalValid: totalValidVotes,
      totalInvalid: totalInvalidVotes,
      totalVotes,
      candidates: candidates.map((candidate, index) => ({
        ballotNumber: index + 1,
        names: candidate.name,
        party: index === 0 ? 'Partai Bersatu' : index === 1 ? 'Koalisi Maju' : 'Koalisi Rakyat',
        votes: stats.candidates.find((item: any) => item.id === candidate.id)?.votes ?? 0,
      })),
    };
  }, [candidates, stats]);

  const handlePrint = () => {
    window.print();
  };


  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUploadConfirmed(false);
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

  const handleConfirmUpload = () => {
    if (!selectedFile) {
      toast.error('Pilih file terlebih dahulu sebelum konfirmasi upload.');
      return;
    }
    setUploadConfirmed(true);
    toast.success('Simulasi upload berhasil. Backend upload belum diimplementasikan.');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="no-print bg-primary text-primary-foreground shadow-md">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Preview Dokumen C.Hasil-KWK</h1>
            <p className="text-sm opacity-90">Pratinjau form TPS sebelum download dan file tanda tangan sebelum upload.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" size="sm" onClick={() => navigate('/admin')}>
              Kembali ke Dashboard
            </Button>
            <Button size="sm" onClick={handlePrint}>
              <FileDown className="mr-2 h-4 w-4" />
              Cetak / Simpan PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <Card className="printable-area">
          <CardHeader>
            <CardTitle>Pratinjau C.Hasil-KWK-inspired TPS Result Form</CardTitle>
            <CardDescription>
              Form ini menggunakan data lokal dan placeholder untuk demo akademis. Bukan dokumen resmi KPU.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
              <div className="space-y-6">
                <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Nama Pemilihan</p>
                      <h2 className="text-xl font-semibold">{previewData.electionName}</h2>
                    </div>
                    <Badge variant="outline">{previewData.electionType}</Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Wilayah</p>
                      <p>{previewData.region.province} / {previewData.region.city}</p>
                      <p>{previewData.region.district} / {previewData.region.village}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Tanggal Pemungutan</p>
                      <p>{previewData.votingDate}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">TPS</p>
                      <p>{previewData.tpsNumber} / {previewData.tpsCode}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Ketua KPPS</p>
                      <p>{previewData.officerName}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Waktu Pemungutan</p>
                      <p>{previewData.votingStart} - {previewData.votingEnd}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Waktu Penghitungan</p>
                      <p>{previewData.countingStart} - {previewData.countingEnd}</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-6">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">Ringkasan Partisipasi</Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase text-muted-foreground">Terdaftar</p>
                      <p className="mt-2 text-2xl font-semibold">{previewData.totalRegistered}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase text-muted-foreground">Terverifikasi</p>
                      <p className="mt-2 text-2xl font-semibold">{previewData.totalVerified}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase text-muted-foreground">Suara Sah</p>
                      <p className="mt-2 text-2xl font-semibold">{previewData.totalValid}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase text-muted-foreground">Suara Tidak Sah</p>
                      <p className="mt-2 text-2xl font-semibold">{previewData.totalInvalid}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase text-muted-foreground">Total Suara</p>
                      <p className="mt-2 text-2xl font-semibold">{previewData.totalVotes}</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Hasil Pasangan Calon</p>
                      <p className="text-xs text-muted-foreground">Data yang ditampilkan berdasarkan mock lokal.</p>
                    </div>
                    <Badge variant="outline">{previewData.candidates.length} Pasangan</Badge>
                  </div>
                  <div className="divide-y divide-slate-200">
                    {previewData.candidates.map((row) => (
                      <div key={row.ballotNumber} className="space-y-2 py-4">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-sm font-semibold">No {row.ballotNumber}: {row.names}</p>
                          <Badge variant="secondary">{row.party}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Suara: {row.votes}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <Card className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Integritas Dokumen</CardTitle>
                    <CardDescription>Placeholder untuk elemen keamanan TPS.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase text-muted-foreground">ID Dokumen</p>
                      <p className="mt-2 font-medium">{previewData.documentId}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase text-muted-foreground">QR Placeholder</p>
                      <div className="mt-4 flex h-32 items-center justify-center rounded-lg bg-white text-sm text-muted-foreground">
                        QR Code Preview
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase text-muted-foreground">Hash Dokumen</p>
                      <p className="mt-2 font-mono text-sm">{previewData.documentHash}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase text-muted-foreground">Hash Transaksi Blockchain</p>
                      <p className="mt-2 font-mono text-sm">{previewData.blockchainTx}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Tanda Tangan</CardTitle>
                    <CardDescription>Area tanda tangan KPPS dan saksi.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid gap-4">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs uppercase text-muted-foreground">KPPS Ketua</p>
                        <div className="mt-6 h-16 rounded-lg border border-dashed border-slate-300 bg-white" />
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs uppercase text-muted-foreground">Saksi 1</p>
                        <div className="mt-6 h-16 rounded-lg border border-dashed border-slate-300 bg-white" />
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs uppercase text-muted-foreground">Saksi 2</p>
                        <div className="mt-6 h-16 rounded-lg border border-dashed border-slate-300 bg-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="no-print">
          <CardHeader>
            <CardTitle>Pratinjau File Tanda Tangan Sebelum Upload</CardTitle>
            <CardDescription>Simulasi seleksi file PDF atau gambar sebelum mengonfirmasi upload.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Pilih File Tanda Tangan
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFileSelection}
                  />
                  {selectedFile && (
                    <Badge variant="secondary">{selectedFile.name}</Badge>
                  )}
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium">Status File</p>
                  <p className="mt-2 text-sm text-slate-700">
                    {selectedFile ? 'File siap dipratinjau. Klik Konfirmasi Upload setelah memeriksa isi file.' : 'Belum ada file dipilih.'}
                  </p>
                  {uploadConfirmed && (
                    <p className="mt-2 text-sm text-green-700">Simulasi upload berhasil. File tidak benar-benar diunggah.</p>
                  )}
                </div>
                {previewError && (
                  <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive-foreground">
                    {previewError}
                  </div>
                )}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" /> Metadata File
                  </div>
                  {selectedFile ? (
                    <div className="space-y-2 text-sm text-slate-700">
                      <p><span className="font-medium">Nama file:</span> {selectedFile.name}</p>
                      <p><span className="font-medium">Tipe file:</span> {selectedFile.type || 'Tidak diketahui'}</p>
                      <p><span className="font-medium">Ukuran file:</span> {bytesToReadable(selectedFile.size)}</p>
                      <p><span className="font-medium">Status:</span> {uploadConfirmed ? 'Telah dikonfirmasi' : 'Belum diunggah'}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Tidak ada file yang dipilih.</p>
                  )}
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-medium">Catatan Pratinjau</p>
                  <p className="text-sm leading-6 text-slate-600">
                    Pratinjau hanya membantu memverifikasi file secara visual. Hashing dapat memverifikasi integritas setelah upload, tetapi tidak dapat membuktikan file tidak dimanipulasi sebelum upload.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleConfirmUpload} disabled={!selectedFile || uploadConfirmed}>
                    <ArrowDown className="mr-2 h-4 w-4" />
                    Konfirmasi Upload
                  </Button>
                  <Button variant="secondary" onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setPreviewError(null);
                    setUploadConfirmed(false);
                  }}>
                    <XCircle className="mr-2 h-4 w-4" />
                    Hapus Pilihan
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-4 text-sm font-medium">Pratinjau File</p>
                {selectedFile && previewUrl ? (
                  selectedFile.type === 'application/pdf' ? (
                    <object data={previewUrl} type="application/pdf" className="h-[360px] w-full rounded-lg border bg-white">
                      <p className="p-6 text-sm text-slate-500">Pratinjau PDF tidak tersedia dalam browser ini. Silakan periksa file secara manual setelah diunduh.</p>
                    </object>
                  ) : (
                    <img src={previewUrl} alt="Pratinjau file tanda tangan" className="h-[360px] w-full rounded-lg object-contain bg-white" />
                  )
                ) : (
                  <div className="flex h-[360px] w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-center text-sm text-slate-500">
                    Pilih file PDF/JPG/JPEG/PNG untuk melihat pratinjau di sini.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ChasilPreview;
