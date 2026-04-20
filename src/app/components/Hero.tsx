import React from "react";
import { Leaf } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function Hero() {
  return (
    <div className="relative overflow-hidden bg-stone-900 rounded-[2.5rem] p-10 md:p-16 text-stone-100 flex flex-col md:flex-row items-center justify-between shadow-2xl my-8">
      {/* Background Pattern / Image */}
      <div className="absolute inset-0 z-0 opacity-20">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1609138429624-82b48e5f4cb0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxib3RhbmljYWwlMjBsYWJvcmF0b3J5JTIwcGxhbnQlMjBkYXRhfGVufDF8fHx8MTc3NjcwNDIxMHww&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Botanical background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-900 via-stone-900/90 to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col max-w-2xl gap-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/50 border border-emerald-800/50 text-emerald-300 w-fit text-xs font-semibold uppercase tracking-wider">
          <Leaf className="w-3.5 h-3.5" />
          <span>Ethnobotanical Studies</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-serif font-bold tracking-tight text-white leading-tight">
          Turn Traditional Knowledge into <span className="text-emerald-400 italic">Data-Driven Insight</span>
        </h1>
        
        <p className="text-lg text-stone-300 leading-relaxed md:w-5/6">
          This platform transforms scattered botanical and phytochemical data into a structured, searchable, and visual experience. From plant properties to bioactive compounds and related diseases, everything is interconnected and easy to explore.
        </p>

        <div className="flex gap-4 mt-4">
          <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-full font-medium transition-colors shadow-lg shadow-emerald-900/20">
            Explore Database
          </button>
          <button className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm px-6 py-3 rounded-full font-medium transition-colors border border-white/10">
            Learn More
          </button>
        </div>
      </div>
    </div>
  );
}