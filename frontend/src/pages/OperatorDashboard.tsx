import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { Shield, Lock, Unlock, LogOut, CheckCircle, XCircle, RotateCcw, Vote, UserCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { unlockBooth, checkBoothStatus, resetBoothSession } from '@/services/boothApi';

interface BoothInfo {
  id: string;
  name: string;
  status: 'LOCKED' | 'UNLOCKED' | 'VOTING_IN_PROGRESS';
  token?: string;
  updatedAt?: string;
}

export const OperatorDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [booths, setBooths] = useState<BoothInfo[]>([
    { id: 'BOOTH-01', name: 'Bilik Suara 1', status: 'LOCKED' },
    { id: 'BOOTH-02', name: 'Bilik Suara 2', status: 'LOCKED' },
    { id: 'BOOTH-03', name: 'Bilik Suara 3', status: 'LOCKED' },
  ]);

  const [selectedBooth, setSelectedBooth] = useState<BoothInfo | null>(null);
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
  const [voterGender, setVoterGender] = useState<'L' | 'P'>('L');
  const [isDisability, setIsDisability] = useState(false);
  const [selectedVoterId, setSelectedVoterId] = useState<string>('');
  const [registeredVoters, setRegisteredVoters] = useState<any[]>([]);
  const [isActivating, setIsActivating] = useState(false);
  const [isResetting, setIsResetting] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          if (data.user.role !== 'KPPS_OPERATOR' && data.user.role !== 'KPPS' && data.user.role !== 'ADMIN') {
            toast.error('Akses ditolak. Halaman khusus Operator Bilik Suara.');
            navigate('/login');
          } else {
            fetchRegisteredVoters(data.user.assignedTpsId);
          }
        } else {
          navigate('/login');
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchUser();
  }, [navigate]);

  const fetchRegisteredVoters = async (tpsId?: number) => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ status: 'REGISTERED' });
      if (tpsId) params.append('tps_id', tpsId.toString());

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/voters?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRegisteredVoters(data.items || []);
      }
    } catch (e) {
      console.error('Failed to fetch registered voters for booth operator', e);
    }
  };

  // Poll booth statuses every 3 seconds
  useEffect(() => {
    const pollBoothStatuses = async () => {
      const updated = await Promise.all(
        booths.map(async (b) => {
          try {
            const res = await checkBoothStatus(b.id);
            if (res.status === 'UNLOCKED' && res.data) {
              return { ...b, status: 'UNLOCKED' as const, token: res.data.token };
            }
            return { ...b, status: 'LOCKED' as const, token: undefined };
          } catch {
            return b;
          }
        })
      );
      setBooths(updated);
    };

    pollBoothStatuses();
    const interval = setInterval(pollBoothStatuses, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenActivateModal = (booth: BoothInfo) => {
    setSelectedBooth(booth);
    setVoterGender('L');
    setIsDisability(false);
    setSelectedVoterId('');
    if (user?.assignedTpsId) {
      fetchRegisteredVoters(user.assignedTpsId);
    }
    setIsActivateModalOpen(true);
  };

  const handleSelectVoter = (voterIdStr: string) => {
    setSelectedVoterId(voterIdStr);
    if (!voterIdStr) return;
    const found = registeredVoters.find(v => v.id.toString() === voterIdStr);
    if (found) {
      setVoterGender(found.gender === 'F' ? 'P' : 'L');
      setIsDisability(found.is_disability === 1);
    }
  };

  const handleConfirmActivate = async () => {
    if (!selectedBooth) return;

    setIsActivating(true);
    try {
      const token = localStorage.getItem('token');
      const vId = selectedVoterId ? Number(selectedVoterId) : null;
      const res = await unlockBooth(selectedBooth.id, voterGender, isDisability, token || undefined, vId);
      
      const matchedVoter = registeredVoters.find(v => v.id === vId);
      const voterNotice = matchedVoter ? ` Pemilih DPT ${matchedVoter.full_name} otomatis tercentang Sudah Memilih ✅` : '';

      toast.success(`Berhasil mengaktifkan ${selectedBooth.name}!${voterNotice}`, {
        description: `Token Sesi: ${res.token || 'Aktif'}`
      });

      setIsActivateModalOpen(false);
      
      // Update local state
      setBooths(prev => prev.map(b => b.id === selectedBooth.id ? { ...b, status: 'UNLOCKED', token: res.token } : b));
      if (user?.assignedTpsId) {
        fetchRegisteredVoters(user.assignedTpsId);
      }
    } catch (error: any) {
      toast.error(error.message || 'Gagal mengaktifkan bilik suara');
    } finally {
      setIsActivating(false);
    }
  };

  const handleCancelSession = async (boothId: string) => {
    if (!confirm(`Apakah Anda yakin ingin membatalkan dan mengunci kembali ${boothId}?`)) return;

    setIsResetting(boothId);
    try {
      await resetBoothSession(boothId);
      toast.success(`Sesi ${boothId} berhasil dibatalkan.`);
      setBooths(prev => prev.map(b => b.id === boothId ? { ...b, status: 'LOCKED', token: undefined } : b));
    } catch (e: any) {
      toast.error('Gagal mereset bilik suara.');
    } finally {
      setIsResetting(null);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    toast.info('Anda telah keluar dari akun Operator.');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-xs">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-tight">Dashboard Operator Bilik Suara</h1>
              <p className="text-xs text-slate-500 font-medium">
                {user?.full_name || user?.name || 'Operator KPPS'} • TPS {user?.tpsCode || user?.tpsNumber || 'TPS-001'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-semibold px-3 py-1">
              Role: {user?.role === 'KPPS_OPERATOR' ? 'Operator Bilik' : user?.role || 'KPPS'}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-600 hover:text-red-600 font-medium">
              <LogOut className="h-4 w-4 mr-1.5" /> Keluar
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Notice Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-blue-900">
          <UserCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">Panduan Tugas Operator Bilik Suara (KPPS 3 & 4):</p>
            <p className="text-blue-800 mt-0.5">
              1. Verifikasi kehadiran pemilih & C6 pemberitahuan.<br />
              2. Klik tombol <strong className="text-blue-900">"Aktifkan Bilik Suara"</strong> pada bilik yang kosong.<br />
              3. Arahkan pemilih menuju tablet/perangkat bilik suara bersangkutan.
            </p>
          </div>
        </div>

        {/* Booth Status Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {booths.map((booth) => {
            const isUnlocked = booth.status === 'UNLOCKED';

            return (
              <Card 
                key={booth.id} 
                className={`transition-all duration-200 border-2 shadow-sm ${
                  isUnlocked 
                    ? 'border-green-500 bg-green-50/20 ring-2 ring-green-500/20' 
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Vote className={`h-5 w-5 ${isUnlocked ? 'text-green-600' : 'text-slate-500'}`} />
                      {booth.name}
                    </CardTitle>
                    <Badge className={isUnlocked ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-200'}>
                      {isUnlocked ? (
                        <span className="flex items-center gap-1">
                          <Unlock className="h-3 w-3" /> Siap Memilih
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Lock className="h-3 w-3" /> Terkunci
                        </span>
                      )}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-500">
                    ID Perangkat: <code className="font-mono text-slate-700">{booth.id}</code>
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-6 space-y-4">
                  {isUnlocked ? (
                    <div className="space-y-4">
                      <div className="bg-green-100/80 border border-green-200 rounded-lg p-3 text-center space-y-1">
                        <p className="text-xs font-bold text-green-800 uppercase tracking-wide">Status Sesi Aktif</p>
                        <p className="text-sm font-semibold text-green-900">Bilik Suara Terbuka & Siap Digunakan</p>
                        {booth.token && (
                          <div className="mt-2 text-xs font-mono bg-white text-green-900 px-2 py-1 rounded border border-green-300 inline-block font-bold">
                            Token: {booth.token}
                          </div>
                        )}
                      </div>

                      <Button 
                        variant="outline" 
                        className="w-full border-red-200 text-red-600 hover:bg-red-50 font-semibold"
                        onClick={() => handleCancelSession(booth.id)}
                        disabled={isResetting === booth.id}
                      >
                        {isResetting === booth.id ? (
                          <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-2" />
                        )}
                        Batalkan Sesi Bilik
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center text-slate-600 text-xs">
                        Bilik suara dalam posisi terkunci (standby). Klik tombol di bawah untuk mengaktifkan pemilih berikutnya.
                      </div>

                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 shadow-sm"
                        onClick={() => handleOpenActivateModal(booth)}
                      >
                        <Unlock className="h-4 w-4 mr-2" /> Aktifkan Bilik Suara
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      {/* Modal Dialog for Booth Activation */}
      <Dialog open={isActivateModalOpen} onOpenChange={setIsActivateModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Unlock className="h-5 w-5 text-blue-600" /> Aktifkan {selectedBooth?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Pilih data demografi singkat pemilih untuk mengaktifkan sesi surat suara elektronik.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* DPT Voter Selection */}
            <div className="space-y-1.5">
              <Label className="text-slate-700 font-semibold text-xs flex justify-between items-center">
                <span>Pilih Pemilih dari DPT TPS:</span>
                <span className="text-[10px] text-blue-600 font-normal">Auto-Checklist ✅</span>
              </Label>
              <Select value={selectedVoterId} onValueChange={handleSelectVoter}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="-- Pilih Nama Pemilih (Opsional) --" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="">-- Tanpa Memilih Pemilih DPT --</SelectItem>
                  {registeredVoters.map((v) => (
                    <SelectItem key={v.id} value={v.id.toString()} className="text-xs">
                      No. {v.dpt_number || "-"} | {v.full_name} ({v.address || "-"}) | NIK: {v.nik_masked || "-"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Gender Selection */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold text-xs">Jenis Kelamin Pemilih:</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={voterGender === 'L' ? 'default' : 'outline'}
                  className={voterGender === 'L' ? 'bg-blue-600 hover:bg-blue-700 text-white font-bold' : 'text-slate-700'}
                  onClick={() => setVoterGender('L')}
                >
                  Laki-Laki (L)
                </Button>
                <Button
                  type="button"
                  variant={voterGender === 'P' ? 'default' : 'outline'}
                  className={voterGender === 'P' ? 'bg-pink-600 hover:bg-pink-700 text-white font-bold' : 'text-slate-700'}
                  onClick={() => setVoterGender('P')}
                >
                  Perempuan (P)
                </Button>
              </div>
            </div>

            {/* Disability Checkbox */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="disability"
                checked={isDisability}
                onChange={(e) => setIsDisability(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <Label htmlFor="disability" className="text-xs font-medium text-slate-700 cursor-pointer">
                Pemilih Disabilitas / Membutuhkan Pendampingan
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsActivateModalOpen(false)}>
              Batal
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5"
              onClick={handleConfirmActivate}
              disabled={isActivating}
            >
              {isActivating ? <RotateCcw className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Konfirmasi & Buka Bilik
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OperatorDashboard;
