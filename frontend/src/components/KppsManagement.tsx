import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { Users, RotateCcw, Shield, Download, Upload, Trash, Edit, FileSpreadsheet, UserPlus, Monitor } from 'lucide-react';

interface KppsManagementProps {
  selectedTpsCode?: string;
  userRole?: string;
  userAssignedTpsId?: number | null;
}

export const KppsManagement = ({ selectedTpsCode, userRole, userAssignedTpsId }: KppsManagementProps) => {
  const [activeTab, setActiveTab] = useState<'KETUA' | 'MEMBERS' | 'OPERATORS'>('KETUA');

  // Main data states
  const [kppsUsers, setKppsUsers] = useState<any[]>([]);
  const [kppsMembers, setKppsMembers] = useState<any[]>([]);
  const [operatorUsers, setOperatorUsers] = useState<any[]>([]);
  const [tpsList, setTpsList] = useState<any[]>([]);
  const [selectedTpsId, setSelectedTpsId] = useState<string>("ALL");

  // Loading states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingOp, setIsGeneratingOp] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [generatedAccounts, setGeneratedAccounts] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit / Add Member Modal States
  const [editUser, setEditUser] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [memberForm, setMemberForm] = useState({
    id: null as number | null,
    tps_id: '',
    full_name: '',
    nik: '',
    position: 'KPPS 2 (Operator DPT)',
    phone: ''
  });

  useEffect(() => {
    fetchTps();
    fetchKppsUsers();
    fetchKppsMembers();
    fetchOperatorUsers();
  }, []);

  // Sync local TPS selection with parent filter or user assigned TPS
  useEffect(() => {
    if (userRole === 'KPPS' && userAssignedTpsId) {
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

  const fetchKppsMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/kpps/members?t=${Date.now()}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setKppsMembers(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOperatorUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/kpps/operators?t=${Date.now()}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setOperatorUsers(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // 1. Generate Ketua KPPS Accounts
  const handleGenerate = async () => {
    if (!confirm("Apakah Anda yakin ingin generate otomatis akun Ketua KPPS untuk TPS yang belum memiliki akun?")) return;
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

  // 2. Generate Operator Bilik Accounts
  const handleGenerateOperators = async () => {
    if (!confirm("Apakah Anda yakin ingin generate otomatis 2 akun Operator Bilik Suara per TPS?")) return;
    setIsGeneratingOp(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/kpps/operators/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ tps_id: selectedTpsId !== 'ALL' ? selectedTpsId : null })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        if (data.data && data.data.length > 0) {
          setGeneratedAccounts(data.data);
        }
        fetchOperatorUsers();
      } else {
        toast.error(data.message || "Gagal generate akun Operator Bilik");
      }
    } catch (e) {
      toast.error("Koneksi server gagal");
    } finally {
      setIsGeneratingOp(false);
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
        fetchOperatorUsers();
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

  // Member CRUD handlers
  const handleOpenAddMember = () => {
    let defaultTps = selectedTpsId !== "ALL" ? selectedTpsId : (userAssignedTpsId ? userAssignedTpsId.toString() : (tpsList[0]?.id?.toString() || ''));
    setMemberForm({
      id: null,
      tps_id: defaultTps,
      full_name: '',
      nik: '',
      position: 'KPPS 2 (Operator DPT)',
      phone: ''
    });
    setIsMemberModalOpen(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const isEdit = !!memberForm.id;
      const url = isEdit ? `/api/kpps/members/${memberForm.id}` : '/api/kpps/members';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(memberForm)
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setIsMemberModalOpen(false);
        fetchKppsMembers();
      } else {
        toast.error(data.message || "Gagal menyimpan data anggota KPPS");
      }
    } catch (e) {
      toast.error("Koneksi server gagal");
    }
  };

  const handleDeleteMember = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data anggota KPPS ini?")) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/kpps/members/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Anggota KPPS berhasil dihapus");
        fetchKppsMembers();
      } else {
        toast.error("Gagal menghapus anggota KPPS");
      }
    } catch (e) {
      toast.error("Koneksi server gagal");
    }
  };

  // Filtering
  const filteredKpps = kppsUsers.filter(user => {
    if (!selectedTpsId || selectedTpsId === "ALL") return true;
    const selectedTpsObj = tpsList.find(t => t.id.toString() === selectedTpsId || t.tps_code === selectedTpsId);
    if (!selectedTpsObj) {
      return user.assigned_tps_id?.toString() === selectedTpsId || user.tps_code === selectedTpsId;
    }
    return user.assigned_tps_id === selectedTpsObj.id || user.tps_code === selectedTpsObj.tps_code;
  });

  const filteredMembers = kppsMembers.filter(m => {
    if (!selectedTpsId || selectedTpsId === "ALL") return true;
    return m.tps_id?.toString() === selectedTpsId || m.tps_code === selectedTpsId;
  });

  const filteredOperators = operatorUsers.filter(u => {
    if (!selectedTpsId || selectedTpsId === "ALL") return true;
    return u.assigned_tps_id?.toString() === selectedTpsId || u.tps_code === selectedTpsId;
  });

  return (
    <Card className="bg-white border-gray-200 shadow-sm mb-8">
      <CardHeader className="pb-3 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-600" /> Manajemen Penyelenggara TPS (KPPS)
          </CardTitle>
          <CardDescription>
            Kelola Ketua KPPS, Anggota KPPS 2-5 (C.Hasil), dan Kredensial Operator Bilik Suara.
          </CardDescription>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
          <button
            onClick={() => setActiveTab('KETUA')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              activeTab === 'KETUA' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ketua KPPS
          </button>
          <button
            onClick={() => setActiveTab('MEMBERS')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              activeTab === 'MEMBERS' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Anggota KPPS (2-5)
          </button>
          <button
            onClick={() => setActiveTab('OPERATORS')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              activeTab === 'OPERATORS' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Operator Bilik (`KPPS_OPERATOR`)
          </button>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Top Controls */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="w-64">
            <Select value={selectedTpsId} onValueChange={setSelectedTpsId} disabled={userRole === 'KPPS'}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih TPS" />
              </SelectTrigger>
              <SelectContent>
                {userRole !== 'KPPS' && <SelectItem value="ALL">Semua TPS</SelectItem>}
                {tpsList
                  .filter(tps => userRole !== 'KPPS' || !userAssignedTpsId || tps.id === userAssignedTpsId)
                  .map(tps => (
                    <SelectItem key={tps.id} value={tps.id.toString()}>{tps.tps_code} - {tps.address}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {activeTab === 'KETUA' && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="font-semibold text-blue-600 border-blue-200 hover:bg-blue-50" onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? <RotateCcw className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                Auto-Generate Ketua KPPS
              </Button>
              
              <div className="relative">
                <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleImport} />
                <Button size="sm" variant="outline" className="font-semibold text-green-600 border-green-200 hover:bg-green-50" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
                  {isImporting ? <RotateCcw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Import Excel
                </Button>
              </div>

              <Button size="sm" variant="outline" className="font-semibold text-slate-600 border-slate-300 hover:bg-slate-100" onClick={handleExport}>
                <Upload className="mr-2 h-4 w-4" /> Export Excel
              </Button>
            </div>
          )}

          {activeTab === 'MEMBERS' && (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs" onClick={handleOpenAddMember}>
              <UserPlus className="mr-2 h-4 w-4" /> Tambah Anggota KPPS (2-5)
            </Button>
          )}

          {activeTab === 'OPERATORS' && (
            <Button size="sm" variant="outline" className="font-semibold text-blue-600 border-blue-200 hover:bg-blue-50" onClick={handleGenerateOperators} disabled={isGeneratingOp}>
              {isGeneratingOp ? <RotateCcw className="mr-2 h-4 w-4 animate-spin" /> : <Monitor className="mr-2 h-4 w-4" />}
              Auto-Generate 2 Operator Bilik / TPS
            </Button>
          )}
        </div>

        {/* TAB 1: KETUA KPPS */}
        {activeTab === 'KETUA' && (
          <div className="rounded-md border mt-4 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Nama Ketua KPPS</TableHead>
                  <TableHead>Email (Username Login)</TableHead>
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
                      Belum ada data akun Ketua KPPS. Klik "Auto-Generate Ketua KPPS" untuk menambahkan.
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
        )}

        {/* TAB 2: ANGGOTA KPPS (2-5) */}
        {activeTab === 'MEMBERS' && (
          <div className="rounded-md border mt-4 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Nama Anggota KPPS</TableHead>
                  <TableHead>Jabatan / Posisi</TableHead>
                  <TableHead>NIK (16 Digit)</TableHead>
                  <TableHead>No. HP</TableHead>
                  <TableHead>TPS</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-slate-500">
                      Belum ada pendataan anggota KPPS 2-5 untuk TPS ini. Klik tombol "Tambah Anggota KPPS (2-5)".
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-bold text-slate-900">{m.full_name}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                          {m.position}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-slate-600">{m.nik || '-'}</TableCell>
                      <TableCell className="font-mono text-slate-600">{m.phone || '-'}</TableCell>
                      <TableCell className="font-semibold">{m.tps_code || `TPS ID ${m.tps_id}`}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setMemberForm({
                            id: m.id,
                            tps_id: m.tps_id.toString(),
                            full_name: m.full_name,
                            nik: m.nik || '',
                            position: m.position,
                            phone: m.phone || ''
                          });
                          setIsMemberModalOpen(true);
                        }}>
                          <Edit className="h-4 w-4 text-slate-600" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteMember(m.id)}>
                          <Trash className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* TAB 3: OPERATOR BILIK (`KPPS_OPERATOR`) */}
        {activeTab === 'OPERATORS' && (
          <div className="rounded-md border mt-4 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Nama Kredensial</TableHead>
                  <TableHead>Email (Login Operator)</TableHead>
                  <TableHead>Role Sistem</TableHead>
                  <TableHead>Tugas/Afiliasi</TableHead>
                  <TableHead>TPS Penugasan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOperators.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-slate-500">
                      Belum ada data akun Operator Bilik. Klik tombol "Auto-Generate 2 Operator Bilik / TPS" untuk membuat akun khusus pengaktifan bilik.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOperators.map(op => (
                    <TableRow key={op.id}>
                      <TableCell className="font-bold text-slate-900">{op.full_name || op.name}</TableCell>
                      <TableCell className="font-mono text-blue-700 font-semibold">{op.email}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded text-xs font-bold bg-indigo-100 text-indigo-800">
                          {op.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-600 font-medium">{op.affiliation || 'Operator Bilik'}</TableCell>
                      <TableCell className="font-semibold">{op.tps_code} ({op.address || 'TPS'})</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(op.id)}>
                          <Trash className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Edit Ketua KPPS Modal */}
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

      {/* Add / Edit Anggota KPPS Modal */}
      <Dialog open={isMemberModalOpen} onOpenChange={setIsMemberModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{memberForm.id ? 'Edit Anggota KPPS' : 'Tambah Anggota KPPS Pendamping'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveMember} className="space-y-4 py-3">
            <div className="space-y-2">
              <Label>Pilih TPS</Label>
              <Select value={memberForm.tps_id} onValueChange={v => setMemberForm({...memberForm, tps_id: v})}>
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

            <div className="space-y-2">
              <Label>Nama Lengkap Anggota</Label>
              <Input 
                value={memberForm.full_name} 
                onChange={e => setMemberForm({...memberForm, full_name: e.target.value})} 
                placeholder="Contoh: SITI PUTRI NURKHOLIFAH" 
                required 
              />
            </div>

            <div className="space-y-2">
              <Label>Posisi / Jabatan KPPS</Label>
              <Select value={memberForm.position} onValueChange={v => setMemberForm({...memberForm, position: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Jabatan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KPPS 2 (Operator DPT)">KPPS 2 (Operator DPT)</SelectItem>
                  <SelectItem value="KPPS 3 (Operator Bilik 1)">KPPS 3 (Operator Bilik 1)</SelectItem>
                  <SelectItem value="KPPS 4 (Operator Bilik 2)">KPPS 4 (Operator Bilik 2)</SelectItem>
                  <SelectItem value="KPPS 5 (Tinta & Pintu Keluar)">KPPS 5 (Tinta & Pintu Keluar)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>NIK (16 Digit)</Label>
              <Input 
                value={memberForm.nik} 
                onChange={e => setMemberForm({...memberForm, nik: e.target.value})} 
                placeholder="3328..." 
                maxLength={16} 
              />
            </div>

            <div className="space-y-2">
              <Label>No. Handphone (Opsional)</Label>
              <Input 
                value={memberForm.phone} 
                onChange={e => setMemberForm({...memberForm, phone: e.target.value})} 
                placeholder="0857..." 
              />
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold">
              Simpan Anggota KPPS
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Generated Accounts Result Modal */}
      <Dialog open={!!generatedAccounts} onOpenChange={(open) => {
        if (!open) {
          setGeneratedAccounts(null);
          fetchKppsUsers();
          fetchOperatorUsers();
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
                  <TableHead>Nama / Peran</TableHead>
                  <TableHead>Email (Username)</TableHead>
                  <TableHead>Password</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generatedAccounts?.map((acc, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-semibold">{acc.tpsCode || acc.tps_code}</TableCell>
                    <TableCell className="font-semibold text-slate-900">{acc.fullName || acc.name}</TableCell>
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
                  "Nama / Peran": acc.fullName || acc.name || "-",
                  "Email (Username)": acc.email,
                  "Password Asli": acc.password
                }));
                const worksheet = xlsx.utils.json_to_sheet(worksheetData);
                const workbook = xlsx.utils.book_new();
                xlsx.utils.book_append_sheet(workbook, worksheet, "Akun_Baru");
                xlsx.writeFile(workbook, "Daftar_Akun_Penyelenggara_Baru.xlsx");
              });
            }}>
              <Download className="w-4 h-4 mr-2" /> Export ke Excel
            </Button>
            <Button onClick={() => { setGeneratedAccounts(null); fetchKppsUsers(); fetchOperatorUsers(); }}>Tutup</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
