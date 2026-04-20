import React, { useState, useMemo } from "react";
import { Search, Filter, Download, FileText } from "lucide-react";
import { useNavigate } from "react-router";
import { plantsData } from "../data";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function DataTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [familyFilter, setFamilyFilter] = useState("All");
  const [partFilter, setPartFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const navigate = useNavigate();

  const families = ["All", ...Array.from(new Set(plantsData.map((p) => p.family)))];
  const parts = ["All", ...Array.from(new Set(plantsData.flatMap((p) => p.partUsed.split(", "))))];
  const sources = ["All", ...Array.from(new Set(plantsData.map((p) => p.references)))];

  const filteredData = useMemo(() => {
    return plantsData.filter((plant) => {
      const matchesSearch =
        plant.scientificName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plant.localName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plant.traditionalUse.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plant.phytochemicals.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFamily = familyFilter === "All" || plant.family === familyFilter;
      const matchesPart = partFilter === "All" || plant.partUsed.includes(partFilter);
      const matchesSource = sourceFilter === "All" || plant.references === sourceFilter;

      return matchesSearch && matchesFamily && matchesPart && matchesSource;
    });
  }, [searchQuery, familyFilter, partFilter, sourceFilter]);

  return (
    <div className="w-full flex flex-col gap-6 font-sans">
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-end bg-white p-6 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-stone-100">
        
        {/* Search Input */}
        <div className="flex flex-col gap-2 w-full md:w-1/3">
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider pl-1">
            Search: Plant, Disease, Compound
          </label>
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 group-focus-within:text-emerald-500 transition-colors" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:text-stone-400 font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-end">
          
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider pl-1 whitespace-nowrap">
              Filter by: Family
            </label>
            <div className="relative group">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none" />
              <select
                className="w-full pl-10 pr-10 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-700 appearance-none focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all cursor-pointer"
                value={familyFilter}
                onChange={(e) => setFamilyFilter(e.target.value)}
              >
                {families.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider pl-1 whitespace-nowrap">
              Part Used
            </label>
            <div className="relative group">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none" />
              <select
                className="w-full pl-10 pr-10 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-700 appearance-none focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all cursor-pointer"
                value={partFilter}
                onChange={(e) => setPartFilter(e.target.value)}
              >
                {parts.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider pl-1 whitespace-nowrap">
              Source
            </label>
            <div className="relative group">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none" />
              <select
                className="w-full pl-10 pr-10 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-700 appearance-none focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all cursor-pointer"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
              >
                {sources.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </div>
          </div>

          <button className="self-end flex items-center justify-center gap-2 bg-stone-900 text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-emerald-800 transition-colors h-[46px] w-full sm:w-auto shadow-md shadow-stone-200">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-stone-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-stone-600">
            <thead className="bg-stone-50/50 text-stone-500 font-semibold border-b border-stone-100 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-5 rounded-tl-3xl">Image</th>
                <th className="px-6 py-5">Family</th>
                <th className="px-6 py-5">Scientific Name</th>
                <th className="px-6 py-5">Local Name</th>
                <th className="px-6 py-5">Part Used</th>
                <th className="px-6 py-5 min-w-[150px]">Traditional Use</th>
                <th className="px-6 py-5">Phytochemicals</th>
                <th className="px-6 py-5">IMPPAT ID</th>
                <th className="px-6 py-5 rounded-tr-3xl min-w-[160px]">References</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-stone-400 bg-white">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <FileText className="h-10 w-10 text-stone-200" />
                      <p className="font-medium text-stone-500">No plants match your search criteria.</p>
                      <button 
                        onClick={() => {
                          setSearchQuery("");
                          setFamilyFilter("All");
                          setPartFilter("All");
                          setSourceFilter("All");
                        }}
                        className="text-emerald-600 hover:text-emerald-700 font-medium mt-2 underline"
                      >
                        Clear filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((plant) => (
                  <tr 
                    key={plant.id} 
                    onClick={() => navigate(`/plant/${plant.id}`)}
                    className="hover:bg-stone-50/50 transition-colors group bg-white cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-white shadow-sm bg-stone-100 relative">
                        <ImageWithFallback 
                          src={plant.imageUrl} 
                          alt={plant.scientificName} 
                          className="absolute inset-0 h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {plant.family}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-stone-900 italic">
                      {plant.scientificName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-stone-700">
                      {plant.localName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-stone-100 text-stone-600 border border-stone-200">
                        {plant.partUsed}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-stone-700 font-medium">
                      {plant.traditionalUse}
                    </td>
                    <td className="px-6 py-4 text-stone-700 font-mono text-xs font-semibold">
                      {plant.phytochemicals}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-mono text-xs font-bold cursor-pointer transition-colors border border-blue-100">
                        {plant.imppatId}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-stone-500 leading-snug">
                      {plant.references}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Microcopy & Footer */}
        <div className="bg-stone-50/50 border-t border-stone-100 px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-stone-500">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-emerald-500"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <p className="text-xs font-medium">
              Data is curated from ethnobotanical studies and phytochemical databases to ensure accuracy and traceability.
            </p>
          </div>
          <p className="text-xs font-bold text-stone-400 bg-white px-3 py-1.5 rounded-full shadow-sm border border-stone-100">
            Showing {filteredData.length} records
          </p>
        </div>
      </div>
    </div>
  );
}