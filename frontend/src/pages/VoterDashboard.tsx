import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCandidates, updateVoter, updateCandidateVote, type Voter, type Candidate } from '@/lib/storage';
import { toast } from 'sonner';
import { Shield, CheckCircle2, AlertTriangle, LogOut, Vote } from 'lucide-react';

const VoterDashboard = () => {
  const navigate = useNavigate();
  const [voter, setVoter] = useState<Voter | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<string>('');

  useEffect(() => {
    const storedVoter = localStorage.getItem('currentVoter');
    if (!storedVoter) {
      navigate('/');
      return;
    }
    
    const voterData: Voter = JSON.parse(storedVoter);
    setVoter(voterData);
    setCandidates(getCandidates());
  }, [navigate]);

  const handleVote = () => {
    if (!selectedCandidate) {
      toast.error('Mohon pilih salah satu calon');
      return;
    }

    if (voter && !voter.hasVoted) {
      updateVoter(voter.nik, { hasVoted: true, votedFor: selectedCandidate });
      updateCandidateVote(selectedCandidate);
      
      const updatedVoter = { ...voter, hasVoted: true, votedFor: selectedCandidate };
      setVoter(updatedVoter);
      localStorage.setItem('currentVoter', JSON.stringify(updatedVoter));
      
      toast.success('Suara Anda telah berhasil tercatat secara aman!');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('currentVoter');
    toast.info('Anda telah logout');
    navigate('/');
  };

  if (!voter) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Vote className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold">e-Voting Pilkades Krandon 2025</h1>
              <p className="text-sm opacity-90">Dashboard Pemilih</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Keluar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Voter Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Informasi Pemilih</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nama</p>
                <p className="font-semibold">{voter.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">NIK</p>
                <p className="font-semibold">{voter.nik}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="outline" className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Terverifikasi Blockchain
              </Badge>
              
              {voter.anomaly ? (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Anomali Terdeteksi: {voter.anomaly}
                </Badge>
              ) : (
                <Badge className="flex items-center gap-1 bg-success text-success-foreground">
                  <CheckCircle2 className="h-3 w-3" />
                  AI Check: Tidak Ada Anomali
                </Badge>
              )}
              
              {voter.hasVoted && (
                <Badge className="flex items-center gap-1 bg-success text-success-foreground">
                  <CheckCircle2 className="h-3 w-3" />
                  Sudah Memilih
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Voting Section */}
        {voter.hasVoted ? (
          <Card className="border-success">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-6 w-6" />
                Suara Anda Telah Tercatat
              </CardTitle>
              <CardDescription>
                Terima kasih telah menggunakan hak pilih Anda. Suara Anda telah tersimpan dengan aman menggunakan teknologi blockchain.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Anda telah memilih pada Pilkades Desa Krandon 2025. Hasil pemilihan akan diumumkan setelah periode pemilihan berakhir.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Pilih Calon Kepala Desa</CardTitle>
              <CardDescription>
                Pilih salah satu calon kepala desa. Anda hanya dapat memilih satu kali.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {candidates.map((candidate) => (
                  <Card 
                    key={candidate.id}
                    className={`cursor-pointer transition-all ${
                      selectedCandidate === candidate.id 
                        ? 'border-primary bg-secondary' 
                        : 'hover:border-muted-foreground'
                    }`}
                    onClick={() => setSelectedCandidate(candidate.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <input
                          type="radio"
                          name="candidate"
                          checked={selectedCandidate === candidate.id}
                          onChange={() => setSelectedCandidate(candidate.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <h3 className="font-bold text-lg mb-1">{candidate.name}</h3>
                          <p className="text-sm text-muted-foreground">{candidate.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button 
                onClick={handleVote} 
                className="w-full mt-6"
                size="lg"
                disabled={!selectedCandidate}
              >
                <Vote className="h-5 w-5 mr-2" />
                Kirim Suara
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="text-center text-sm text-muted-foreground py-8">
        Prototype e-Voting System – Desa Krandon 2025
      </footer>
    </div>
  );
};

export default VoterDashboard;
