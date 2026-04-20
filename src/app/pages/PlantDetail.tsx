import React, { useEffect } from "react";
import { useParams, Link } from "react-router";
import { plantsData } from "../data";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { ArrowLeft, Leaf, FlaskConical, Stethoscope, BookOpen, Fingerprint } from "lucide-react";

export function PlantDetail() {
  const { id } = useParams();
  const plant = plantsData.find(p => p.id === id);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (!plant) {
    return (
      <main className="max-w-[1400px] mx-auto px-6 py-32 text-center flex flex-col items-center">
        <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-6">
          <Leaf className="w-8 h-8 text-stone-300" />
        </div>
        <h2 className="text-2xl font-bold font-serif text-stone-900 mb-2">Plant Not Found</h2>
        <p className="text-stone-500 mb-8">The plant record you're looking for does not exist or has been removed.</p>
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 bg-stone-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-emerald-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Database
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-[1400px] mx-auto px-6 py-10 pb-24">
      {/* Back Button */}
      <Link 
        to="/" 
        className="inline-flex items-center gap-2 text-stone-500 hover:text-emerald-700 font-medium mb-10 transition-colors group"
      >
        <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center group-hover:border-emerald-200 group-hover:bg-emerald-50 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </div>
        Back to Database
      </Link>

      <div className="flex flex-col lg:flex-row gap-12 xl:gap-20">
        
        {/* Left Column: Image */}
        <div className="w-full lg:w-[45%]">
          <div className="sticky top-24">
            <div className="aspect-[4/5] rounded-[2rem] overflow-hidden bg-stone-100 border border-stone-200 shadow-xl shadow-stone-200/50 relative group">
              <ImageWithFallback 
                src={plant.imageUrl} 
                alt={plant.scientificName} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
            
            {/* Quick Facts Card */}
            <div className="mt-8 bg-white border border-stone-100 p-6 rounded-3xl shadow-sm">
              <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4">Quick Reference</h3>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center py-2 border-b border-stone-50">
                  <span className="text-stone-500">Family</span>
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md text-sm">{plant.family}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-stone-50">
                  <span className="text-stone-500">Part Used</span>
                  <span className="font-semibold text-stone-700 bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-md text-sm">{plant.partUsed}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-stone-500">IMPPAT ID</span>
                  <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md text-sm">{plant.imppatId}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Information */}
        <div className="w-full lg:w-[55%] flex flex-col">
          
          {/* Header */}
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 w-fit text-xs font-bold uppercase tracking-widest mb-4">
              <Leaf className="w-3.5 h-3.5" />
              <span>Plant Profile</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold italic text-stone-900 mb-3 tracking-tight">
              {plant.scientificName}
            </h1>
            
            <div className="flex items-center gap-4 text-xl md:text-2xl text-stone-500 font-medium">
              <span>Local Name: <strong className="text-stone-800">{plant.localName}</strong></span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="flex flex-col gap-8">
            
            {/* Traditional Use */}
            <div className="bg-white p-8 rounded-[2rem] border border-stone-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                <Stethoscope className="w-48 h-48" />
              </div>
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-serif font-bold text-stone-900">Traditional Use</h2>
              </div>
              <p className="text-lg text-stone-600 leading-relaxed relative z-10">
                In traditional Omani ethnomedicine, the {plant.partUsed.toLowerCase()} of <span className="italic">{plant.scientificName}</span> are primarily utilized for <strong className="text-stone-900">{plant.traditionalUse.toLowerCase()}</strong>. This application stems from generations of indigenous botanical knowledge passed down through local healers.
              </p>
            </div>

            {/* Phytochemicals */}
            <div className="bg-white p-8 rounded-[2rem] border border-stone-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                <FlaskConical className="w-48 h-48" />
              </div>
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FlaskConical className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-serif font-bold text-stone-900">Phytochemical Profile</h2>
              </div>
              <div className="relative z-10 flex flex-wrap gap-3">
                {plant.phytochemicals.split(",").map((compound, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-stone-50 border border-stone-200 px-4 py-2.5 rounded-xl">
                    <Fingerprint className="w-4 h-4 text-emerald-500" />
                    <span className="font-mono font-bold text-stone-700 text-sm">{compound.trim()}</span>
                  </div>
                ))}
              </div>
              <p className="text-stone-500 mt-6 leading-relaxed text-sm">
                These isolated bioactive compounds are documented in standard phytochemical databases and are believed to be the primary metabolic agents responsible for the plant's ethnomedicinal properties.
              </p>
            </div>

            {/* Scientific Literature */}
            <div className="bg-stone-900 text-stone-300 p-8 rounded-[2rem] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
                <BookOpen className="w-48 h-48 text-white" />
              </div>
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-stone-800 text-stone-300 flex items-center justify-center">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-serif font-bold text-white">Literature Source</h2>
              </div>
              <p className="text-lg leading-relaxed relative z-10 mb-4">
                The traditional applications and phytochemical data for this specimen are corroborated by peer-reviewed literature:
              </p>
              <div className="bg-stone-800/50 border border-stone-700/50 p-5 rounded-xl text-stone-200 font-medium relative z-10">
                {plant.references}
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}