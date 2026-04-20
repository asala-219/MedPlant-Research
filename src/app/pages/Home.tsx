import React from "react";
import { Hero } from "../components/Hero";
import { Features } from "../components/Features";
import { DataTable } from "../components/DataTable";

export function Home() {
  return (
    <main className="max-w-[1400px] mx-auto px-6 py-12 pb-24">
      {/* Title Section */}
      <div className="mb-6">
        <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-emerald-600 mb-2">
          Botanical Database Platform
        </h2>
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-stone-900 tracking-tight">
          Oman’s Ethnomedicinal Plants
        </h1>
      </div>

      {/* Hero Section */}
      <section id="about">
        <Hero />
      </section>

      {/* Features Section */}
      <section id="features" className="mb-16">
        <Features />
      </section>

      {/* Data Table Section */}
      <section id="database" className="mt-8 scroll-mt-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-serif font-bold text-stone-900 tracking-tight">
              Plant Registry & Phytochemical Data
            </h2>
            <p className="text-stone-500 font-medium mt-2 max-w-2xl text-lg">
              Explore structured data fields including taxonomy, traditional use, and bioactive compounds sourced from authenticated ethnobotanical studies.
            </p>
          </div>
        </div>
        
        <DataTable />
      </section>
    </main>
  );
}