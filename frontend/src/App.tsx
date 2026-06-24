import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Homepage from "./pages/Homepage";
import Login from "./pages/Login";
import VoterDashboard from "./pages/VoterDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ChasilPreview from "./pages/ChasilPreview";
import AuditLogs from "./pages/AuditLogs";
import PublicResults from "./pages/PublicResults";
import BoothVoting from "./pages/BoothVoting";
import WitnessDashboard from "./pages/WitnessDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/voter" element={<VoterDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/chasil-preview" element={<ChasilPreview />} />
          <Route path="/admin/audit-logs" element={<AuditLogs />} />
          <Route path="/results" element={<PublicResults />} />
          <Route path="/booth/:boothId" element={<BoothVoting />} />
          <Route path="/witness" element={<WitnessDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
