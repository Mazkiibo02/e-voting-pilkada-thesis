import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { UserCheck, Search, Plus, Download, Upload, RotateCcw, Trash, Edit, CheckCircle2, Clock, Users, FileSpreadsheet } from 'lucide-react';
import { formatTpsLabel } from '@/utils/tpsFormatter';

interface VoterManagementProps {
  selectedTpsCode?: string;
  userRole?: string;
  userAssignedTpsId?: number | null;
  readOnly?: boolean;
}

export const VoterManagement = ({ selectedTpsCode, userRole, userAssignedTpsId, readOnly }: VoterManagementProps) => {
  const isReadOnly = readOnly || userRole === 'KPPS_OPERATOR';
  const [voters, setVoters] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, voted: 0, registered: 0, percentage: 0 });
  const [tpsList, setTpsList] = useState<any[]>([]);
  const [selectedTpsId, setSelectedTpsId] = useState<string>("ALL");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoter, setEditingVoter] = useState<any>(null);
  const [form, setForm] = useState({
    id: null as number | null,
    tps_id: '',
    dpt_number: '',
    full_name: '',
    address: '',
    gender: 'M',
    is_disability: false,
    nik: ''
  });

  useEffect(() => {
    fetchTps();
  }, []);

  useEffect(() => {
    if ((userRole === 'KPPS' || userRole === 'KPPS_OPERATOR') && userAssignedTpsId) {
      setSelectedTpsId(userAssignedTpsId.toString());
      return;
    }

    if (selectedTpsCode && selectedTpsCode !== "ALL") {
      const matched = tpsList.find(t => t.tps_code === selectedTpsCode || t.id.toString() === selectedTpsCode);
      if (matched) {
        setSelectedTpsId(matched.id.toString());
      } else {
        setSelectedTpsId(selectedTpsCode);
      }
    } else if (selectedTpsCode === "ALL") {
      setSelectedTpsId("ALL");
    }
  }, [selectedTpsCode, tpsList, userRole, userAssignedTpsId]);

  useEffect(() => {
    fetchVoters();
  }, [selectedTpsId, searchQuery, statusFilter]);

  const fetchTps = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/tps', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTpsList(data.items || []);
      }
    } catch (e) {
      console.error("Failed to fetch TPS list", e);
    }
  };

  const fetchVoters = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (selectedTpsId && selectedTpsId !== "ALL") params.append("tps_id", selectedTpsId);
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter && statusFilter !== "ALL") params.append("status", statusFilter);

      const res = await fetch(`/api/voters?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setVoters(data.items || []);
        setStats(data.stats || { total: 0, voted: 0, registered: 0, percentage: 0 });
      }
    } catch (e) {
      console.error("Failed to fetch voters", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAdd = () => {
    let defaultTps = selectedTpsId !== "ALL" ? selectedTpsId : (userAssignedTpsId ? userAssignedTpsId.toString() : (tpsList[0]?.id?.toString() || ''));
    setEditingVoter(null);
    setForm({
      id: null,
      tps_id: defaultTps,
      dpt_number: '',
      full_name: '',
      address: '',
      gender: 'M',
      is_disability: false,
      nik: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (voter: any) => {
    setEditingVoter(voter);
    setForm({
      id: voter.id,
      tps_id: voter.tps_id.toString(),
      dpt_number: voter.dpt_number || '',
      full_name: voter.full_name || '',
      address: voter.address || '',
      gender: voter.gender || 'M',
      is_disability: voter.is_disability === 1,
      nik: voter.nik_masked || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      toast.error("Nama pemilih wajib diisi.");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = editingVoter ? `/api/voters/${editingVoter.id}` : '/api/voters';
      const method = editingVoter ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(form)
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setIsModalOpen(false);
        fetchVoters();
      } else {
        toast.error(data.message || "Gagal menyimpan data pemilih");
      }
    } catch (e) {
      toast.error("Koneksi server gagal");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data pemilih "${name}"?`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/voters/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Pemilih DPT berhasil dihapus.");
        fetchVoters();
      } else {
        toast.error("Gagal menghapus pemilih.");
      }
    } catch (e) {
      toast.error("Koneksi server gagal");
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let targetTps = selectedTpsId !== "ALL" ? selectedTpsId : (userAssignedTpsId ? userAssignedTpsId.toString() : (tpsList[0]?.id?.toString() || ''));
    if (!targetTps) {
      toast.error("Silakan pilih TPS terlebih dahulu sebelum meng-import Excel.");
      return;
    }

    setIsImporting(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("tps_id", targetTps);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/voters/import', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        fetchVoters();
      } else {
        toast.error(data.message || "Gagal meng-import data DPT.");
      }
    } catch (err) {
      toast.error("Koneksi server gagal");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownloadTemplate = () => {
    window.open('/api/voters/template', '_blank');
  };

  const handleExportExcel = () => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    if (selectedTpsId && selectedTpsId !== "ALL") params.append("tps_id", selectedTpsId);
    window.open(`/api/voters/export?${params.toString()}&token=${token}`, '_blank');
  };

  return (
    <Card className="bg-white border-gray-200 shadow-sm mb-8">
      <CardHeader className="pb-3 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center">
            <UserCheck className="w-5 h-5 mr-2 text-blue-600" /> {isReadOnly ? "Daftar Pemilih Tetap TPS (DPT Viewer)" : "Manajemen Daftar Pemilih Tetap (DPT TPS)"}
          </CardTitle>
          <CardDescription>
            {isReadOnly
              ? "Pantau status kehadiran dan Auto-Checklist pemilih TPS secara real-time."
              : "Kelola data pemilih per TPS, verifikasi kehadiran, dan pantau status Auto-Checklist bilik suara."}
          </CardDescription>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isReadOnly && (
            <>
              <Button size="sm" variant="outline" className="font-semibold text-blue-600 border-blue-200 hover:bg-blue-50" onClick={handleDownloadTemplate}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> Template Excel
              </Button>
              
              <div className="relative">
                <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleImportExcel} />
                <Button size="sm" variant="outline" className="font-semibold text-green-600 border-green-200 hover:bg-green-50" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
                  {isImporting ? <RotateCcw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />}
                  Import Excel DPT
                </Button>
              </div>

              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs" onClick={handleOpenAdd}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Tambah Pemilih DPT
              </Button>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Attendance Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-100 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Total DPT Terdaftar</p>
              <p className="text-xl font-bold text-blue-950 mt-0.5">{stats.total} <span className="text-xs font-normal text-blue-700">Pemilih</span></p>
            </div>
            <Users className="w-7 h-7 text-blue-400 opacity-80" />
          </div>

          <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Sudah Memilih ✅</p>
              <p className="text-xl font-bold text-emerald-950 mt-0.5">{stats.voted} <span className="text-xs font-normal text-emerald-700">Pemilih</span></p>
            </div>
            <CheckCircle2 className="w-7 h-7 text-emerald-500 opacity-80" />
          </div>

          <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-100 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Belum Memilih ⚪</p>
              <p className="text-xl font-bold text-amber-950 mt-0.5">{stats.registered} <span className="text-xs font-normal text-amber-700">Pemilih</span></p>
            </div>
            <Clock className="w-7 h-7 text-amber-500 opacity-80" />
          </div>

          <div className="p-3 rounded-lg bg-purple-50/70 border border-purple-100 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-purple-600">Persentase Kehadiran</p>
              <p className="text-xl font-bold text-purple-950 mt-0.5">{stats.percentage}% <span className="text-xs font-normal text-purple-700">Partisipasi</span></p>
            </div>
            <div className="w-7 h-7 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center font-bold text-xs">
              %
            </div>
          </div>
        </div>

        {/* Controls & Filter */}
        <div className="flex flex-wrap gap-3 items-center justify-between pt-1">
          <div className="flex flex-wrap gap-2 items-center flex-1 min-w-[280px]">
            {/* TPS Select */}
            <div className="w-56">
              <Select value={selectedTpsId} onValueChange={setSelectedTpsId} disabled={userRole === 'KPPS'}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih TPS" />
                </SelectTrigger>
                <SelectContent>
                  {userRole !== 'KPPS' && <SelectItem value="ALL">Semua TPS</SelectItem>}
                  {tpsList
                    .filter(tps => userRole !== 'KPPS' || !userAssignedTpsId || tps.id === userAssignedTpsId)
                    .map((tps, idx) => (
                      <SelectItem key={tps.id} value={tps.id.toString()}>{formatTpsLabel(tps.tps_number, tps.tps_code, tps.address, idx)}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cari Nama Pemilih, Alamat, atau No. DPT..."
                className="pl-9 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <div className="w-40">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Status</SelectItem>
                  <SelectItem value="REGISTERED">Belum Memilih</SelectItem>
                  <SelectItem value="VOTED">Sudah Memilih</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button size="sm" variant="outline" className="font-semibold text-slate-600 border-slate-300 hover:bg-slate-100" onClick={handleExportExcel}>
            <Upload className="mr-1.5 h-3.5 w-3.5" /> Export Excel
          </Button>
        </div>

        {/* Table */}
        <div className="border border-slate-200 rounded-md overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-16 font-bold text-center">No. DPT</TableHead>
                <TableHead className="font-bold">Nama Lengkap Pemilih</TableHead>
                <TableHead className="font-bold">Alamat KTP</TableHead>
                <TableHead className="w-20 font-bold text-center">L / P</TableHead>
                <TableHead className="w-24 font-bold text-center">Disabilitas</TableHead>
                <TableHead className="w-36 font-bold text-center">NIK (Masked)</TableHead>
                <TableHead className="w-36 font-bold text-center">TPS</TableHead>
                <TableHead className="w-36 font-bold text-center">Status Hak Pilih</TableHead>
                {!isReadOnly && <TableHead className="w-24 font-bold text-center">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={isReadOnly ? 8 : 9} className="text-center py-8 text-slate-500">
                    <RotateCcw className="w-5 h-5 animate-spin inline mr-2 text-blue-600" /> Memuat data DPT pemilih...
                  </TableCell>
                </TableRow>
              ) : voters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isReadOnly ? 8 : 9} className="text-center py-8 text-slate-500">
                    Belum ada data DPT pemilih terdaftar.
                  </TableCell>
                </TableRow>
              ) : (
                voters.map((voter) => (
                  <TableRow key={voter.id} className={voter.status === 'VOTED' ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'hover:bg-slate-50'}>
                    <TableCell className="text-center font-mono font-bold text-slate-700">
                      {voter.dpt_number || '-'}
                    </TableCell>
                    <TableCell className="font-bold text-slate-900">
                      {voter.full_name}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {voter.address || '-'}
                    </TableCell>
                    <TableCell className="text-center font-bold text-xs">
                      {voter.gender === 'F' ? (
                        <span className="text-pink-600 bg-pink-50 px-2 py-0.5 rounded border border-pink-100">P</span>
                      ) : (
                        <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">L</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      {voter.is_disability ? (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Ya</Badge>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs text-slate-600">
                      {voter.nik_masked || '-'}
                    </TableCell>
                    <TableCell className="text-center text-xs font-bold text-blue-700">
                      {voter.tps_code}
                    </TableCell>
                    <TableCell className="text-center">
                      {voter.status === 'VOTED' ? (
                        <div className="flex flex-col items-center">
                          <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1 font-bold">
                            <CheckCircle2 className="w-3 h-3" /> Sudah Memilih
                          </Badge>
                          {voter.voted_at && (
                            <span className="text-[10px] text-emerald-800 font-mono mt-0.5">
                              {new Date(voter.voted_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                            </span>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-300">
                          Belum Memilih
                        </Badge>
                      )}
                    </TableCell>
                    {!isReadOnly && (
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-600 hover:text-blue-600" onClick={() => handleOpenEdit(voter)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-600 hover:text-red-600" onClick={() => handleDelete(voter.id, voter.full_name)}>
                            <Trash className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Add / Edit Voter Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingVoter ? 'Edit Data Pemilih DPT' : 'Tambah Pemilih DPT Baru'}</DialogTitle>
            <DialogDescription>
              Pastikan nama dan alamat sesuai dengan dokumen identitas resmi KTP-el.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {userRole !== 'KPPS' && (
              <div className="space-y-1.5">
                <Label htmlFor="tps_id">TPS *</Label>
                <Select value={form.tps_id} onValueChange={(val) => setForm(prev => ({ ...prev, tps_id: val }))}>
                  <SelectTrigger id="tps_id">
                    <SelectValue placeholder="Pilih TPS" />
                  </SelectTrigger>
                  <SelectContent>
                    {tpsList.map((tps, idx) => (
                      <SelectItem key={tps.id} value={tps.id.toString()}>{formatTpsLabel(tps.tps_number, tps.tps_code, tps.address, idx)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dpt_number">No. DPT (Opsional)</Label>
                <Input
                  id="dpt_number"
                  placeholder="e.g. 001"
                  value={form.dpt_number}
                  onChange={(e) => setForm(prev => ({ ...prev, dpt_number: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gender">Jenis Kelamin *</Label>
                <Select value={form.gender} onValueChange={(val) => setForm(prev => ({ ...prev, gender: val }))}>
                  <SelectTrigger id="gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Laki-laki (L)</SelectItem>
                    <SelectItem value="F">Perempuan (P)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="full_name">Nama Lengkap sesuai KTP *</Label>
              <Input
                id="full_name"
                placeholder="e.g. Budi Santoso"
                value={form.full_name}
                onChange={(e) => setForm(prev => ({ ...prev, full_name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">Alamat KTP (Detail RT/RW / No. Rumah) *</Label>
              <Input
                id="address"
                placeholder="e.g. Jl. Melati No. 5, RT 01/RW 02"
                value={form.address}
                onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nik">NIK (Opsional - Otomatis di-masking demi UU PDP)</Label>
              <Input
                id="nik"
                placeholder="e.g. 3328011508950003"
                value={form.nik}
                onChange={(e) => setForm(prev => ({ ...prev, nik: e.target.value }))}
              />
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="is_disability"
                checked={form.is_disability}
                onChange={(e) => setForm(prev => ({ ...prev, is_disability: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="is_disability" className="text-xs font-semibold cursor-pointer">
                Penyandang Disabilitas (Memerlukan Aksesibilitas Khusus)
              </Label>
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              Simpan Data Pemilih DPT
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
