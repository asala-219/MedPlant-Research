import React from "react";
import { Outlet, Link, useLocation } from "react-router";

export function Root() {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <div className="min-h-screen bg-[#FBFBF9] font-sans text-stone-900 overflow-x-hidden selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Header */}
      <header className="w-full bg-white border-b border-stone-200 sticky top-0 z-50 shadow-sm shadow-stone-100/50">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-inner shadow-emerald-700">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white"><path d="M4 12L8 4L12 12M20 12L16 20L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span className="text-xl font-bold font-serif tracking-tight text-stone-900">TESTVIEW :) </span>
          </Link>
          <nav className="hidden md:flex gap-8 text-sm font-semibold text-stone-600">
            {isHome ? (
              <>
                <a href="#about" className="hover:text-emerald-600 transition-colors">About</a>
                <a href="#features" className="hover:text-emerald-600 transition-colors">Features</a>
                <a href="#database" className="hover:text-emerald-600 transition-colors">Database</a>
              </>
            ) : (
              <Link to="/" className="hover:text-emerald-600 transition-colors">Back to Home</Link>
            )}
            <button className="bg-stone-900 text-white px-4 py-2 rounded-lg hover:bg-emerald-800 transition-colors">
              Access API
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content - Outlet renders child routes */}
      <Outlet />
      
      {/* Footer */}
      <footer className="bg-stone-900 text-stone-400 py-16 text-center border-t border-stone-800">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col items-center justify-center gap-6">
          <div className="flex items-center gap-3 opacity-50 mb-2">
            <div className="w-8 h-8 rounded bg-stone-700 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-stone-300"><path d="M4 12L8 4L12 12M20 12L16 20L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span className="text-lg font-bold font-serif tracking-tight text-stone-300">
              Ethnobotanica.om
            </span>
          </div>
          <p className="text-sm max-w-md mx-auto leading-relaxed">
            Data provided is for research and educational purposes. 
            Always consult a medical professional before using any ethnomedicinal remedies.
          </p>
          <div className="w-12 h-px bg-stone-800 my-2"></div>
          <p className="text-xs opacity-50 font-medium">
            © 2026 Oman Ethnobotany Project. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}