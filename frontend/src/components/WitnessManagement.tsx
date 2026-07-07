import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { Users, RotateCcw, Shield, Upload, Trash, Edit } from 'lucide-react';

export const WitnessManagement = () => {
  const [witnesses, setWitnesses] = useState<any[]>([]);
  const [tpsList, setTpsList] = useState<any[]>([]);
  const [selectedTpsId, setSelectedTpsId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editUser, setEditUser] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchTps();
    fetchWitnesses();
  }, []);

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
    if (!selectedTpsId) {
      toast.error("Pilih TPS terlebih dahulu");
      return;
    }
    if (!confirm("Apakah Anda yakin ingin generate 4 akun (3 Saksi, 1 Pengawas) untuk TPS ini?")) return;
    
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

  return (
    <Card className="bg-white border-gray-200 shadow-sm mb-8">
      <CardHeader className="pb-3 border-b border-gray-100">
        <CardTitle className="text-lg font-bold text-slate-800 flex items-center">
          <Users className="w-5 h-5 mr-2 text-indigo-600" /> Manajemen Akun Saksi & Pengawas
        </CardTitle>
        <CardDescription>
          Kelola akun Saksi dan Pengawas (Bawaslu) per TPS.
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
                {tpsList.map(tps => (
                  <SelectItem key={tps.id} value={tps.id.toString()}>{tps.tps_code} - {tps.address}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" variant="outline" className="font-semibold text-indigo-600 border-indigo-200 hover:bg-indigo-50" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? <RotateCcw className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
            Auto-Generate 4 Akun
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
              Import via Excel
            </Button>
          </div>
        </div>

        <div className="rounded-md border mt-4 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Afiliasi</TableHead>
                <TableHead>TPS</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {witnesses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-slate-500">Belum ada data saksi/pengawas.</TableCell>
                </TableRow>
              ) : (
                witnesses.map(w => (
                  <TableRow key={w.id}>
                    <TableCell>{w.full_name}</TableCell>
                    <TableCell>{w.email}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${w.role === 'PENGAWAS' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {w.role}
                      </span>
                    </TableCell>
                    <TableCell>{w.affiliation || '-'}</TableCell>
                    <TableCell>{w.tps_code}</TableCell>
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
    </Card>
  );
};
