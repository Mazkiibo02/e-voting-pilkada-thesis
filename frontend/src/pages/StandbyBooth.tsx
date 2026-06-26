import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { checkBoothStatus } from '@/services/boothApi';
import { Lock, Loader2, Vote } from 'lucide-react';
import { toast } from 'sonner';

const StandbyBooth = () => {
  const navigate = useNavigate();
  const { boothId } = useParams<{ boothId: string }>();
  const currentBoothId = boothId || "BOOTH-01";

  useEffect(() => {
    // Polling function
    const pollStatus = async () => {
      try {
        const response = await checkBoothStatus(currentBoothId);
        if (response.status === "UNLOCKED" && response.data) {
          // Booth is unlocked, save token and navigate
          localStorage.setItem(`booth_token_${currentBoothId}`, response.data.token);
          toast.success('Bilik suara telah diaktifkan oleh petugas.');
          navigate(`/booth/${currentBoothId}/vote`);
        }
      } catch (error) {
        // Silent fail for polling errors to avoid spamming toasts
        console.error('Error polling booth status:', error);
      }
    };

    // Initial check
    pollStatus();

    // Set up interval for short-polling every 2 seconds
    const intervalId = setInterval(pollStatus, 2000);

    return () => clearInterval(intervalId);
  }, [currentBoothId, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md text-center space-y-8">
        <div className="flex justify-center mb-4">
          <div className="bg-slate-200 p-6 rounded-full text-slate-500 shadow-inner">
            <Lock className="h-16 w-16" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Bilik Suara {currentBoothId}
        </h1>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-slate-800">
              Bilik Suara Sedang Terkunci
            </p>
            <p className="text-slate-600">
              Silakan tunggu, petugas KPPS sedang memverifikasi data Anda dan akan segera mengaktifkan bilik suara ini.
            </p>
          </div>
        </div>

        <footer className="text-center text-sm text-slate-500 mt-8 flex justify-center items-center gap-2">
          <Vote className="h-4 w-4" /> E-Voting Pilkada • Kiosk Mode
        </footer>
      </div>
    </div>
  );
};

export default StandbyBooth;
