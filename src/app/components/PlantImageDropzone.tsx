import React, { useCallback, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { api, resolveAssetUrl } from "../../api/client";
import { useLang } from "../../i18n/LangContext";
import { t } from "../../i18n/translations";

interface Props {
  plantId: number;
  imageUrl: string | null;
  token: string;
  onUploaded: (imageUrl: string | null) => void;
  compact?: boolean;
}

export function PlantImageDropzone({ plantId, imageUrl, token, onUploaded, compact = false }: Props) {
  const { lang } = useLang();
  const tr = t[lang];
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const resolved = resolveAssetUrl(imageUrl);

  const upload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError(tr.admin_image_invalid);
      return;
    }
    setError("");
    setUploading(true);
    try {
      const res = await api.adminUploadPlantImage(token, plantId, file);
      onUploaded(res.image_url);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr.error);
    } finally {
      setUploading(false);
    }
  }, [plantId, token, onUploaded, tr]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }

  async function removeImage(e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm(tr.admin_image_remove_confirm)) return;
    setUploading(true);
    setError("");
    try {
      await api.adminDeletePlantImage(token, plantId);
      onUploaded(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr.error);
    } finally {
      setUploading(false);
    }
  }

  const h = compact ? "h-16 w-28" : "h-32 w-full";

  return (
    <div className="min-w-[7rem]">
      <div
        role="button"
        tabIndex={0}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative ${h} rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer transition-colors ${
          dragging
            ? "border-emerald-500 bg-emerald-50"
            : "border-stone-200 bg-stone-50 hover:border-emerald-300 hover:bg-emerald-50/50"
        }`}
        title={tr.admin_image_drop}
      >
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

        {uploading ? (
          <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
        ) : resolved ? (
          <>
            <img src={resolved} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
              <ImagePlus className="w-5 h-5 text-white" />
            </div>
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/50 text-white hover:bg-red-600 z-10"
              title={tr.admin_image_remove}
            >
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-0.5 px-1 text-center pointer-events-none">
            <ImagePlus className="w-4 h-4 text-stone-400" />
            <span className="text-[10px] text-stone-400 leading-tight">{tr.admin_image_drop}</span>
          </div>
        )}
      </div>
      {error && <p className="text-[10px] text-red-600 mt-1 max-w-[7rem]">{error}</p>}
    </div>
  );
}
