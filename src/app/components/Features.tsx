import React from "react";
import { Search, GitGraph, FileText, FlaskConical, Download } from "lucide-react";

const features = [
  {
    title: "Smart Search",
    description: "Search by plant name, Arabic name, disease, or compound.",
    icon: Search,
    color: "bg-blue-100 text-blue-700",
  },
  {
    title: "Interactive Knowledge Graph",
    description: "Visualize relationships between plants, compounds, and diseases.",
    icon: GitGraph,
    color: "bg-purple-100 text-purple-700",
  },
  {
    title: "Structured Plant Profiles",
    description: "Access detailed plant data including classification, uses, and sources.",
    icon: FileText,
    color: "bg-amber-100 text-amber-700",
  },
  {
    title: "Phytochemical Insights",
    description: "Explore compounds and their biological relevance.",
    icon: FlaskConical,
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    title: "Downloadable Data",
    description: "Export datasets in CSV or Excel format for research and integration.",
    icon: Download,
    color: "bg-rose-100 text-rose-700",
  },
];

export function Features() {
  return (
    <div className="py-16">
      <div className="mb-12 text-center md:text-left">
        <h2 className="text-3xl font-serif font-bold text-stone-900 mb-4">
          Powerful Features Designed for Discovery
        </h2>
        <p className="text-stone-500 max-w-2xl text-lg leading-relaxed">
          Access specialized ethnobotanical and phytochemical tools to turn historical knowledge into actionable scientific insights.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <div
            key={index}
            className="group bg-white rounded-2xl p-6 border border-stone-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-default"
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${feature.color} group-hover:scale-110 transition-transform duration-300`}
            >
              <feature.icon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-stone-900 mb-3 tracking-tight">
              {feature.title}
            </h3>
            <p className="text-stone-500 leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}