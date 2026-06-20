import React, { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { api, resolveAssetUrl, type PlantImage } from "../../api/client";
import { useLang } from "../../i18n/LangContext";
import { t } from "../../i18n/translations";

interface Props {
  plantId: number;
  token: string;
  onChanged: () => void;
  compact?: boolean;
}

export function PlantImageManager({ plantId, token, onChanged, compact = false }: Props) {
  const { lang } = useLang();
  const tr = t[lang];
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<PlantImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const load = useCallback(async () => {
    try {
      const imgs = await api.adminListPlantImages(token, plantId);
      setImages(imgs);
    } catch {
      // silently ignore listing errors – plant may not exist yet
    }
  }, [token, plantId]);

  useEffect(() => { load(); }, [load]);

  const upload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError(tr.admin_image_invalid);
      return;
    }
    setError("");
    setUploading(true);
    try {
      await api.adminUploadPlantImage(token, plantId, file);
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : tr.error);
    } finally {
      setUploading(false);
    }
  }, [plantId, token, load, onChanged, tr]);

  async function removeImage(e: React.MouseEvent, img: PlantImage) {
    e.stopPropagation();
    if (!window.confirm(tr.admin_image_remove_confirm)) return;
    setError("");
    try {
      await api.adminDeletePlantImageById(token, plantId, img.id);
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : tr.error);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1 flex-wrap min-w-[7rem]">
        {images.map((img) => (
          <div key={img.id} className="relative w-12 h-12 rounded overflow-hidden border border-stone-200 shrink-0 group">
            <img src={resolveAssetUrl(img.url) ?? ""} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={(e) => removeImage(e, img)}
              className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/50 transition-colors opacity-0 group-hover:opacity-100"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`w-12 h-12 rounded border-2 border-dashed flex items-center justify-center transition-colors ${
            dragging ? "border-emerald-500 bg-emerald-50" : "border-stone-200 bg-stone-50 hover:border-emerald-300"
          }`}
          title={tr.admin_image_drop}
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
          ) : (
            <ImagePlus className="w-4 h-4 text-stone-400" />
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            e.target.value = "";
          }}
        />
        {error && <p className="text-[10px] text-red-600 w-full">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {images.map((img) => (
          <div key={img.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-stone-200 group">
            <img src={resolveAssetUrl(img.url) ?? ""} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={(e) => removeImage(e, img)}
              className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/50 text-white hover:bg-red-600 z-10"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`w-20 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors ${
            dragging ? "border-emerald-500 bg-emerald-50" : "border-stone-200 bg-stone-50 hover:border-emerald-300 hover:bg-emerald-50/50"
          }`}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
          ) : (
            <>
              <ImagePlus className="w-5 h-5 text-stone-400" />
              <span className="text-[10px] text-stone-400">{tr.admin_image_drop}</span>
            </>
          )}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
