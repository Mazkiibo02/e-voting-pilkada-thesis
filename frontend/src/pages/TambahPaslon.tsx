import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Shield, ArrowLeft, Plus, Trash2 } from 'lucide-react';

const TambahPaslon = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    election_id: '4', // Default to 4 per seeded demo
    ballot_number: '',
    candidate_name: '',
    vice_candidate_name: '',
    coalition_name: '',
    motto: '',
    vision: '',
  });

  const [mission, setMission] = useState<string[]>(['']);
  const [education, setEducation] = useState<string[]>(['']);
  const [careerPath, setCareerPath] = useState<string[]>(['']);
  const [photo, setPhoto] = useState<File | null>(null);

  const handleArrayChange = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
    setter(prev => {
      const newArray = [...prev];
      newArray[index] = value;
      return newArray;
    });
  };

  const addArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => [...prev, '']);
  };

  const removeArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token') || localStorage.getItem('isAdmin'); 
    
    if (!token) {
      toast.error('Anda belum login');
      return;
    }

    try {
      const submitData = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        submitData.append(key, value);
      });

      submitData.append('mission', JSON.stringify(mission.filter(m => m.trim() !== '')));
      submitData.append('education', JSON.stringify(education.filter(e => e.trim() !== '')));
      submitData.append('career_path', JSON.stringify(careerPath.filter(c => c.trim() !== '')));

      if (photo) {
        submitData.append('photo', photo);
      }

      const response = await fetch('http://localhost:5000/candidate-pairs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: submitData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Gagal menambahkan paslon');
      }

      toast.success('Pasangan calon berhasil ditambahkan');
      navigate('/admin');
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan jaringan');
    }
  };

  const renderArrayInputs = (label: string, items: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {items.map((item, index) => (
        <div key={index} className="flex gap-2">
          <Input 
            value={item} 
            onChange={(e) => handleArrayChange(setter, index, e.target.value)} 
            placeholder={`Masukkan ${label.toLowerCase()}...`}
          />
          {items.length > 1 && (
            <Button type="button" variant="destructive" size="icon" onClick={() => removeArrayItem(setter, index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem(setter)} className="mt-2">
        <Plus className="h-4 w-4 mr-2" /> Tambah {label}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900">
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="text-white hover:bg-primary-foreground/20">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-white" />
            <h1 className="text-xl font-bold">Tambah Pasangan Calon</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <form onSubmit={handleSubmit}>
          <Card className="bg-white border-gray-200 shadow-sm mb-6">
            <CardHeader>
              <CardTitle className="text-slate-900">Informasi Dasar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Nomor Urut</label>
                  <Input 
                    type="number" 
                    required 
                    value={formData.ballot_number} 
                    onChange={e => setFormData(p => ({ ...p, ballot_number: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Partai Pengusung / Koalisi</label>
                  <Input 
                    value={formData.coalition_name} 
                    onChange={e => setFormData(p => ({ ...p, coalition_name: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Nama Calon</label>
                  <Input 
                    required 
                    value={formData.candidate_name} 
                    onChange={e => setFormData(p => ({ ...p, candidate_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Nama Wakil Calon</label>
                  <Input 
                    required 
                    value={formData.vice_candidate_name} 
                    onChange={e => setFormData(p => ({ ...p, vice_candidate_name: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Foto Paslon</label>
                <Input 
                  type="file" 
                  accept="image/*"
                  onChange={e => setPhoto(e.target.files ? e.target.files[0] : null)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm mb-6">
            <CardHeader>
              <CardTitle className="text-slate-900">Profil & Visi Misi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Motto</label>
                <Input 
                  value={formData.motto} 
                  onChange={e => setFormData(p => ({ ...p, motto: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Visi</label>
                <Input 
                  value={formData.vision} 
                  onChange={e => setFormData(p => ({ ...p, vision: e.target.value }))}
                />
              </div>
              {renderArrayInputs('Misi', mission, setMission)}
              <hr />
              {renderArrayInputs('Riwayat Pendidikan', education, setEducation)}
              <hr />
              {renderArrayInputs('Riwayat Karir', careerPath, setCareerPath)}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate('/admin')}>Batal</Button>
            <Button type="submit">Simpan Paslon</Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default TambahPaslon;
