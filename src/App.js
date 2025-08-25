
import React from "react";
import { BrowserRouter as Router, Routes, Route, NavLink, Link } from "react-router-dom";
import Landing from "./pages/Landing";
import Upload from "./pages/Upload";
import Summary from "./pages/Summary";
import "./index.css";

function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200">
      <nav className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight text-slate-800">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block"></span>
          <span>iShip Vessel Inspection AI</span>
        </Link>
        <div className="flex items-center gap-2">
          <NavLink to="/" end className={({isActive}) => `navlink ${isActive ? "active" : ""}`}>Home</NavLink>
          <NavLink to="/upload" className={({isActive}) => `navlink ${isActive ? "active" : ""}`}>Upload</NavLink>
          <NavLink to="/summary" className={({isActive}) => `navlink ${isActive ? "active" : ""}`}>Summary</NavLink>
          <Link to="/upload" className="ml-2 px-4 py-2 rounded-xl bg-sky-600 text-white font-semibold shadow-lg hover:bg-sky-500">
            New Inspection
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <Router>
      <div className="radial-spot min-h-screen">
        <Header />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/summary" element={<Summary />} />
        </Routes>
      </div>
    </Router>
  );
}
