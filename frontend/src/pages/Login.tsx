import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getVoterByNIK, initializeMockData } from '@/lib/storage';
import { toast } from 'sonner';
import { Shield, Vote } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [voterNIK, setVoterNIK] = useState('');
  const [voterDOB, setVoterDOB] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Initialize data on component mount
  useState(() => {
    initializeMockData();
  });

  const handleVoterLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!voterNIK || !voterDOB) {
      toast.error('Mohon lengkapi NIK dan Tanggal Lahir');
      return;
    }

    const voter = getVoterByNIK(voterNIK, voterDOB);
    
    if (voter) {
      localStorage.setItem('currentVoter', JSON.stringify(voter));
      toast.success(`Selamat datang, ${voter.name}`);
      navigate('/voter');
    } else {
      toast.error('NIK atau Tanggal Lahir tidak valid');
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adminEmail || !adminPassword) {
      toast.error('Mohon lengkapi Email dan Password');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        
        if (data.user && data.user.role === 'ADMIN') {
          localStorage.setItem('isAdmin', 'true');
          toast.success('Login Admin berhasil');
          navigate('/admin');
        } else if (data.user && data.user.role === 'WITNESS') {
          toast.success('Login Saksi berhasil');
          navigate('/witness');
        } else {
          toast.success(`Login berhasil: ${data.user?.role}`);
          navigate('/');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.message || 'Email atau Password salah');
      }
    } catch (error) {
      console.error('Error admin login:', error);
      toast.error('Koneksi ke server gagal');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-4 rounded-full">
              <Vote className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">
            Simulasi Sistem E-Voting
          </h1>
          <p className="text-muted-foreground">
            Platform Voting Aman & Transparan
          </p>
        </div>

        <Tabs defaultValue="voter" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="voter">Pemilih</TabsTrigger>
            <TabsTrigger value="admin">Petugas / Saksi</TabsTrigger>
          </TabsList>

          <TabsContent value="voter">
            <Card>
              <CardHeader>
                <CardTitle>Login Pemilih</CardTitle>
                <CardDescription>
                  Masukkan NIK dan Tanggal Lahir untuk menggunakan hak pilih Anda
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVoterLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nik">Nomor Induk Kependudukan (NIK)</Label>
                    <Input
                      id="nik"
                      placeholder="3301012001850001"
                      value={voterNIK}
                      onChange={(e) => setVoterNIK(e.target.value)}
                      maxLength={16}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob">Tanggal Lahir</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={voterDOB}
                      onChange={(e) => setVoterDOB(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Login
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admin">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Login Petugas & Saksi
                </CardTitle>
                <CardDescription>
                  Akses dashboard petugas (KPPS) atau saksi (WITNESS)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@example.local"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Login
                  </Button>
                </form>
                <div className="text-xs text-muted-foreground mt-4 text-center space-y-1">
                  <div>Demo Admin: <span className="font-semibold">admin@example.local / Admin123!</span></div>
                  <div>Demo Saksi: <span className="font-semibold">witness@example.local / Witness123!</span></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <footer className="text-center text-sm text-muted-foreground mt-8">
          Simulasi Sistem E-Voting – 2025
        </footer>
      </div>
    </div>
  );
};

export default Login;
