import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Shield, ArrowLeft, Plus, Trash2, Building } from 'lucide-react';

interface PartyOption {
  id: number;
  name: string;
  acronym: string;
  logo_url: string | null;
  is_endorsed: boolean;
  endorsed_paslon_id: number | null;
  endorsed_candidate_name: string | null;
  endorsed_ballot_number: number | null;
}

const TambahPaslon = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    election_id: '4', // Default to 4 per seeded demo
    ballot_number: '',
    candidate_name: '',
    vice_candidate_name: '',
    motto: '',
    vision: '',
  });

  const [mission, setMission] = useState<string[]>(['']);
  const [education, setEducation] = useState<string[]>(['']);
  const [careerPath, setCareerPath] = useState<string[]>(['']);
  const [photo, setPhoto] = useState<File | null>(null);

  // Political parties state
  const [parties, setParties] = useState<PartyOption[]>([]);
  const [selectedPartyIds, setSelectedPartyIds] = useState<number[]>([]);
  const [isLoadingParties, setIsLoadingParties] = useState(false);

  useEffect(() => {
    const fetchPartyOptions = async () => {
      setIsLoadingParties(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/parties?election_id=${formData.election_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.items) {
          setParties(data.items);
        }
      } catch (err) {
        console.error('Failed to fetch party options', err);
      } finally {
        setIsLoadingParties(false);
      }
    };

    fetchPartyOptions();
  }, [formData.election_id]);

  const handlePartyToggle = (partyId: number, isChecked: boolean) => {
    if (isChecked) {
      setSelectedPartyIds(prev => [...prev, partyId]);
    } else {
      setSelectedPartyIds(prev => prev.filter(id => id !== partyId));
    }
  };

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

    if (selectedPartyIds.length === 0) {
      toast.error('Pilih minimal satu partai politik pengusung');
      return;
    }

    try {
      const submitData = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        submitData.append(key, value);
      });

      submitData.append('party_ids', JSON.stringify(selectedPartyIds));
      submitData.append('mission', JSON.stringify(mission.filter(m => m.trim() !== '')));
      submitData.append('education', JSON.stringify(education.filter(e => e.trim() !== '')));
      submitData.append('career_path', JSON.stringify(careerPath.filter(c => c.trim() !== '')));

      if (photo) {
        submitData.append('photo', photo);
      }

      const response = await fetch('/api/candidate-pairs', {
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
              <CardTitle className="text-slate-900">Informasi Dasar Paslon</CardTitle>
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
                  <label className="text-sm font-medium text-slate-700">Foto Paslon</label>
                  <Input 
                    type="file" 
                    accept="image/*"
                    onChange={e => setPhoto(e.target.files ? e.target.files[0] : null)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Nama Calon Walikota</label>
                  <Input 
                    required 
                    value={formData.candidate_name} 
                    onChange={e => setFormData(p => ({ ...p, candidate_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Nama Wakil Calon Walikota</label>
                  <Input 
                    required 
                    value={formData.vice_candidate_name} 
                    onChange={e => setFormData(p => ({ ...p, vice_candidate_name: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selection of Endorsing Political Parties */}
          <Card className="bg-white border-gray-200 shadow-sm mb-6">
            <CardHeader>
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <Building className="h-5 w-5 text-blue-600" />
                Partai Politik Pengusung (Koalisi)
              </CardTitle>
              <p className="text-sm text-slate-500">
                Pilih satu atau lebih partai politik yang mengusung paslon ini. Sesuai regulasi, 1 partai hanya boleh mengusung 1 paslon pada pemilihan ini.
              </p>
            </CardHeader>
            <CardContent>
              {isLoadingParties ? (
                <div className="py-4 text-center text-slate-500 text-sm">Memuat partai politik...</div>
              ) : parties.length === 0 ? (
                <div className="py-4 text-center text-slate-500 text-sm">Tidak ada partai politik terdaftar.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-1 border rounded-md">
                  {parties.map((party) => {
                    const isSelected = selectedPartyIds.includes(party.id);
                    const isDisabled = party.is_endorsed;

                    return (
                      <div
                        key={party.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          isDisabled
                            ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`party-${party.id}`}
                            checked={isSelected}
                            disabled={isDisabled}
                            onCheckedChange={(checked) => handlePartyToggle(party.id, !!checked)}
                          />
                          {party.logo_url ? (
                            <img
                              src={party.logo_url}
                              alt={party.acronym}
                              className="h-6 w-6 object-contain"
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                          ) : null}
                          <label
                            htmlFor={`party-${party.id}`}
                            className={`text-sm font-medium leading-none ${
                              isDisabled ? 'cursor-not-allowed text-gray-500' : 'cursor-pointer text-slate-900'
                            }`}
                          >
                            <span className="font-bold">{party.acronym}</span> - {party.name}
                          </label>
                        </div>
                        {isDisabled && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px]">
                            Mengusung Paslon {party.endorsed_ballot_number ? `No. ${party.endorsed_ballot_number}` : ''}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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
