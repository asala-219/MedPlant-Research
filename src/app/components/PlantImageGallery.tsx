import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Leaf } from "lucide-react";
import { resolveAssetUrl } from "../../api/client";
import { useLang } from "../../i18n/LangContext";
import { t } from "../../i18n/translations";

interface Props {
  images: string[];
  alt: string;
}

export function PlantImageGallery({ images, alt }: Props) {
  const { lang } = useLang();
  const tr = t[lang];
  const [index, setIndex] = useState(0);

  const resolved = images.map(resolveAssetUrl).filter(Boolean) as string[];

  if (resolved.length === 0) {
    return (
      <div className="w-full aspect-[4/3] bg-stone-100 flex flex-col items-center justify-center gap-2 text-stone-400">
        <Leaf className="w-10 h-10 opacity-40" />
        <span className="text-xs">{tr.no_image}</span>
      </div>
    );
  }

  const prev = () => setIndex((i) => (i - 1 + resolved.length) % resolved.length);
  const next = () => setIndex((i) => (i + 1) % resolved.length);

  return (
    <div className="relative w-full aspect-[4/3] bg-stone-100 overflow-hidden group">
      <img
        key={resolved[index]}
        src={resolved[index]}
        alt={`${alt} ${index + 1}`}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
      />

      {resolved.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
            aria-label={tr.gallery_prev_image}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
            aria-label={tr.gallery_next_image}
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {resolved.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === index ? "bg-white" : "bg-white/50 hover:bg-white/80"
                }`}
                aria-label={`${tr.gallery_image} ${i + 1}`}
              />
            ))}
          </div>

          <div className="absolute top-2 right-2 bg-black/40 text-white text-xs px-2 py-0.5 rounded-full">
            {index + 1}/{resolved.length}
          </div>
        </>
      )}
    </div>
  );
}
