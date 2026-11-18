import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import ElectionSelection from "./pages/student/ElectionSelection";
import CandidateBallot from "./pages/student/CandidateBallot";
import BallotReview from "./pages/student/BallotReview";
import VotingConfirmation from "./pages/student/VoteConfirmation";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Students from "./pages/admin/Students";
import Elections from "./pages/admin/Elections";
import Candidates from "./pages/admin/Candidates";
import Results from "./pages/admin/Results";
import NotFound from "./pages/NotFound";
import Positions from "./pages/admin/Position";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/student/elections" element={<ElectionSelection />} />
      <Route path="/student/ballot" element={<CandidateBallot />} />
      <Route path="/student/ballot/review" element={<BallotReview />} />
      <Route path="/student/confirmation" element={<VotingConfirmation />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="students" element={<Students />} />
        <Route path="elections" element={<Elections />} />
        <Route path="candidates" element={<Candidates />} />
        <Route path="results" element={<Results />} />
        <Route path="positions" element={<Positions />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
