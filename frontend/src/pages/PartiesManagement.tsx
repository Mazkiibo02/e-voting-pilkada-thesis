import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Shield, ArrowLeft, Plus, Trash2, Edit, Flag, Building } from 'lucide-react';

interface Party {
  id: number;
  name: string;
  acronym: string;
  logo_url: string | null;
  created_at: string;
}

const PartiesManagement = () => {
  const navigate = useNavigate();
  const [parties, setParties] = useState<Party[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    id: 0,
    name: '',
    acronym: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchParties = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/parties', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.items) {
        setParties(data.items);
      } else {
        toast.error(data.message || 'Gagal mengambil data partai');
      }
    } catch (err) {
      toast.error('Koneksi ke server gagal');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchParties();
  }, []);

  const handleOpenAddModal = () => {
    setFormData({ id: 0, name: '', acronym: '' });
    setLogoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (party: Party) => {
    setFormData({
      id: party.id,
      name: party.name,
      acronym: party.acronym,
    });
    setLogoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsEditModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.acronym.trim()) {
      toast.error('Nama dan Akronim partai wajib diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const body = new FormData();
      body.append('name', formData.name.trim());
      body.append('acronym', formData.acronym.trim());
      if (logoFile) {
        body.append('logo', logoFile);
      }

      const res = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: body
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Partai ${data.data.acronym} berhasil ditambahkan!`);
        setIsAddModalOpen(false);
        fetchParties();
      } else {
        toast.error(data.message || 'Gagal menambah partai');
      }
    } catch (err) {
      toast.error('Koneksi server gagal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.acronym.trim()) {
      toast.error('Nama dan Akronim partai wajib diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const body = new FormData();
      body.append('name', formData.name.trim());
      body.append('acronym', formData.acronym.trim());
      if (logoFile) {
        body.append('logo', logoFile);
      }

      const res = await fetch(`/api/parties/${formData.id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
        body: body
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Partai ${data.data.acronym} berhasil diperbarui!`);
        setIsEditModalOpen(false);
        fetchParties();
      } else {
        toast.error(data.message || 'Gagal memperbarui partai');
      }
    } catch (err) {
      toast.error('Koneksi server gagal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, acronym: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus Partai ${acronym}?`)) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/parties/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Partai ${acronym} berhasil dihapus.`);
        fetchParties();
      } else {
        toast.error(data.message || 'Gagal menghapus partai');
      }
    } catch (err) {
      toast.error('Koneksi server gagal');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900">
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="text-white hover:bg-primary-foreground/20">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Flag className="h-6 w-6 text-white" />
              <div>
                <h1 className="text-xl font-bold">Master Data Partai Politik</h1>
                <p className="text-xs opacity-90">Kelola Data Partai Pengusung Pasangan Calon</p>
              </div>
            </div>
          </div>
          <Button onClick={handleOpenAddModal} className="bg-white text-primary hover:bg-slate-100 font-semibold">
            <Plus className="h-4 w-4 mr-2" /> Tambah Partai
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              Daftar Partai Politik Terdaftar ({parties.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-slate-500">Memuat data partai...</div>
            ) : parties.length === 0 ? (
              <div className="py-8 text-center text-slate-500">Belum ada data partai politik.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">No</TableHead>
                      <TableHead className="w-24">Logo</TableHead>
                      <TableHead>Akronim</TableHead>
                      <TableHead>Nama Partai Politik</TableHead>
                      <TableHead className="text-right w-32">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parties.map((party, idx) => (
                      <TableRow key={party.id}>
                        <TableCell className="font-medium text-slate-600">{idx + 1}</TableCell>
                        <TableCell>
                          {party.logo_url ? (
                            <img 
                              src={party.logo_url} 
                              alt={party.acronym} 
                              className="h-10 w-10 object-contain rounded bg-slate-50 border p-1"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="h-10 w-10 bg-slate-100 rounded flex items-center justify-center font-bold text-slate-400 text-xs">
                              {party.acronym.substring(0, 3)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-900">{party.acronym}</TableCell>
                        <TableCell className="text-slate-700">{party.name}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(party)} className="text-blue-600 hover:bg-blue-50">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDelete(party.id, party.acronym)} className="text-red-600 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal Tambah Partai */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Partai Politik Baru</DialogTitle>
              <DialogDescription>
                Masukkan informasi master partai politik peserta pemilihan.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap Partai</Label>
                <Input
                  id="name"
                  placeholder="e.g. Partai Demokrasi Indonesia Perjuangan"
                  value={formData.name}
                  onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acronym">Singkatan / Akronim</Label>
                <Input
                  id="acronym"
                  placeholder="e.g. PDI Perjuangan"
                  value={formData.acronym}
                  onChange={(e) => setFormData(p => ({ ...p, acronym: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo">Logo Partai (Opsional)</Label>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={(e) => setLogoFile(e.target.files ? e.target.files[0] : null)}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Batal</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Partai'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal Edit Partai */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Partai Politik</DialogTitle>
              <DialogDescription>
                Perbarui nama, akronim, atau logo partai politik.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_name">Nama Lengkap Partai</Label>
                <Input
                  id="edit_name"
                  value={formData.name}
                  onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_acronym">Singkatan / Akronim</Label>
                <Input
                  id="edit_acronym"
                  value={formData.acronym}
                  onChange={(e) => setFormData(p => ({ ...p, acronym: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_logo">Update Logo Partai (Opsional)</Label>
                <Input
                  id="edit_logo"
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={(e) => setLogoFile(e.target.files ? e.target.files[0] : null)}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Batal</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : 'Perbarui Partai'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default PartiesManagement;
