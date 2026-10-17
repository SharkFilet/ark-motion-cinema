import React, { useRef } from 'react';
import { ComicScene } from '../data/comicSequence';
import { BookOpen, Sparkles, Upload, Check, Film, Eye, X } from 'lucide-react';

interface ComicCodexDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  scenes: ComicScene[];
  activeSceneIndex: number;
  onSelectScene: (index: number) => void;
  uploadedImages: Record<string, string>;
  onBatchImagesUploaded: (mappedImages: Record<string, string>) => void;
  generatedVideos: Record<string, string>;
  onOpenVeoStudioForScene: (scene: ComicScene) => void;
}

export const ComicCodexDrawer: React.FC<ComicCodexDrawerProps> = ({
  isOpen,
  onClose,
  scenes,
  activeSceneIndex,
  onSelectScene,
  uploadedImages,
  onBatchImagesUploaded,
  generatedVideos,
  onOpenVeoStudioForScene,
}) => {
  const batchInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle multi-file drop/selection
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newMap: Record<string, string> = { ...uploadedImages };
    let filesProcessed = 0;

    Array.from(files).forEach((file) => {
      const normalizedName = file.name.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Find matching scene by slug or alias
      const matchedScene = scenes.find((scene) => {
        const slugNorm = scene.fileSlug.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalizedName.includes(slugNorm)) return true;
        return scene.aliases.some((alias) =>
          normalizedName.includes(alias.toLowerCase().replace(/[^a-z0-9]/g, ''))
        );
      });

      if (matchedScene) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            newMap[matchedScene.id] = e.target.result as string;
            filesProcessed++;
            if (filesProcessed === files.length) {
              onBatchImagesUploaded(newMap);
            }
          }
        };
        reader.readAsDataURL(file);
      } else {
        filesProcessed++;
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-xl h-full bg-[#080d16] border-l border-amber-500/20 p-6 flex flex-col shadow-2xl text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-serif font-bold text-lg text-white">
                Archival Codex & Sequence Manager
              </h3>
              <p className="text-xs text-slate-400">
                12 Sequential Scenes &bull; Prologue 001 &rarr; StarKeep Pilot 08
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Batch Image Uploader Notice */}
        <div className="mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-amber-300">
              Drag & Drop Your Comic JPEGs
            </p>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Drop all 13 images at once—they will auto-align to Prologue001–004 and StarKeepPilot01–08!
            </p>
          </div>
          <button
            onClick={() => batchInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex items-center gap-1.5 shrink-0 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Select Files
          </button>
          <input
            ref={batchInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
        </div>

        {/* Scene List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {scenes.map((scene, idx) => {
            const isActive = idx === activeSceneIndex;
            const hasCustomImage = !!uploadedImages[scene.id];
            const hasVideo = !!generatedVideos[scene.id];

            return (
              <div
                key={scene.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-amber-500/15 border-amber-500/60 shadow-lg'
                    : 'bg-slate-900/40 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    onClick={() => onSelectScene(idx)}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-white/10 text-amber-400 font-bold">
                        #{idx + 1} &bull; {scene.fileSlug}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {scene.act.includes('PROLOGUE') ? 'ACT I: PROLOGUE' : 'ACT II: PILOT'}
                      </span>
                    </div>
                    <h4 className="font-serif font-semibold text-sm text-white hover:text-amber-300 transition-colors">
                      {scene.title}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                      {scene.summary}
                    </p>
                  </div>

                  {/* Actions / Status badges */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {hasVideo && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                        <Film className="w-3 h-3" />
                        Veo 3.1
                      </span>
                    )}
                    {hasCustomImage && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[10px] text-amber-300 font-mono flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        JPG
                      </span>
                    )}

                    <button
                      onClick={() => onOpenVeoStudioForScene(scene)}
                      title="Generate Veo AI Video for this scene"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-white/10 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onSelectScene(idx)}
                      title="Play in Cinema"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Dialogue Preview Snippet */}
                <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="italic truncate max-w-[280px]">
                    &ldquo;{scene.dialogue[0]?.text || 'Ambient camera motion'}&rdquo;
                  </span>
                  <span className="font-mono text-[10px] text-amber-500/70">
                    {scene.defaultDuration}s
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-500 flex items-center justify-between">
          <span>SHARKFILET • Star Keep Lore Ledger</span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            Close Codex
          </button>
        </div>
      </div>
    </div>
  );
};
