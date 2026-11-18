import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/home/Navbar";
import HeroSection from "../components/home/HeroSection";
import FeaturesSection from "../components/home/FeaturesSection";
import AboutSection from "../components/home/AboutSection";
import Footer from "../components/home/Footer";
import LoginModal from "../components/home/LoginModal";

export default function Home() {
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);

  const openLogin = () => setLoginOpen(true);
  const closeLogin = () => setLoginOpen(false);
  const handleLogin = (path, state) => {
    closeLogin();

    navigate(path, {
      state,
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <Navbar onLoginClick={openLogin} />
      <HeroSection onGetStarted={openLogin} />
      <FeaturesSection />
      <AboutSection />
      <Footer />
      {loginOpen && <LoginModal onClose={closeLogin} onLogin={handleLogin} />}
    </div>
  );
}
