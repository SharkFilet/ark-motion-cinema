import React, { useState } from 'react';
import { Music, Sparkles, Loader2, Play, Pause, Download, AlertCircle, X, Check } from 'lucide-react';
import { ComicScene } from '../data/comicSequence';

interface LyriaMusicModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentScene: ComicScene;
  onTrackAttached?: (sceneId: string, audioUrl: string) => void;
}

export const LyriaMusicModal: React.FC<LyriaMusicModalProps> = ({
  isOpen,
  onClose,
  currentScene,
  onTrackAttached,
}) => {
  const [prompt, setPrompt] = useState<string>(
    `Cinematic sacred sci-fi orchestral soundtrack for ${currentScene.title}. Atmospheric ambient synth pads, ethereal choral harmonies, slow majestic strings, and distant celestial crystal chimes.`
  );
  const [model, setModel] = useState<'lyria-3-clip-preview' | 'lyria-3-pro-preview'>('lyria-3-clip-preview');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setGeneratedAudioUrl(null);

    try {
      const res = await fetch('/api/generate-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate music.');
      }

      setGeneratedAudioUrl(data.audioUrl);
      setIsGenerating(false);
    } catch (err: any) {
      setIsGenerating(false);
      setError(err.message || 'Error occurred during Lyria music generation.');
    }
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-[#0a0f18] border border-amber-500/25 rounded-2xl p-6 sm:p-8 text-slate-200 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-white flex items-center gap-2">
                Lyria AI Music Composer
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                  {model}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Generate original scores for &ldquo;{currentScene.title}&rdquo; using Lyria 3
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Model Selection */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-amber-400/90 mb-2 font-semibold">
            Music Generation Model
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setModel('lyria-3-clip-preview')}
              className={`py-2 px-3 rounded-xl border text-xs font-mono flex flex-col items-center justify-center gap-1 transition-all ${
                model === 'lyria-3-clip-preview'
                  ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-bold'
                  : 'bg-slate-900/60 border-white/10 text-slate-400 hover:border-white/20'
              }`}
            >
              <span>Lyria 3 Clip</span>
              <span className="text-[10px] text-slate-400 font-normal">Up to 30s Scene Theme</span>
            </button>
            <button
              type="button"
              onClick={() => setModel('lyria-3-pro-preview')}
              className={`py-2 px-3 rounded-xl border text-xs font-mono flex flex-col items-center justify-center gap-1 transition-all ${
                model === 'lyria-3-pro-preview'
                  ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-bold'
                  : 'bg-slate-900/60 border-white/10 text-slate-400 hover:border-white/20'
              }`}
            >
              <span>Lyria 3 Pro</span>
              <span className="text-[10px] text-slate-400 font-normal">Full-Length Track</span>
            </button>
          </div>
        </div>

        {/* Prompt */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-amber-400/90 mb-2 font-semibold">
            Soundtrack Prompt & Instruments
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="w-full bg-slate-900/90 border border-white/15 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500/50 resize-none font-sans"
            placeholder="Describe music genre, tempo, mood, and instruments..."
          />
          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[
              'Sacred ethereal choir',
              'Deep cosmic synth drone',
              'Dramatic brass battle march',
              'Emotional acoustic strings',
            ].map((p) => (
              <button
                key={p}
                onClick={() => setPrompt((prev) => `${prev}. ${p}`)}
                className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
              >
                + {p}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Playback player if generated */}
        {generatedAudioUrl && (
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-3">
            <audio
              ref={audioRef}
              src={generatedAudioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleAudio}
                  className="w-10 h-10 rounded-full bg-purple-500 hover:bg-purple-400 text-black flex items-center justify-center shadow-lg transition-transform hover:scale-105"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>
                <div>
                  <span className="text-xs font-serif font-bold text-white block">
                    {currentScene.title} (Original Score)
                  </span>
                  <span className="text-[10px] font-mono text-purple-300">
                    Generated via {model}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={generatedAudioUrl}
                  download={`${currentScene.fileSlug}-score.wav`}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                  title="Download WAV"
                >
                  <Download className="w-4 h-4" />
                </a>
                {onTrackAttached && (
                  <button
                    onClick={() => {
                      onTrackAttached(currentScene.id, generatedAudioUrl);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-1 font-mono transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Attach to Scene
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`w-full py-3.5 px-6 rounded-xl font-semibold text-xs tracking-wider uppercase font-mono flex items-center justify-center gap-2 shadow-lg transition-all ${
              isGenerating
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Composing with Lyria 3...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Score ({model === 'lyria-3-clip-preview' ? '30s Clip' : 'Full Track'})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
