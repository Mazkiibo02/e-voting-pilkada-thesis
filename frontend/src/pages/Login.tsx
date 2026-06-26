import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { initializeMockData } from '@/lib/storage';
import { toast } from 'sonner';
import { Shield, Vote } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Initialize data on component mount
  useState(() => {
    initializeMockData();
  });

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adminEmail || !adminPassword) {
      toast.error('Mohon lengkapi Email dan Password');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/login`, {
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-4 rounded-full text-white shadow-md">
              <Vote className="h-12 w-12" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Simulasi Sistem E-Voting
          </h1>
          <p className="text-slate-600 font-medium">
            Platform Voting Aman & Transparan
          </p>
        </div>

        <Card className="bg-white border-gray-200 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Shield className="h-5 w-5 text-blue-600" />
              Login Petugas & Saksi
            </CardTitle>
            <CardDescription className="text-slate-500">
              Akses dashboard petugas (KPPS) atau saksi (WITNESS)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.local"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="bg-white border-gray-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="bg-white border-gray-200 text-slate-900 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md">
                Login
              </Button>
            </form>
            {/* Demo credentials removed for public access */}
          </CardContent>
        </Card>

        <footer className="text-center text-sm text-slate-500 mt-8">
          Simulasi Sistem E-Voting – 2025
        </footer>
      </div>
    </div>
  );
};

export default Login;
