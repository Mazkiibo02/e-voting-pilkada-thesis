import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { Users, RotateCcw, Shield, Download, Upload, Trash, Edit, FileSpreadsheet } from 'lucide-react';

interface KppsManagementProps {
  selectedTpsCode?: string;
}

export const KppsManagement = ({ selectedTpsCode }: KppsManagementProps) => {
  const [kppsUsers, setKppsUsers] = useState<any[]>([]);
  const [tpsList, setTpsList] = useState<any[]>([]);
  const [selectedTpsId, setSelectedTpsId] = useState<string>("ALL");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [generatedAccounts, setGeneratedAccounts] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editUser, setEditUser] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchTps();
    fetchKppsUsers();
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

  const fetchKppsUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/kpps?t=${Date.now()}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setKppsUsers(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerate = async () => {
    if (!confirm("Apakah Anda yakin ingin generate otomatis akun KPPS untuk TPS yang belum memiliki akun?")) return;
    setIsGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/kpps/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        if (data.data && data.data.length > 0) {
          setGeneratedAccounts(data.data);
        }
        fetchKppsUsers();
      } else {
        toast.error(data.message || "Gagal generate akun KPPS");
      }
    } catch (e) {
      toast.error("Koneksi server gagal");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/kpps/template', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Gagal mengunduh template");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "Template_Import_Akun_KPPS.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Gagal mendownload template Excel KPPS");
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/kpps/export', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Gagal export akun KPPS");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "Data_Akun_KPPS.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Gagal mendownload data akun KPPS");
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
      const res = await fetch('/api/kpps/import', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        fetchKppsUsers();
      } else {
        toast.error(data.message || "Gagal import akun KPPS");
      }
    } catch (err) {
      toast.error("Koneksi server gagal");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus akun KPPS ini?")) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/kpps/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Akun KPPS berhasil dihapus");
        fetchKppsUsers();
      } else {
        toast.error("Gagal menghapus akun KPPS");
      }
    } catch (e) {
      toast.error("Koneksi server gagal");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/kpps/${editUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editUser)
      });
      if (res.ok) {
        toast.success("Akun KPPS berhasil diperbarui");
        setIsEditModalOpen(false);
        fetchKppsUsers();
      } else {
        const data = await res.json();
        toast.error(data.message || "Gagal memperbarui akun KPPS");
      }
    } catch (e) {
      toast.error("Koneksi server gagal");
    }
  };

  const filteredKpps = kppsUsers.filter(user => {
    if (!selectedTpsId || selectedTpsId === "ALL") return true;
    const selectedTpsObj = tpsList.find(t => t.id.toString() === selectedTpsId || t.tps_code === selectedTpsId);
    if (!selectedTpsObj) {
      return user.assigned_tps_id?.toString() === selectedTpsId || user.tps_code === selectedTpsId;
    }
    return user.assigned_tps_id === selectedTpsObj.id || user.tps_code === selectedTpsObj.tps_code;
  });

  return (
    <Card className="bg-white border-gray-200 shadow-sm mb-8">
      <CardHeader className="pb-3 border-b border-gray-100">
        <CardTitle className="text-lg font-bold text-slate-800 flex items-center">
          <Users className="w-5 h-5 mr-2 text-blue-600" /> Manajemen Akun KPPS
        </CardTitle>
        <CardDescription>
          Kelola akun petugas KPPS secara massal via Excel atau Auto-Generate.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="w-64">
            <Select value={selectedTpsId} onValueChange={setSelectedTpsId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih TPS" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua TPS</SelectItem>
                {tpsList.map(tps => (
                  <SelectItem key={tps.id} value={tps.id.toString()}>{tps.tps_code} - {tps.address}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button size="sm" variant="outline" className="font-semibold text-blue-600 border-blue-200 hover:bg-blue-50" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? <RotateCcw className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
            Auto-Generate Akun KPPS
          </Button>
          
          <div className="relative">
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImport}
            />
            {/* Import uses Download icon (Arrow Down) */}
            <Button size="sm" variant="outline" className="font-semibold text-green-600 border-green-200 hover:bg-green-50" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
              {isImporting ? <RotateCcw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Import via Excel
            </Button>
          </div>

          <Button size="sm" variant="outline" className="font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50" onClick={handleDownloadTemplate}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Download Template Excel
          </Button>

          {/* Export uses Upload icon (Arrow Up) */}
          <Button size="sm" variant="outline" className="font-semibold text-slate-600 border-slate-300 hover:bg-slate-100" onClick={handleExport}>
            <Upload className="mr-2 h-4 w-4" />
            Export Akun KPPS (Excel)
          </Button>
        </div>

        <div className="rounded-md border mt-4 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Nama Ketua KPPS</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>NIK (16 Digit)</TableHead>
                <TableHead>Lokasi TPS</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredKpps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-slate-500">
                    Belum ada data akun KPPS untuk TPS ini. Klik tombol "Auto-Generate Akun KPPS" atau "Import via Excel" untuk menambahkan.
                  </TableCell>
                </TableRow>
              ) : (
                filteredKpps.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-bold text-slate-900">{u.full_name || u.name}</TableCell>
                    <TableCell className="font-mono text-slate-600">{u.email}</TableCell>
                    <TableCell className="font-mono font-semibold text-blue-800">{u.nik || '-'}</TableCell>
                    <TableCell className="font-semibold">{u.tps_code} ({u.address || 'TPS'})</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-emerald-100 text-emerald-700">
                        {u.status || 'ACTIVE'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => { setEditUser(u); setIsEditModalOpen(true); }}>
                        <Edit className="h-4 w-4 text-slate-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(u.id)}>
                        <Trash className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Akun Ketua KPPS</DialogTitle>
          </DialogHeader>
          {editUser && (
            <form onSubmit={handleEditSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nama Ketua KPPS</Label>
                <Input value={editUser.full_name} onChange={e => setEditUser({...editUser, full_name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={editUser.email} onChange={e => setEditUser({...editUser, email: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>NIK (16 Digit)</Label>
                <Input value={editUser.nik || ''} onChange={e => setEditUser({...editUser, nik: e.target.value})} maxLength={16} />
              </div>
              <Button type="submit" className="w-full">Simpan Perubahan</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!generatedAccounts} onOpenChange={(open) => {
        if (!open) {
          setGeneratedAccounts(null);
          fetchKppsUsers();
        }
      }}>
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
                  <TableHead>TPS</TableHead>
                  <TableHead>Email (Username)</TableHead>
                  <TableHead>Password</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generatedAccounts?.map((acc, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-semibold">{acc.tps_code}</TableCell>
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
                  "TPS": acc.tps_code || "-",
                  "Email (Username)": acc.email,
                  "Password Asli": acc.password
                }));
                const worksheet = xlsx.utils.json_to_sheet(worksheetData);
                const workbook = xlsx.utils.book_new();
                xlsx.utils.book_append_sheet(workbook, worksheet, "Akun_KPPS_Baru");
                xlsx.writeFile(workbook, "Daftar_Akun_KPPS_Baru.xlsx");
              });
            }}>
              <Download className="w-4 h-4 mr-2" /> Export ke Excel
            </Button>
            <Button onClick={() => { setGeneratedAccounts(null); fetchKppsUsers(); }}>Tutup</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
