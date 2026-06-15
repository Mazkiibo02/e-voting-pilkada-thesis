import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getActiveBoothSession, castVote, ActiveSession, CandidatePair } from "@/services/boothApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Vote, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  Check, 
  ArrowLeft, 
  Clock, 
  ShieldCheck 
} from "lucide-react";
import { toast } from "sonner";

type UIState = "waiting" | "active" | "confirm" | "success" | "error";

const BoothVoting = () => {
  const { boothId } = useParams<{ boothId: string }>();
  const navigate = useNavigate();

  const [uiState, setUiState] = useState<UIState>("waiting");
  const [sessionData, setSessionData] = useState<ActiveSession | null>(null);
  const [selectedPair, setSelectedPair] = useState<CandidatePair | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentBoothId = boothId || "BOOTH-UNKNOWN";

  // Polling logic for Active Voting Session
  const pollSession = async () => {
    try {
      const response = await getActiveBoothSession(currentBoothId);
      
      // If we are in "success" or "error" screen, do not override state automatically
      if (uiState === "success" || uiState === "error" || uiState === "confirm") {
        // However, if the session is completely gone (null), and we are in confirm,
        // it means KPPS expired/cancelled the session from the backend.
        if (!response.data && uiState === "confirm") {
          setUiState("waiting");
          setSessionData(null);
          setSelectedPair(null);
          toast.warning("Sesi voting telah dibatalkan oleh petugas KPPS.");
        }
        return;
      }

      if (response.data) {
        // Active session found
        setSessionData(response.data);
        if (uiState === "waiting") {
          setUiState("active");
          setSelectedPair(null);
          setErrorMessage(null);
        }
      } else {
        // No active session
        setSessionData(null);
        if (uiState !== "waiting") {
          setUiState("waiting");
          setSelectedPair(null);
        }
      }
    } catch (err: any) {
      // Don't toast error on every poll fail to prevent annoying UI alerts
      console.error("Error polling session:", err);
    }
  };

  // Start polling when mounted or state changes
  useEffect(() => {
    // Poll immediately
    pollSession();

    // Set interval 1.5 seconds
    pollingIntervalRef.current = setInterval(pollSession, 1500);

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [currentBoothId, uiState]);

  // Handle countdown on session expiry
  useEffect(() => {
    if (!sessionData?.expiresAt || uiState !== "active") {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const difference = new Date(sessionData.expiresAt).getTime() - Date.now();
      if (difference <= 0) {
        setTimeLeft(0);
        setUiState("error");
        setErrorMessage("Sesi voting telah kedaluwarsa. Silakan hubungi petugas KPPS.");
        setSessionData(null);
        setSelectedPair(null);
      } else {
        setTimeLeft(Math.floor(difference / 1000));
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [sessionData, uiState]);

  // Handle countdown on Success State for auto-redirect
  useEffect(() => {
    if (uiState !== "success") return;

    setCountdown(5);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          // Return to waiting
          setUiState("waiting");
          setSessionData(null);
          setSelectedPair(null);
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [uiState]);

  // Format countdown time display (e.g. 02:30)
  const formatTimeLeft = (seconds: number | null) => {
    if (seconds === null || seconds < 0) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Cast vote action
  const handleCastVote = async () => {
    if (!sessionData || !selectedPair) return;

    setIsSubmitting(true);
    try {
      await castVote(sessionData.sessionId, selectedPair.id);
      setUiState("success");
      setErrorMessage(null);
    } catch (err: any) {
      console.error("Error casting vote:", err);
      setUiState("error");
      setErrorMessage(err.message || "Gagal menyimpan suara ke dalam sistem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetToWaiting = () => {
    setUiState("waiting");
    setSessionData(null);
    setSelectedPair(null);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/10 p-2 rounded-xl border border-blue-500/20 text-blue-400">
              <Vote className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Website E-Voting Pilkada
              </h1>
              <p className="text-xs text-slate-400">Bilik Suara Digital • {currentBoothId}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {uiState === "active" && timeLeft !== null && (
              <Badge variant="outline" className={`flex items-center gap-1.5 px-3 py-1 text-sm border font-mono ${
                timeLeft < 30 ? "border-red-500/30 bg-red-500/10 text-red-400 animate-pulse" : "border-slate-800 bg-slate-900 text-slate-300"
              }`}>
                <Clock className="h-4 w-4" />
                Sisa Waktu: {formatTimeLeft(timeLeft)}
              </Badge>
            )}
            <Badge variant="outline" className="border-slate-800 bg-slate-900 text-slate-300 px-3 py-1 flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${sessionData ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              {sessionData ? "Terhubung" : "Standby"}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-6 py-10 flex flex-col justify-center max-w-6xl">
        
        {/* STATE 1: WAITING SCREEN */}
        {uiState === "waiting" && (
          <div className="text-center max-w-xl mx-auto space-y-8 py-10">
            <div className="relative flex justify-center items-center">
              <div className="absolute h-24 w-24 rounded-full bg-blue-500/10 animate-ping border border-blue-500/20" />
              <div className="absolute h-16 w-16 rounded-full bg-indigo-500/10 animate-pulse border border-indigo-500/20" />
              <div className="relative bg-slate-900 p-6 rounded-2xl border border-slate-800 text-blue-400 shadow-xl">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-slate-100">Menunggu Sesi Voting Aktif</h2>
              <p className="text-slate-400 leading-relaxed text-sm md:text-base">
                Silakan hubungi petugas KPPS di meja pelayanan untuk memverifikasi data Anda dan mengaktifkan bilik suara ini.
              </p>
            </div>

            <Card className="border-slate-900 bg-slate-900/40 backdrop-blur-md py-4">
              <CardContent className="p-0 flex flex-col items-center justify-center space-y-1">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Identifikasi Perangkat</span>
                <span className="text-xl font-bold text-slate-300 font-mono tracking-wide">{currentBoothId}</span>
              </CardContent>
            </Card>
          </div>
        )}

        {/* STATE 2: ACTIVE SELECTION SCREEN */}
        {uiState === "active" && sessionData && (
          <div className="space-y-8 animate-fade-in">
            {/* Header info */}
            <div className="border-b border-slate-900 pb-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">
                    Surat Suara Elektronik • {sessionData.election.electionType === "GOVERNOR" ? "Pemilihan Gubernur" : "Pemilihan Daerah"}
                  </span>
                  <h2 className="text-3xl font-extrabold tracking-tight text-white">
                    {sessionData.election.name}
                  </h2>
                  <p className="text-sm text-slate-400">
                    Lokasi: TPS {sessionData.tps.tpsNumber} (Kode: {sessionData.tps.tpsCode})
                  </p>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2 text-xs md:text-sm text-slate-400 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Sesi Terverifikasi • ID: {sessionData.sessionId}
                </div>
              </div>
            </div>

            {/* Instruction Banner */}
            <div className="bg-blue-950/20 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-300 text-sm">Petunjuk Penggunaan:</h4>
                <p className="text-slate-400 text-xs md:text-sm mt-0.5">
                  Ketuk kartu salah satu pasangan calon untuk memilih. Setelah memilih, tombol konfirmasi pilihan akan muncul di bagian bawah layar.
                </p>
              </div>
            </div>

            {/* Candidates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessionData.candidatePairs.map((pair) => {
                const isSelected = selectedPair?.id === pair.id;
                return (
                  <div
                    key={pair.id}
                    onClick={() => setSelectedPair(pair)}
                    className={`relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 transform active:scale-[0.98] ${
                      isSelected
                        ? "ring-4 ring-blue-500 bg-slate-900 border-transparent shadow-2xl scale-[1.02]"
                        : "bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {/* Ballot Number badge */}
                    <div className={`absolute top-4 left-4 h-12 w-12 rounded-xl flex items-center justify-center text-xl font-black ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "bg-slate-800 text-slate-400"
                    }`}>
                      {pair.ballotNumber.toString().padStart(2, "0")}
                    </div>

                    {/* Selected Indicator */}
                    {isSelected && (
                      <div className="absolute top-4 right-4 bg-blue-500 text-white p-1 rounded-full shadow-lg">
                        <Check className="h-4 w-4" />
                      </div>
                    )}

                    <div className="pt-20 px-6 pb-6 space-y-4">
                      <div className="space-y-1">
                        <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Calon Kepala Daerah</span>
                        <h3 className="text-xl font-bold text-white tracking-tight">{pair.candidateName}</h3>
                      </div>

                      <div className="border-t border-slate-800/80 my-3" />

                      <div className="space-y-1">
                        <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Calon Wakil Kepala Daerah</span>
                        <h3 className="text-xl font-bold text-slate-200 tracking-tight">{pair.viceCandidateName}</h3>
                      </div>

                      {pair.coalitionName && (
                        <div className="pt-2 space-y-1">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">Partai / Coalition Pengusung</span>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{pair.coalitionName}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Floating bar for Actions */}
            <div className="border-t border-slate-900 pt-6 flex justify-end">
              <Button
                onClick={() => setUiState("confirm")}
                size="lg"
                disabled={!selectedPair}
                className="w-full md:w-auto px-8 py-6 text-base font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xl transition-all disabled:opacity-50"
              >
                Konfirmasi Pilihan
              </Button>
            </div>
          </div>
        )}

        {/* STATE 3: CONFIRMATION SCREEN */}
        {uiState === "confirm" && sessionData && selectedPair && (
          <div className="max-w-2xl mx-auto space-y-8 animate-fade-in py-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-extrabold text-white">Konfirmasi Pilihan Anda</h2>
              <p className="text-slate-400 text-sm md:text-base">
                Mohon tinjau kembali pilihan Anda di bawah ini sebelum mengirimkan suara.
              </p>
            </div>

            {/* Selection Summary Card */}
            <Card className="border-blue-500/20 bg-slate-900/40 backdrop-blur-md overflow-hidden shadow-2xl">
              <div className="bg-blue-600/10 px-6 py-4 border-b border-blue-500/20 flex justify-between items-center">
                <span className="text-sm font-bold text-blue-400 uppercase tracking-wider">Pasangan Calon Pilihan Anda</span>
                <span className="text-lg font-black bg-blue-600 text-white px-3 py-1 rounded-lg">
                  NO. {selectedPair.ballotNumber.toString().padStart(2, "0")}
                </span>
              </div>
              <CardContent className="p-6 space-y-6">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Calon Kepala Daerah</span>
                  <p className="text-xl font-bold text-white mt-1">{selectedPair.candidateName}</p>
                </div>
                
                <div className="border-t border-slate-800/80" />

                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Calon Wakil Kepala Daerah</span>
                  <p className="text-xl font-bold text-slate-200 mt-1">{selectedPair.viceCandidateName}</p>
                </div>

                {selectedPair.coalitionName && (
                  <>
                    <div className="border-t border-slate-800/80" />
                    <div>
                      <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Koalisi Pengusung</span>
                      <p className="text-sm text-slate-400 mt-1 leading-relaxed">{selectedPair.coalitionName}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Confirmation Alert Box */}
            <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-400 text-sm">Peringatan Penting:</h4>
                <p className="text-slate-400 text-xs md:text-sm mt-0.5">
                  Suara Anda akan disimpan secara anonim. Pilihan ini bersifat final dan tidak dapat diubah, dibatalkan, atau diulang setelah Anda menekan tombol "Kirim Suara".
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setUiState("active")}
                disabled={isSubmitting}
                className="flex-1 border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white py-6"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Kembali
              </Button>
              <Button
                size="lg"
                onClick={handleCastVote}
                disabled={isSubmitting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-6 shadow-xl"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    Kirim Suara
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STATE 4: SUCCESS SCREEN */}
        {uiState === "success" && (
          <div className="text-center max-w-xl mx-auto space-y-8 py-10 animate-scale-up">
            <div className="flex justify-center">
              <div className="bg-emerald-600/10 p-5 rounded-full border border-emerald-500/20 text-emerald-500 relative">
                <div className="absolute inset-0 rounded-full bg-emerald-500/5 animate-ping" />
                <CheckCircle2 className="h-16 w-16" />
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl font-extrabold tracking-tight text-white">Suara Berhasil Disimpan</h2>
              <p className="text-slate-400 leading-relaxed text-sm md:text-base">
                Terima kasih. Hak pilih Anda telah digunakan secara sukses dan suara Anda telah tercatat ke dalam basis data TPS secara aman.
              </p>
            </div>

            <div className="pt-4 space-y-4">
              <Button
                onClick={handleResetToWaiting}
                size="lg"
                className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold py-6"
              >
                Selesai (Kembali ke Awal)
              </Button>
              
              <p className="text-xs text-slate-500 font-mono">
                Mengalihkan ke layar utama otomatis dalam {countdown} detik...
              </p>
            </div>
          </div>
        )}

        {/* STATE 5: ERROR SCREEN */}
        {uiState === "error" && (
          <div className="text-center max-w-xl mx-auto space-y-8 py-10 animate-fade-in">
            <div className="flex justify-center">
              <div className="bg-red-600/10 p-5 rounded-full border border-red-500/20 text-red-500">
                <AlertTriangle className="h-16 w-16" />
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl font-extrabold tracking-tight text-white">Pemilihan Gagal</h2>
              <p className="text-red-400 font-medium text-base">
                {errorMessage || "Terjadi kesalahan yang tidak terduga saat menyimpan suara."}
              </p>
              <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
                Silakan hubungi petugas KPPS di lokasi TPS Anda untuk memeriksa status sesi atau untuk mendapatkan sesi voting baru.
              </p>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleResetToWaiting}
                size="lg"
                className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold py-6"
              >
                Kembali ke Layar Utama
              </Button>
            </div>
          </div>
        )}

      </main>

      {/* Bottom Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 bg-slate-950/40">
        <div className="container mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>© 2026 E-Voting Pilkada • Model Sim Thesis</span>
          <span className="font-mono text-[10px] text-slate-600 bg-slate-900 px-2 py-0.5 rounded border border-slate-850">
            Secure Casting Protocol v1.0
          </span>
        </div>
      </footer>
    </div>
  );
};

export default BoothVoting;
