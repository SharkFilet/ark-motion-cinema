import React, { useState, useRef } from 'react';
import { Sparkles, Film, Upload, CheckCircle2, AlertCircle, Loader2, Download, Play, RefreshCw, X, Type, Image as ImageIcon } from 'lucide-react';
import { ComicScene } from '../data/comicSequence';

interface VeoStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentScene: ComicScene;
  onVideoGenerated: (sceneId: string, videoUrl: string) => void;
  allScenes: ComicScene[];
}

export const VeoStudioModal: React.FC<VeoStudioModalProps> = ({
  isOpen,
  onClose,
  currentScene,
  onVideoGenerated,
  allScenes,
}) => {
  const [mode, setMode] = useState<'image-to-video' | 'text-to-video'>('image-to-video');
  const [selectedSceneId, setSelectedSceneId] = useState<string>(currentScene.id);
  const activeScene = allScenes.find((s) => s.id === selectedSceneId) || currentScene;

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>(activeScene.veoPrompt);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSceneChange = (id: string) => {
    setSelectedSceneId(id);
    const scene = allScenes.find((s) => s.id === id);
    if (scene) {
      setPrompt(scene.veoPrompt);
    }
    setGeneratedVideoUrl(null);
    setError(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const startVeoGeneration = async () => {
    setIsGenerating(true);
    setError(null);
    setGeneratedVideoUrl(null);
    setProgressPercent(10);
    setGenerationStep('Submitting keyframe request to Veo 3.1 Fast engine...');

    try {
      const payload: any = {
        prompt: prompt,
        aspectRatio: aspectRatio,
      };

      if (mode === 'image-to-video' && uploadedImage) {
        payload.image = uploadedImage;
      }

      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start video generation.');
      }

      const operationName = data.operationName;
      setGenerationStep('Synthesizing temporal camera vectors and motion dynamics...');
      setProgressPercent(25);

      let pollCount = 0;
      const pollInterval = setInterval(async () => {
        pollCount++;
        const currentProgress = Math.min(92, 25 + pollCount * 6);
        setProgressPercent(currentProgress);

        if (pollCount > 3) {
          setGenerationStep('Rendering volumetric lighting and fluid dynamics...');
        }
        if (pollCount > 8) {
          setGenerationStep('Finalizing MP4 stream container...');
        }

        try {
          const statusRes = await fetch('/api/video-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operationName }),
          });

          const statusData = await statusRes.json();

          if (statusData.done) {
            clearInterval(pollInterval);
            setProgressPercent(98);
            setGenerationStep('Downloading generated MP4 video...');

            if (statusData.error) {
              throw new Error(statusData.error.message || 'Generation error reported by Veo.');
            }

            const downloadRes = await fetch('/api/video-download', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ operationName }),
            });

            if (!downloadRes.ok) {
              throw new Error('Failed to download generated video stream.');
            }

            const videoBlob = await downloadRes.blob();
            const videoUrl = URL.createObjectURL(videoBlob);

            setGeneratedVideoUrl(videoUrl);
            setIsGenerating(false);
            setProgressPercent(100);
            setGenerationStep('Complete!');
            onVideoGenerated(activeScene.id, videoUrl);
          }
        } catch (pollErr: any) {
          clearInterval(pollInterval);
          setIsGenerating(false);
          setError(pollErr.message || 'Error while polling video generation.');
        }
      }, 3000);
    } catch (err: any) {
      setIsGenerating(false);
      setError(err.message || 'Failed to generate video.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0a0f18] border border-amber-500/20 rounded-2xl p-6 sm:p-8 shadow-2xl text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-white/10 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Film className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-wide font-serif text-white flex items-center gap-2">
                Veo 3.1 AI Video Generation Studio
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                  veo-3.1-fast-generate-preview
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Generate high-definition cinematic videos from text or animate uploaded photos and comic pages.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (Animate Photo vs Text-to-Video) */}
        <div className="flex items-center gap-3 mb-6 bg-slate-900/80 border border-white/10 p-1 rounded-xl w-fit">
          <button
            onClick={() => setMode('image-to-video')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 transition-all ${
              mode === 'image-to-video'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Animate Photo into Video
          </button>
          <button
            onClick={() => setMode('text-to-video')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 transition-all ${
              mode === 'text-to-video'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            Generate Video from Text
          </button>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Image Source or Target Page */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-amber-400/90 mb-2 font-semibold">
                Target Scene in Movie Sequence
              </label>
              <select
                value={selectedSceneId}
                onChange={(e) => handleSceneChange(e.target.value)}
                className="w-full bg-slate-900/90 border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50 mb-3"
              >
                {allScenes.map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.fileSlug.toUpperCase()}] {s.title}
                  </option>
                ))}
              </select>

              {mode === 'image-to-video' && (
                <>
                  <label className="block text-xs font-mono uppercase tracking-wider text-amber-400/90 mb-2 font-semibold">
                    Upload Photo / Keyframe
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${
                      uploadedImage
                        ? 'border-amber-500/50 bg-amber-500/5'
                        : 'border-white/15 hover:border-amber-500/40 bg-slate-900/40'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    {uploadedImage ? (
                      <div className="relative w-full h-44 rounded-lg overflow-hidden flex items-center justify-center bg-black/50">
                        <img src={uploadedImage} alt="Uploaded keyframe" className="w-full h-full object-contain" />
                        <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/80 text-[10px] text-amber-300 font-mono">
                          Custom Photo Loaded
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center">
                        <Upload className="w-8 h-8 text-amber-400/70 mx-auto mb-2" />
                        <p className="text-sm font-medium text-slate-200">
                          Click to upload photo / comic page
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          JPG, PNG, or WebP
                        </p>
                      </div>
                    )}
                  </div>

                  {uploadedImage && (
                    <button
                      type="button"
                      onClick={() => setUploadedImage(null)}
                      className="text-xs text-rose-400 hover:text-rose-300 mt-1.5 flex items-center gap-1"
                    >
                      Clear uploaded photo
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Aspect Ratio Selector (16:9 or 9:16) */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-amber-400/90 mb-2 font-semibold">
                Aspect Ratio
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAspectRatio('16:9')}
                  className={`py-2.5 px-4 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                    aspectRatio === '16:9'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md'
                      : 'bg-slate-900/60 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <span className="w-4 h-2.5 border border-current rounded-xs" />
                  16:9 (Landscape)
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio('9:16')}
                  className={`py-2.5 px-4 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                    aspectRatio === '9:16'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md'
                      : 'bg-slate-900/60 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <span className="w-2.5 h-4 border border-current rounded-xs" />
                  9:16 (Portrait)
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Prompt & Generation Trigger */}
          <div className="space-y-4 flex flex-col justify-between">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-amber-400/90 mb-2 font-semibold">
                Cinematography Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="w-full bg-slate-900/90 border border-white/15 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500/50 resize-none font-sans"
                placeholder="Describe camera movement, lighting, visual effects, and scene mood..."
              />

              {/* Quick Prompt Presets */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  'Cinematic slow pan',
                  'Sacred Arcanum light pulse',
                  'Dynamic waterfall mist zoom',
                  'Dramatic eye close-up push',
                  'Gentle floating dust particles',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPrompt((prev) => `${prev}. ${preset}`)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Video Result or Progress */}
            {isGenerating && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs text-amber-300 font-mono">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {generationStep}
                  </span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {generatedVideoUrl && !isGenerating && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Video Generation Succeeded
                  </span>
                  <a
                    href={generatedVideoUrl}
                    download={`${activeScene.fileSlug}-veo.mp4`}
                    className="text-xs text-emerald-300 hover:text-white flex items-center gap-1 font-mono"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Save MP4
                  </a>
                </div>

                <div className="rounded-lg overflow-hidden border border-emerald-500/30 bg-black aspect-video max-h-48">
                  <video src={generatedVideoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                </div>
              </div>
            )}

            {/* Generate Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={startVeoGeneration}
                disabled={isGenerating}
                className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm tracking-wide flex items-center justify-center gap-2.5 shadow-lg transition-all ${
                  isGenerating
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 text-black font-bold'
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Video with Veo 3.1 Fast...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Veo Video ({aspectRatio})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-500">
          <span>Powered by @google/genai &bull; Model: veo-3.1-fast-generate-preview</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            Close Studio
          </button>
        </div>
      </div>
    </div>
  );
};
