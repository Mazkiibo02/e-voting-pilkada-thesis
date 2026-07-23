import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import { toast } from 'sonner';
import { Shield, Users, Vote, LogOut, RotateCcw, Plus, FileSpreadsheet, Download, Upload, Trash2, Edit, Building, UserCheck } from 'lucide-react';
import { WitnessManagement } from '@/components/WitnessManagement';
import { KppsManagement } from '@/components/KppsManagement';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SearchableComboBox = ({ options, value, onChange, placeholder }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt: string) => 
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        className="flex items-center justify-between px-3 py-2 border rounded-md cursor-pointer bg-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-sm truncate mr-2">
          {value || placeholder}
        </span>
        <span className="text-gray-400">▼</span>
      </div>
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
          <div className="p-2 border-b">
            <input
              type="text"
              className="w-full px-2 py-1 text-sm border rounded-sm outline-none focus:border-blue-500"
              placeholder="Cari..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <ul className="max-h-60 overflow-auto">
            <li
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${!value ? "bg-blue-50 text-blue-600" : ""}`}
              onClick={() => {
                onChange(null);
                setIsOpen(false);
                setSearchTerm("");
              }}
            >
              Semua TPS
            </li>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt: string) => (
                <li
                  key={opt}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${value === opt ? "bg-blue-50 text-blue-600" : ""}`}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                >
                  {opt}
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-gray-500">Tidak ada hasil</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [tpsList, setTpsList] = useState<string[]>([]);
  const [selectedTps, setSelectedTps] = useState<string | null>(null);
  const [selectedBoothToUnlock, setSelectedBoothToUnlock] = useState<string>("BOOTH-01");
  const [voterGender, setVoterGender] = useState<'L' | 'P'>('L');
  const [isDisability, setIsDisability] = useState<boolean>(false);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);

  // Form states
  const [isTpsModalOpen, setIsTpsModalOpen] = useState(false);
  const [newTpsLocation, setNewTpsLocation] = useState("");
  const [newTpsDpt, setNewTpsDpt] = useState("");
  const [tpsError, setTpsError] = useState("");
  const [isSubmittingTps, setIsSubmittingTps] = useState(false);

  const handleAddTps = async (e: React.FormEvent) => {
    e.preventDefault();
    setTpsError("");
    const dptValue = parseInt(newTpsDpt, 10);
    if (isNaN(dptValue) || dptValue < 0) {
      setTpsError("Jumlah DPT tidak valid.");
      return;
    }
    if (dptValue > 500) {
      setTpsError("Maksimal 500 DPT sesuai regulasi KPU.");
      return;
    }
    if (!newTpsLocation.trim()) {
      setTpsError("Lokasi spesifik wajib diisi.");
      return;
    }

    setIsSubmittingTps(true);
    try {
      const tokenAuth = localStorage.getItem('token');
      const res = await fetch('/api/tps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenAuth}`
        },
        body: JSON.stringify({
          location: newTpsLocation,
          registered_voters_total: dptValue
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`TPS berhasil ditambahkan: ${data.data.tps_code}`);
        setIsTpsModalOpen(false);
        setNewTpsLocation("");
        setNewTpsDpt("");
        loadData(selectedTps ?? undefined);
      } else {
        setTpsError(data.message || "Gagal menambah TPS");
      }
    } catch (e) {
      setTpsError("Koneksi server gagal");
    } finally {
      setIsSubmittingTps(false);
    }
  };

  const handleUnlockBooth = async () => {
    try {
      setIsGeneratingToken(true);
      const tokenAuth = localStorage.getItem('token');
      
      const tpsRes = await fetch(`/api/tps`, {
        headers: { 'Authorization': `Bearer ${tokenAuth}` }
      });

      if (tpsRes.status === 401) {
        toast.error("Sesi Anda telah berakhir, silakan login kembali.");
        return;
      }

      const tpsData = await tpsRes.json();
      const firstTps = tpsData.items?.[0];
      
      if (!firstTps) {
        toast.error("Tidak ada TPS aktif di sistem.");
        return;
      }

      const response = await fetch(`/api/voting-sessions/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenAuth}`
        },
        body: JSON.stringify({
          electionId: firstTps.election_id,
          tpsId: firstTps.id,
          boothId: selectedBoothToUnlock,
          voterGender: voterGender,
          isDisability: isDisability ? 1 : 0
        })
      });

      if (response.status === 401) {
        toast.error("Sesi Anda telah berakhir, silakan login kembali.");
        return;
      }

      if (response.ok) {
        toast.success(`Bilik Suara ${selectedBoothToUnlock} berhasil diaktifkan.`);
      } else {
        const err = await response.json();
        toast.error(err.message || 'Gagal mengaktifkan bilik suara');
      }
    } catch (e) {
      toast.error('Koneksi server gagal');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  // KPPS Account Management
  const [isGeneratingKpps, setIsGeneratingKpps] = useState(false);
  const [isImportingKpps, setIsImportingKpps] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerateKpps = async () => {
    if (!confirm("Apakah Anda yakin ingin generate otomatis akun KPPS untuk TPS yang belum memiliki akun?")) return;
    setIsGeneratingKpps(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/kpps/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
      } else {
        toast.error(data.message || "Gagal generate akun KPPS");
      }
    } catch (e) {
      toast.error("Koneksi server gagal");
    } finally {
      setIsGeneratingKpps(false);
    }
  };

  const handleDownloadKppsTemplate = async () => {
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

  const handleExportKpps = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/kpps/export', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error("Gagal export akun KPPS");
      }
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

  const handleImportKpps = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImportingKpps(true);
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
      } else {
        toast.error(data.message || "Gagal import akun KPPS");
      }
    } catch (err) {
      toast.error("Koneksi server gagal");
    } finally {
      setIsImportingKpps(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const fetchDashboardData = async (tps?: string) => {
    try {
      const url = tps 
        ? `${import.meta.env.VITE_API_BASE_URL}/stats?tps=${tps}`
        : `${import.meta.env.VITE_API_BASE_URL}/stats`;
      const res = await fetch(url);
      const resData = await res.json();
      if (resData.success && resData.data) {
        setStats(resData.data);
        if (!tps) {
          setTpsList(resData.data.tpsList || []);
        }
      }
    } catch (e) {
      console.error("Failed to load stats", e);
      toast.error('Gagal memuat data statistik');
    }
  };

  const [fullTpsList, setFullTpsList] = useState<any[]>([]);
  const [editingTps, setEditingTps] = useState<any>(null);
  const [editTpsLocation, setEditTpsLocation] = useState("");
  const [editTpsDpt, setEditTpsDpt] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const tpsFileInputRef = useRef<HTMLInputElement>(null);
  const [isImportingTps, setIsImportingTps] = useState(false);

  const handleImportTps = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("excelFile", file);

    setIsImportingTps(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/tps/import', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        loadData(selectedTps ?? undefined);
      } else {
        toast.error(data.message || "Gagal import data TPS");
      }
    } catch (err) {
      toast.error("Koneksi server gagal");
    } finally {
      setIsImportingTps(false);
      if (tpsFileInputRef.current) tpsFileInputRef.current.value = "";
    }
  };

  const handleDownloadTpsTemplate = () => {
    window.open('/api/tps/template', '_blank');
  };

  const handleExportTps = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/tps/export', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Gagal mengunduh data TPS');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Data_TPS_Kota_Tegal.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Data TPS berhasil diexport.');
    } catch (err) {
      toast.error('Gagal meng-export data TPS.');
    }
  };

  const fetchFullTps = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/tps', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFullTpsList(data.items || []);
      }
    } catch (e) {
      console.error("Failed to fetch full TPS list", e);
    }
  };

  const handleDeleteTps = async (tpsId: number, tpsCode: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/tps/${tpsId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`TPS ${tpsCode} berhasil dihapus.`);
        loadData(selectedTps ?? undefined);
      } else {
        toast.error(data.message || "Gagal menghapus TPS");
      }
    } catch (e) {
      toast.error("Koneksi server gagal");
    }
  };

  const handleOpenEditModal = (tps: any) => {
    setEditingTps(tps);
    setEditTpsLocation(tps.address || "");
    setEditTpsDpt((tps.registered_voters_total ?? 100).toString());
    setIsEditModalOpen(true);
  };

  const handleUpdateTps = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTps) return;
    const dptVal = parseInt(editTpsDpt, 10);
    if (isNaN(dptVal) || dptVal < 0) {
      toast.error("Jumlah DPT tidak valid.");
      return;
    }
    if (dptVal > 500) {
      toast.error("Maksimal 500 DPT sesuai regulasi KPU.");
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/tps/${editingTps.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          address: editTpsLocation,
          registered_voters_total: dptVal
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`TPS ${editingTps.tps_code} berhasil diperbarui.`);
        setIsEditModalOpen(false);
        setEditingTps(null);
        loadData(selectedTps ?? undefined);
      } else {
        toast.error(data.message || "Gagal memperbarui TPS");
      }
    } catch (e) {
      toast.error("Koneksi server gagal");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const [candidatePairsList, setCandidatePairsList] = useState<any[]>([]);
  const [editingPaslon, setEditingPaslon] = useState<any>(null);
  const [isEditPaslonModalOpen, setIsEditPaslonModalOpen] = useState(false);
  const [editPaslonForm, setEditPaslonForm] = useState({
    ballot_number: '',
    candidate_name: '',
    vice_candidate_name: '',
    coalition_name: '',
    motto: '',
  });
  const [editPaslonPhoto, setEditPaslonPhoto] = useState<File | null>(null);
  const [isSubmittingEditPaslon, setIsSubmittingEditPaslon] = useState(false);

  const fetchCandidatePairs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/candidate-pairs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.items) {
        setCandidatePairsList(data.items);
      }
    } catch (err) {
      console.error("Failed to fetch candidate pairs", err);
    }
  };

  const handleOpenEditPaslonModal = (cp: any) => {
    setEditingPaslon(cp);
    setEditPaslonForm({
      ballot_number: cp.ballot_number ? cp.ballot_number.toString() : '',
      candidate_name: cp.candidate_name || '',
      vice_candidate_name: cp.vice_candidate_name || '',
      coalition_name: cp.coalition_name || '',
      motto: cp.motto || '',
    });
    setEditPaslonPhoto(null);
    setIsEditPaslonModalOpen(true);
  };

  const handleUpdatePaslon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPaslon) return;

    setIsSubmittingEditPaslon(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('ballot_number', editPaslonForm.ballot_number);
      formData.append('candidate_name', editPaslonForm.candidate_name);
      formData.append('vice_candidate_name', editPaslonForm.vice_candidate_name);
      formData.append('coalition_name', editPaslonForm.coalition_name);
      formData.append('motto', editPaslonForm.motto);

      if (editPaslonPhoto) {
        formData.append('photo', editPaslonPhoto);
      }

      const res = await fetch(`/api/candidate-pairs/${editingPaslon.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Pasangan calon No. ${editPaslonForm.ballot_number} berhasil diperbarui!`);
        setIsEditPaslonModalOpen(false);
        setEditingPaslon(null);
        loadData(selectedTps ?? undefined);
      } else {
        toast.error(data.message || "Gagal memperbarui pasangan calon");
      }
    } catch (err) {
      toast.error("Koneksi server gagal");
    } finally {
      setIsSubmittingEditPaslon(false);
    }
  };

  const handleDeleteCandidatePair = async (id: number, candidateName: string, mode: 'soft' | 'hard' = 'soft') => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/candidate-pairs/${id}?mode=${mode}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.data?.message || `Pasangan calon ${candidateName} berhasil diproses.`);
        loadData(selectedTps ?? undefined);
      } else {
        toast.error(data.message || "Gagal menghapus pasangan calon");
      }
    } catch (err) {
      toast.error("Koneksi server gagal");
    }
  };

  const loadData = (tps?: string) => {
    fetchDashboardData(tps);
    fetchFullTps();
    fetchCandidatePairs();
  };

  useEffect(() => {
    const checkAuth = async () => {
      const tokenAuth = localStorage.getItem('token');
      if (!tokenAuth) {
        navigate('/');
        return;
      }
      
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${tokenAuth}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
          if (data.user.role === 'KPPS') {
            setSelectedTps(data.user.tpsCode);
            loadData(data.user.tpsCode);
          } else {
            loadData();
          }
        } else {
          localStorage.removeItem('token');
          navigate('/');
        }
      } catch (e) {
        navigate('/');
      } finally {
        setIsLoadingAuth(false);
      }
    };
    
    checkAuth();
  }, [navigate]);


  const handleTpsChange = (tps: string | null) => {
    setSelectedTps(tps);
    loadData(tps ?? undefined);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('token');
    toast.info('Logout berhasil');
    navigate('/');
  };

  if (!stats) return null;

  const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'];

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-white" />
            <div>
              <h1 className="text-xl font-bold">Simulasi Sistem E-Voting</h1>
              <p className="text-sm opacity-90">Dashboard Administrator</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={handleLogout} className="font-semibold">
            <LogOut className="h-4 w-4 mr-2" />
            Keluar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* TPS Filter */}
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 max-w-sm">
              {currentUser?.role === 'ADMIN' ? (
                <>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Filter Berdasarkan TPS:</p>
                  <SearchableComboBox
                    options={tpsList}
                    value={selectedTps}
                    onChange={handleTpsChange}
                    placeholder="Semua TPS"
                  />
                </>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-lg font-bold text-blue-900">
                    Anda bertugas di: TPS {currentUser?.tpsNumber} - {currentUser?.location || currentUser?.tpsCode}
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-wrap items-center mt-4 md:mt-0">
              {currentUser?.role === 'ADMIN' && (
                <>
                  <Dialog open={isTpsModalOpen} onOpenChange={setIsTpsModalOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="font-semibold text-blue-600 border-blue-200 hover:bg-blue-50">
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah TPS
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tambah TPS Baru</DialogTitle>
                    <DialogDescription>
                      Kode TPS akan dibuat secara otomatis sesuai urutan. Maksimal 500 DPT.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddTps} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Lokasi Spesifik</Label>
                      <Input
                        id="location"
                        placeholder="e.g., SD Krandon 1"
                        value={newTpsLocation}
                        onChange={(e) => setNewTpsLocation(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dpt">Jumlah DPT</Label>
                      <Input
                        id="dpt"
                        type="number"
                        placeholder="Maksimal 500"
                        value={newTpsDpt}
                        onChange={(e) => setNewTpsDpt(e.target.value)}
                      />
                    </div>
                    {tpsError && (
                      <div className="p-3 bg-red-50 text-red-600 text-sm font-semibold rounded-md border border-red-200">
                        {tpsError}
                      </div>
                    )}
                    <Button type="submit" className="w-full" disabled={isSubmittingTps}>
                      {isSubmittingTps ? "Menyimpan..." : "Simpan TPS"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Button size="sm" variant="outline" onClick={() => navigate('/admin/tambah-paslon')} className="font-semibold text-green-600 border-green-200 hover:bg-green-50">
                <Plus className="mr-2 h-4 w-4" />
                Tambah Paslon
              </Button>
              </>
              )}
              
              <Button size="sm" variant="secondary" onClick={() => navigate('/admin/audit-logs')} className="font-semibold">
                <Shield className="mr-2 h-4 w-4 text-amber-500" />
                Log Aktivitas
              </Button>
              <Button size="sm" onClick={() => navigate('/admin/chasil-preview')} className="font-semibold">
                <Shield className="mr-2 h-4 w-4" />
                Preview C.Hasil
              </Button>
              
              <Dialog open={isUnlockModalOpen} onOpenChange={setIsUnlockModalOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Vote className="mr-2 h-4 w-4" />
                    Aktifkan Sesi Bilik
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[450px]">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center">
                      <Vote className="w-5 h-5 mr-2 text-emerald-600" /> Aktifkan Bilik Suara Fisik
                    </DialogTitle>
                    <DialogDescription>
                      Pilih bilik suara dan tentukan gender pemilih yang telah diverifikasi DPT/KTP-nya secara offline.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-5 py-3">
                    {/* Select Booth */}
                    <div className="space-y-2">
                      <Label className="font-semibold text-slate-800">Target Bilik Suara</Label>
                      <select
                        value={selectedBoothToUnlock}
                        onChange={(e) => setSelectedBoothToUnlock(e.target.value)}
                        className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md bg-white text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="BOOTH-01">Bilik 1 (BOOTH-01)</option>
                        <option value="BOOTH-02">Bilik 2 (BOOTH-02)</option>
                        <option value="BOOTH-03">Bilik 3 (BOOTH-03)</option>
                      </select>
                    </div>

                    {/* Select Gender */}
                    <div className="space-y-2">
                      <Label className="font-semibold text-slate-800">Gender Pemilih (Pencatatan Demografi C.Hasil)</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setVoterGender('L')}
                          className={`p-3 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                            voterGender === 'L'
                              ? "bg-blue-50 border-blue-600 text-blue-700 shadow-xs ring-2 ring-blue-500/20"
                              : "bg-white border-gray-200 text-slate-600 hover:bg-gray-50"
                          }`}
                        >
                          <span>♂</span> Laki-laki (L)
                        </button>
                        <button
                          type="button"
                          onClick={() => setVoterGender('P')}
                          className={`p-3 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                            voterGender === 'P'
                              ? "bg-pink-50 border-pink-600 text-pink-700 shadow-xs ring-2 ring-pink-500/20"
                              : "bg-white border-gray-200 text-slate-600 hover:bg-gray-50"
                          }`}
                        >
                          <span>♀</span> Perempuan (P)
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 italic mt-1">
                        *Data gender digunakan untuk mengisi statistik L/P pada formulir C.Hasil-KWK KPU secara otomatis tanpa mencatat identitas/NIK pemilih.
                      </p>
                    </div>

                    <Button
                      type="button"
                      onClick={handleUnlockBooth}
                      disabled={isGeneratingToken}
                      className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white py-5"
                    >
                      {isGeneratingToken ? "Mengaktifkan Bilik..." : `Buka Sesi ${selectedBoothToUnlock}`}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="font-semibold border-gray-300">
                    <Vote className="mr-2 h-4 w-4 text-blue-600" />
                    Buka Display Booth
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border-gray-200">
                  <DropdownMenuItem onClick={() => window.open('/booth/BOOTH-01', '_blank')} className="cursor-pointer">
                    Display Bilik 1 (BOOTH-01)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.open('/booth/BOOTH-02', '_blank')} className="cursor-pointer">
                    Display Bilik 2 (BOOTH-02)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.open('/booth/BOOTH-03', '_blank')} className="cursor-pointer">
                    Display Bilik 3 (BOOTH-03)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* KPPS Account Management Card */}
        {currentUser?.role === 'ADMIN' && (
          <KppsManagement selectedTpsCode={selectedTps} />
        )}

        {currentUser?.role === 'ADMIN' && (
          <WitnessManagement selectedTpsCode={selectedTps} />
        )}

        {/* Manajemen Pasangan Calon (Paslon) */}
        {currentUser?.role === 'ADMIN' && (
          <Card className="bg-white border-gray-200 shadow-sm mb-8">
            <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center">
                  <UserCheck className="w-5 h-5 mr-2 text-blue-600" /> Manajemen Pasangan Calon (Paslon)
                </CardTitle>
                <CardDescription>
                  Daftar pasangan calon Walikota & Wakil Walikota Pilkada Kota Tegal yang terdaftar di sistem.
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => navigate('/admin/tambah-paslon')} className="font-semibold bg-green-600 hover:bg-green-700 text-white">
                <Plus className="mr-2 h-4 w-4" /> Tambah Paslon
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              {candidatePairsList.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">Belum ada Pasangan Calon terdaftar.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">No. Urut</TableHead>
                      <TableHead className="w-24">Foto KPU</TableHead>
                      <TableHead>Calon Walikota & Wakil Walikota</TableHead>
                      <TableHead>Partai / Koalisi Pengusung</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidatePairsList.map((cp) => (
                      <TableRow key={cp.id}>
                        <TableCell className="font-bold text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-600 text-white font-black text-xs">
                            {cp.ballot_number.toString().padStart(2, '0')}
                          </span>
                        </TableCell>
                        <TableCell>
                          {cp.photo_url ? (
                            <div className="w-12 h-16 rounded overflow-hidden border border-red-600 shadow-xs bg-white">
                              <img 
                                src={cp.photo_url.startsWith('http') ? cp.photo_url : `/api${cp.photo_url}`} 
                                alt={cp.candidate_name}
                                className="w-full h-full object-cover object-top"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-16 rounded border border-gray-200 bg-gray-100 flex items-center justify-center text-gray-400 text-xs text-center p-1 font-semibold">
                              Tidak ada foto
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="font-bold text-slate-900">{cp.candidate_name}</p>
                          <p className="text-xs text-slate-500 font-medium">Wakil: {cp.vice_candidate_name}</p>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 font-medium">
                          {cp.coalition_name || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" className="font-semibold text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => handleOpenEditPaslonModal(cp)}>
                              <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit Paslon
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline" className="font-semibold text-red-600 border-red-200 hover:bg-red-50">
                                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Hapus
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="sm:max-w-[500px]">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Pilih Metode Hapus Paslon No. {cp.ballot_number}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Pilih opsi penghapusan untuk <strong className="text-slate-900">{cp.candidate_name} & {cp.vice_candidate_name}</strong>:
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="py-2 space-y-3">
                                  <div className="p-3 border border-amber-200 bg-amber-50 rounded-lg text-xs text-amber-900 leading-relaxed">
                                    <strong>🔹 Soft Delete (Nonaktifkan Paslon):</strong> Menyembunyikan paslon dari kertas suara & bilik voting tanpa menghapus data histori dari database.
                                  </div>
                                  <div className="p-3 border border-red-200 bg-red-50 rounded-lg text-xs text-red-900 leading-relaxed">
                                    <strong>🚨 Hard Delete (Hapus Permanen):</strong> Menghapus total pasangan calon ini dari database secara permanen.
                                  </div>
                                </div>
                                <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteCandidatePair(cp.id, cp.candidate_name, 'soft')}
                                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                                  >
                                    Soft Delete (Sembunyikan)
                                  </AlertDialogAction>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteCandidatePair(cp.id, cp.candidate_name, 'hard')}
                                    className="bg-red-600 hover:bg-red-700 text-white font-bold"
                                  >
                                    Hard Delete (Permanen)
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Manajemen TPS & Data DPT */}
        {currentUser?.role === 'ADMIN' && (
          <Card className="bg-white border-gray-200 shadow-sm mb-8">
            <CardHeader className="pb-3 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center">
                  <Building className="w-5 h-5 mr-2 text-blue-600" /> Manajemen TPS & Data DPT
                </CardTitle>
                <CardDescription>
                  Kelola data 377 TPS Kota Tegal secara massal via Excel atau manual.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                  ref={tpsFileInputRef}
                  onChange={handleImportTps}
                />
                <Button size="sm" variant="outline" className="font-semibold text-green-600 border-green-200 hover:bg-green-50" onClick={() => tpsFileInputRef.current?.click()} disabled={isImportingTps}>
                  {isImportingTps ? <RotateCcw className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Import via Excel
                </Button>
                <Button size="sm" variant="outline" className="font-semibold text-blue-600 border-blue-200 hover:bg-blue-50" onClick={handleDownloadTpsTemplate}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Template Excel
                </Button>
                <Button size="sm" variant="outline" className="font-semibold text-slate-600 border-slate-300 hover:bg-slate-100" onClick={handleExportTps}>
                  <Download className="mr-2 h-4 w-4" /> Export Excel
                </Button>
                <Button size="sm" variant="default" className="font-semibold bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setIsTpsModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Tambah TPS Manual
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {fullTpsList.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">Belum ada TPS terdaftar.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kode TPS</TableHead>
                      <TableHead>Lokasi Spesifik / Alamat</TableHead>
                      <TableHead>Jumlah DPT</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fullTpsList.map((tps) => (
                      <TableRow key={tps.id}>
                        <TableCell className="font-bold text-blue-600">{tps.tps_code}</TableCell>
                        <TableCell>{tps.address || '-'}</TableCell>
                        <TableCell className="font-semibold">{tps.registered_voters_total ?? 100} Pemilih</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={tps.status === 'OPEN' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700'}>
                            {tps.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => handleOpenEditModal(tps)}>
                            <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="h-8 text-red-600 border-red-200 hover:bg-red-50">
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus TPS {tps.tps_code}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Apakah Anda yakin ingin menghapus <strong>{tps.tps_code} ({tps.address})</strong>? Data TPS ini akan dihapus dari sistem.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteTps(tps.id, tps.tps_code)} className="bg-red-600 hover:bg-red-700 text-white">
                                  Ya, Hapus TPS
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Edit TPS Modal Dialog */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Data TPS ({editingTps?.tps_code})</DialogTitle>
              <DialogDescription>
                Ubah lokasi spesifik atau jumlah DPT terdaftar untuk TPS ini.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateTps} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-location">Lokasi Spesifik / Alamat</Label>
                <Input
                  id="edit-location"
                  value={editTpsLocation}
                  onChange={(e) => setEditTpsLocation(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dpt">Jumlah DPT</Label>
                <Input
                  id="edit-dpt"
                  type="number"
                  placeholder="Maksimal 500"
                  value={editTpsDpt}
                  onChange={(e) => setEditTpsDpt(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmittingEdit}>
                {isSubmittingEdit ? "Simpan Perubahan..." : "Simpan Perubahan"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Paslon Modal Dialog */}
        <Dialog open={isEditPaslonModalOpen} onOpenChange={setIsEditPaslonModalOpen}>
          <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center">
                <Edit className="w-5 h-5 mr-2 text-blue-600" /> Edit Data Pasangan Calon (No. {editingPaslon?.ballot_number})
              </DialogTitle>
              <DialogDescription>
                Ubah informasi calon walikota, calon wakil walikota, partai/koalisi, atau unggah foto KPU baru.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdatePaslon} className="space-y-4 py-2">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2 col-span-1">
                  <Label htmlFor="edit-ballot-number" className="font-semibold">Nomor Urut</Label>
                  <Input
                    id="edit-ballot-number"
                    type="number"
                    value={editPaslonForm.ballot_number}
                    onChange={(e) => setEditPaslonForm(prev => ({ ...prev, ballot_number: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="edit-coalition" className="font-semibold">Partai / Koalisi Pengusung</Label>
                  <Input
                    id="edit-coalition"
                    placeholder="e.g. PDIP, Golkar, Gerindra"
                    value={editPaslonForm.coalition_name}
                    onChange={(e) => setEditPaslonForm(prev => ({ ...prev, coalition_name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-candidate-name" className="font-semibold">Nama Calon Walikota</Label>
                <Input
                  id="edit-candidate-name"
                  value={editPaslonForm.candidate_name}
                  onChange={(e) => setEditPaslonForm(prev => ({ ...prev, candidate_name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-vice-name" className="font-semibold">Nama Calon Wakil Walikota</Label>
                <Input
                  id="edit-vice-name"
                  value={editPaslonForm.vice_candidate_name}
                  onChange={(e) => setEditPaslonForm(prev => ({ ...prev, vice_candidate_name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-motto" className="font-semibold">Motto / Slogan</Label>
                <Input
                  id="edit-motto"
                  placeholder="e.g. Tegal Maju dan Sejahtera"
                  value={editPaslonForm.motto}
                  onChange={(e) => setEditPaslonForm(prev => ({ ...prev, motto: e.target.value }))}
                />
              </div>

              {/* Upload Foto Baru */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <Label htmlFor="edit-photo" className="font-semibold">Foto Paslon (Format KPU)</Label>
                <div className="flex items-center gap-4">
                  {editingPaslon?.photo_url && !editPaslonPhoto && (
                    <div className="w-16 h-20 rounded border border-red-600 overflow-hidden shrink-0 shadow-xs bg-white">
                      <img 
                        src={editingPaslon.photo_url.startsWith('http') ? editingPaslon.photo_url : `/api${editingPaslon.photo_url}`} 
                        alt="Current" 
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      id="edit-photo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setEditPaslonPhoto(e.target.files?.[0] || null)}
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      {editPaslonPhoto ? `File terpilih: ${editPaslonPhoto.name}` : "Pilih foto baru jika ingin mengganti foto paslon yang terpasang."}
                    </p>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full font-bold bg-blue-600 hover:bg-blue-700 text-white mt-4" disabled={isSubmittingEditPaslon}>
                {isSubmittingEditPaslon ? "Menyimpan Perubahan..." : "Simpan Perubahan Paslon"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Statistics Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {selectedTps && (
            <Card className="md:col-span-3 bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-blue-900">
                  Menampilkan data untuk: <span className="font-bold">{selectedTps}</span>
                </p>
              </CardContent>
            </Card>
          )}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-slate-500">Total Pemilih</CardTitle>
              <Users className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stats.totalRegistered}</div>
              <p className="text-xs text-slate-500">Terdaftar dalam DPT</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-slate-500">Suara Masuk</CardTitle>
              <Vote className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stats.totalVotes}</div>
              <p className="text-xs text-slate-500">
                {stats.participation}% partisipasi
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Perolehan Suara per Calon</CardTitle>
              <CardDescription className="text-slate-500">Grafik batang real-time</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.candidates.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-slate-500 font-medium border border-dashed border-slate-200 rounded-md bg-slate-50">
                  Belum ada paslon
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.candidates}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#64748b" 
                      interval={0} 
                      tick={{ fontSize: 12 }} 
                      tickFormatter={(value) => value.length > 20 ? `${value.substring(0, 20)}...` : value}
                    />
                    <YAxis stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0' }} />
                    <Legend />
                    <Bar dataKey="votes" fill="hsl(var(--primary))" name="Jumlah Suara" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Distribusi Suara</CardTitle>
              <CardDescription className="text-slate-500">Diagram lingkaran</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.candidates.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-slate-500 font-medium border border-dashed border-slate-200 rounded-md bg-slate-50">
                  Belum ada paslon
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.candidates}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, votes }) => `${name.length > 20 ? name.substring(0, 20) + '...' : name}: ${votes}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="votes"
                    >
                      {stats.candidates.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Booth Unlock Panel */}
        <Card className="bg-white border-gray-200 shadow-sm mt-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-slate-900">Control Panel Bilik Suara</CardTitle>
              <CardDescription className="text-slate-500">Aktifkan bilik suara (Kiosk Mode) untuk pemilih yang telah diverifikasi</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-10 space-y-6">
            <div className="text-center space-y-2">
              <p className="text-slate-600 max-w-lg mx-auto">
                Setelah memverifikasi identitas pemilih secara fisik, pilih bilik suara dan klik tombol di bawah untuk membukanya bagi pemilih.
              </p>
            </div>
            
            <div className="w-full max-w-md space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">1. Pilih Bilik Suara Target:</label>
                <Select value={selectedBoothToUnlock} onValueChange={setSelectedBoothToUnlock}>
                  <SelectTrigger className="w-full text-base h-11 bg-white border-slate-300">
                    <SelectValue placeholder="Pilih Bilik Suara" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BOOTH-01">Bilik Suara 1 (BOOTH-01)</SelectItem>
                    <SelectItem value="BOOTH-02">Bilik Suara 2 (BOOTH-02)</SelectItem>
                    <SelectItem value="BOOTH-03">Bilik Suara 3 (BOOTH-03)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">2. Jenis Kelamin Pemilih (Sesuai KTP):</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setVoterGender('L')}
                    className={`py-3 px-4 rounded-lg font-bold flex items-center justify-center border transition-all ${
                      voterGender === 'L'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Laki-Laki (L)
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoterGender('P')}
                    className={`py-3 px-4 rounded-lg font-bold flex items-center justify-center border transition-all ${
                      voterGender === 'P'
                        ? 'bg-pink-600 text-white border-pink-600 shadow-md'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Perempuan (P)
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-3 cursor-pointer bg-white p-3 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    checked={isDisability}
                    onChange={(e) => setIsDisability(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-800">Pemilih Disabilitas (Centang jika Berlaku)</span>
                </label>
              </div>

              <Button 
                size="lg" 
                onClick={handleUnlockBooth} 
                disabled={isGeneratingToken}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 text-lg shadow-xl"
              >
                {isGeneratingToken ? "Memproses..." : `Buka ${selectedBoothToUnlock} (${voterGender === 'L' ? 'Laki-Laki' : 'Perempuan'})`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="text-center text-sm text-slate-500 py-8">
        Simulasi Sistem E-Voting – 2025
      </footer>
    </div>
  );
};

export default AdminDashboard;
