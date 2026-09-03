import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { Users, RotateCcw, Shield, Upload, Download, Trash, Edit, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { formatTpsLabel } from '@/utils/tpsFormatter';

interface WitnessManagementProps {
  selectedTpsCode?: string;
}

export const WitnessManagement = ({ selectedTpsCode }: WitnessManagementProps) => {
  const [witnesses, setWitnesses] = useState<any[]>([]);
  const [tpsList, setTpsList] = useState<any[]>([]);
  const [selectedTpsId, setSelectedTpsId] = useState<string>("ALL");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [generatedAccounts, setGeneratedAccounts] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editUser, setEditUser] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    fetchTps();
    fetchWitnesses();
  }, []);

  // Sync local TPS selection with parent filter if provided
  useEffect(() => {
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
  }, [selectedTpsCode, tpsList]);

  const fetchTps = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/tps', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setTpsList(data.items || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWitnesses = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/witnesses', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setWitnesses(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTpsId || selectedTpsId === "ALL") {
      toast.error("Silakan pilih TPS terlebih dahulu");
      return;
    }
    
    if (!confirm("Apakah Anda yakin ingin generate otomatis akun Saksi untuk TPS ini?")) return;
    
    setIsGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/witnesses/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ tps_id: selectedTpsId })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        if (data.data && data.data.length > 0) {
          setGeneratedAccounts(data.data);
        }
        fetchWitnesses();
      } else {
        toast.error(data.message || "Gagal generate akun");
      }
    } catch (e) {
      toast.error("Koneksi server gagal");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    const formData = new FormData();
    formData.append('excelFile', file);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/witnesses/import', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        fetchWitnesses();
      } else {
        toast.error(data.message || "Gagal import akun");
      }
    } catch (err) {
      toast.error("Koneksi server gagal");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus akun ini?")) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/witnesses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Akun dihapus");
        fetchWitnesses();
      } else {
        toast.error("Gagal menghapus akun");
      }
    } catch (e) {
      toast.error("Koneksi server gagal");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/witnesses/${editUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editUser)
      });
      if (res.ok) {
        toast.success("Akun diperbarui");
        setIsEditModalOpen(false);
        fetchWitnesses();
      } else {
        const data = await res.json();
        toast.error(data.message || "Gagal memperbarui akun");
      }
    } catch (e) {
      toast.error("Koneksi server gagal");
    }
  };

  const filteredWitnesses = witnesses.filter(w => {
    if (!selectedTpsId || selectedTpsId === "ALL") return true;
    const selectedTpsObj = tpsList.find(t => t.id.toString() === selectedTpsId || t.tps_code === selectedTpsId);
    if (!selectedTpsObj) {
      return w.assigned_tps_id?.toString() === selectedTpsId || w.tps_code === selectedTpsId;
    }
    return w.assigned_tps_id === selectedTpsObj.id || w.tps_code === selectedTpsObj.tps_code;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTpsId, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredWitnesses.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredWitnesses.length);
  const paginatedWitnesses = filteredWitnesses.slice(startIndex, endIndex);

  return (
    <Card className="bg-white border-gray-200 shadow-sm mb-8">
      <CardHeader className="pb-3 border-b border-gray-100">
        <CardTitle className="text-lg font-bold text-slate-800 flex items-center">
          <Users className="w-5 h-5 mr-2 text-indigo-600" /> Manajemen Akun Saksi
        </CardTitle>
        <CardDescription>
          Kelola akun Saksi Paslon per TPS.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="w-64">
            <Select value={selectedTpsId} onValueChange={setSelectedTpsId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih TPS" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua TPS</SelectItem>
                {tpsList.map((tps, idx) => (
                  <SelectItem key={tps.id} value={tps.id.toString()}>{formatTpsLabel(tps.tps_number, tps.tps_code, tps.address, idx)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" variant="outline" className="font-semibold text-indigo-600 border-indigo-200 hover:bg-indigo-50" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? <RotateCcw className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
            Auto-Generate Akun Saksi
          </Button>
          
          <div className="relative">
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImport} 
            />
            <Button size="sm" variant="outline" className="font-semibold text-green-600 border-green-200 hover:bg-green-50" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
              {isImporting ? <RotateCcw className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Import Excel
            </Button>
          </div>

          <Button size="sm" variant="outline" className="font-semibold text-slate-600 border-slate-300 hover:bg-slate-100" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export Excel
          </Button>
        </div>

        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Nama Saksi</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Afiliasi Paslon</TableHead>
                <TableHead>TPS</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWitnesses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-slate-500">
                    Belum ada data akun Saksi. Klik tombol "Auto-Generate Akun Saksi" atau "Import Excel".
                  </TableCell>
                </TableRow>
              ) : (
                paginatedWitnesses.map((w, idx) => (
                  <TableRow key={w.id}>
                    <TableCell>{w.full_name}</TableCell>
                    <TableCell>{w.email}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                        {w.role}
                      </span>
                    </TableCell>
                    <TableCell>{w.affiliation || '-'}</TableCell>
                    <TableCell className="font-semibold">{formatTpsLabel(w.tps_number, w.tps_code, w.address, idx)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => { setEditUser(w); setIsEditModalOpen(true); }}>
                        <Edit className="h-4 w-4 text-slate-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(w.id)}>
                        <Trash className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer Controls */}
        {filteredWitnesses.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>Tampilkan:</span>
              <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="h-8 w-20 text-xs font-semibold bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span>baris • Menampilkan <strong>{filteredWitnesses.length > 0 ? startIndex + 1 : 0}</strong> - <strong>{endIndex}</strong> dari <strong>{filteredWitnesses.length}</strong> Akun Saksi</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs font-semibold"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                title="Halaman Pertama"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-semibold"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Sebelum
              </Button>

              <span className="px-3 py-1 font-bold text-slate-800 bg-slate-100 rounded border border-slate-200">
                Halaman {currentPage} dari {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-semibold"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Berikut <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs font-semibold"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                title="Halaman Terakhir"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Akun</DialogTitle>
          </DialogHeader>
          {editUser && (
            <form onSubmit={handleEditSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nama</Label>
                <Input value={editUser.full_name} onChange={e => setEditUser({...editUser, full_name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={editUser.email} onChange={e => setEditUser({...editUser, email: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Afiliasi</Label>
                <Input value={editUser.affiliation || ''} onChange={e => setEditUser({...editUser, affiliation: e.target.value})} />
              </div>
              <Button type="submit" className="w-full">Simpan Perubahan</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!generatedAccounts} onOpenChange={() => setGeneratedAccounts(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center text-emerald-700">
              <Shield className="w-5 h-5 mr-2" /> Akun Berhasil Dibuat
            </DialogTitle>
            <p className="text-sm text-slate-500 font-semibold bg-amber-50 p-3 rounded border border-amber-200">
              ⚠️ PENTING: Harap catat atau salin informasi login di bawah ini. Password tidak akan ditampilkan lagi setelah jendela ini ditutup demi keamanan.
            </p>
          </DialogHeader>
          
          <div className="overflow-x-auto mt-4 border rounded-md">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email (Username)</TableHead>
                  <TableHead>Password</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generatedAccounts?.map((acc, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-semibold">{acc.fullName || acc.name}</TableCell>
                    <TableCell className="font-mono text-sm text-blue-700">{acc.email}</TableCell>
                    <TableCell className="font-mono text-sm font-bold bg-slate-100">{acc.password}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-semibold" onClick={() => {
              import('xlsx').then(xlsx => {
                const worksheetData = generatedAccounts!.map(acc => ({
                  "TPS": acc.tpsCode || acc.tps_code || "-",
                  "Nama Lengkap": acc.fullName || acc.name || "-",
                  "Email (Username)": acc.email,
                  "Role": acc.role,
                  "Password Asli": acc.password
                }));
                const worksheet = xlsx.utils.json_to_sheet(worksheetData);
                const workbook = xlsx.utils.book_new();
                xlsx.utils.book_append_sheet(workbook, worksheet, "Akun_Saksi_Baru");
                xlsx.writeFile(workbook, "Daftar_Akun_Saksi_Baru.xlsx");
              });
            }}>
              <Download className="w-4 h-4 mr-2" /> Export ke Excel
            </Button>
            <Button onClick={() => setGeneratedAccounts(null)}>Tutup</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
