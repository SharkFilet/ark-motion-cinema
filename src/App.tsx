import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sparkles,
  BookOpen,
  Film,
  Layers,
  Info,
  RotateCcw,
  Gamepad2,
  Music,
  Mic,
  Radio,
  Tv,
  Smartphone,
  Shield,
} from 'lucide-react';

import { COMIC_SCENES, ComicScene } from './data/comicSequence';
import { SceneArtwork } from './components/SceneArtwork';
import { VeoStudioModal } from './components/VeoStudioModal';
import { ComicCodexDrawer } from './components/ComicCodexDrawer';
import { LyriaMusicModal } from './components/LyriaMusicModal';
import { AudioTranscribeModal } from './components/AudioTranscribeModal';
import { LiveVoiceModal } from './components/LiveVoiceModal';
import { VerdantisGame } from './components/game/VerdantisGame';
import { soundEngine } from './utils/soundEngine';

export default function App() {
  // Scenes & Navigation
  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);
  const currentScene: ComicScene = COMIC_SCENES[activeSceneIndex];

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [sceneElapsedTime, setSceneElapsedTime] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '2.39:1'>('16:9');
  const [viewMode, setViewMode] = useState<'movie' | 'reader'>('movie');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Audio state
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.75);

  // User uploaded images, generated Veo videos & Lyria tracks
  const [uploadedImages, setUploadedImages] = useState<Record<string, string>>({});
  const [generatedVideos, setGeneratedVideos] = useState<Record<string, string>>({});
  const [attachedMusicTracks, setAttachedMusicTracks] = useState<Record<string, string>>({});

  // Active AI Modals
  const [isVeoStudioOpen, setIsVeoStudioOpen] = useState<boolean>(false);
  const [isCodexOpen, setIsCodexOpen] = useState<boolean>(false);
  const [isLoreModalOpen, setIsLoreModalOpen] = useState<boolean>(false);
  const [isLyriaModalOpen, setIsLyriaModalOpen] = useState<boolean>(false);
  const [isTranscribeModalOpen, setIsTranscribeModalOpen] = useState<boolean>(false);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState<boolean>(false);
  const [isGameOpen, setIsGameOpen] = useState<boolean>(false);

  // Camera Motion Transform
  const [cameraTransform, setCameraTransform] = useState<{ zoom: number; x: number; y: number }>({
    zoom: 1,
    x: 0,
    y: 0,
  });

  const movieContainerRef = useRef<HTMLDivElement>(null);
  const customAudioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const triggeredSoundCuesRef = useRef<Set<string>>(new Set());

  // Handle scene change
  const goToScene = (index: number) => {
    const safeIndex = Math.max(0, Math.min(COMIC_SCENES.length - 1, index));
    setActiveSceneIndex(safeIndex);
    setSceneElapsedTime(0);
    triggeredSoundCuesRef.current.clear();

    // Check if custom Lyria score attached
    const customTrack = attachedMusicTracks[COMIC_SCENES[safeIndex].id];
    if (customTrack && customAudioPlayerRef.current) {
      soundEngine.stopAmbient();
      customAudioPlayerRef.current.src = customTrack;
      customAudioPlayerRef.current.play().catch(() => {});
    } else {
      if (customAudioPlayerRef.current) {
        customAudioPlayerRef.current.pause();
      }
      soundEngine.playMood(COMIC_SCENES[safeIndex].soundscapeMood);
    }
  };

  const nextScene = () => {
    if (activeSceneIndex < COMIC_SCENES.length - 1) {
      goToScene(activeSceneIndex + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const prevScene = () => {
    if (activeSceneIndex > 0) {
      goToScene(activeSceneIndex - 1);
    } else {
      setSceneElapsedTime(0);
    }
  };

  const togglePlay = () => {
    const nextPlayState = !isPlaying;
    setIsPlaying(nextPlayState);
    if (nextPlayState) {
      const customTrack = attachedMusicTracks[currentScene.id];
      if (customTrack && customAudioPlayerRef.current) {
        customAudioPlayerRef.current.play().catch(() => {});
      } else {
        soundEngine.playMood(currentScene.soundscapeMood);
      }
    } else {
      customAudioPlayerRef.current?.pause();
    }
  };

  // Movie Loop: advances elapsed time
  useEffect(() => {
    if (!isPlaying) return;

    const intervalTime = 100;
    const timer = setInterval(() => {
      setSceneElapsedTime((prev) => {
        const nextTime = prev + (intervalTime / 1000) * playbackSpeed;

        if (nextTime >= currentScene.defaultDuration) {
          if (activeSceneIndex < COMIC_SCENES.length - 1) {
            goToScene(activeSceneIndex + 1);
            return 0;
          } else {
            setIsPlaying(false);
            return currentScene.defaultDuration;
          }
        }

        return nextTime;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPlaying, activeSceneIndex, currentScene, playbackSpeed]);

  // Compute 2.5D camera motion pan & zoom over scene duration
  useEffect(() => {
    const progress = Math.min(1, sceneElapsedTime / currentScene.defaultDuration);
    const { startZoom, endZoom, startX, endX, startY, endY } = currentScene.camera;

    const currentZoom = startZoom + (endZoom - startZoom) * progress;
    const currentX = startX + (endX - startX) * progress;
    const currentY = startY + (endY - startY) * progress;

    setCameraTransform({
      zoom: currentZoom,
      x: currentX,
      y: currentY,
    });

    // Sound cues
    currentScene.soundCues.forEach((cue) => {
      const cueKey = `${currentScene.id}-${cue.time}-${cue.type}`;
      if (sceneElapsedTime >= cue.time && !triggeredSoundCuesRef.current.has(cueKey)) {
        triggeredSoundCuesRef.current.add(cueKey);
        soundEngine.playSFX(cue.type);
      }
    });
  }, [sceneElapsedTime, currentScene]);

  const activeDialogue = currentScene.dialogue.find(
    (line) =>
      sceneElapsedTime >= line.timeOffset &&
      sceneElapsedTime <= line.timeOffset + line.duration
  );

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    soundEngine.setMuted(newMuted);
    if (customAudioPlayerRef.current) {
      customAudioPlayerRef.current.muted = newMuted;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    soundEngine.setVolume(val);
    if (customAudioPlayerRef.current) {
      customAudioPlayerRef.current.volume = val;
    }
    if (isMuted && val > 0) {
      setIsMuted(false);
      soundEngine.setMuted(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      movieContainerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const handleVideoGenerated = (sceneId: string, videoUrl: string) => {
    setGeneratedVideos((prev) => ({
      ...prev,
      [sceneId]: videoUrl,
    }));
  };

  const handleMusicAttached = (sceneId: string, audioUrl: string) => {
    setAttachedMusicTracks((prev) => ({
      ...prev,
      [sceneId]: audioUrl,
    }));
  };

  const handleTranscriptionAdded = (sceneId: string, text: string) => {
    currentScene.dialogue.push({
      id: `custom-transcribe-${Date.now()}`,
      speaker: 'Narrator / Director',
      role: 'Voice Recording',
      avatarColor: '#38bdf8',
      text: text,
      timeOffset: Math.max(0, sceneElapsedTime),
      duration: 5.0,
    });
  };

  return (
    <div className="min-h-screen bg-[#04070c] text-slate-100 flex flex-col font-sans selection:bg-amber-500/30">
      
      {/* Hidden custom audio element for Lyria tracks */}
      <audio ref={customAudioPlayerRef} className="hidden" />

      {/* 3D Three.js Game Overlay */}
      {isGameOpen && (
        <VerdantisGame onClose={() => setIsGameOpen(false)} />
      )}

      {/* Top Navbar */}
      <header className="border-b border-amber-500/15 bg-[#060a12]/90 backdrop-blur-md px-3 sm:px-4 py-3 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 via-amber-600 to-emerald-700 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <Film className="w-4 h-4 text-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold tracking-wider text-sm text-white">
                SHARKFILET
              </span>
              <span className="text-[10px] text-amber-400 font-mono tracking-widest px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 uppercase font-semibold">
                Ark Cinema Studio
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
              12 Sequential Scenes &bull; Prologue 001 &rarr; StarKeep Pilot 08
            </p>
          </div>
        </div>

        {/* AI Features Launch Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 1. 3D Game with Three.js */}
          <button
            onClick={() => setIsGameOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-semibold text-xs flex items-center gap-1.5 transition-all font-mono shadow-sm"
            title="Launch 3D Game (Three.js)"
          >
            <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Play</span> 3D Flight Game
          </button>

          {/* 2. Lyria Music Generator */}
          <button
            onClick={() => setIsLyriaModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 font-semibold text-xs flex items-center gap-1.5 transition-all font-mono"
            title="Generate Music with Lyria 3"
          >
            <Music className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden lg:inline">Lyria</span> Music
          </button>

          {/* 3. Audio Transcribe */}
          <button
            onClick={() => setIsTranscribeModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 font-semibold text-xs flex items-center gap-1.5 transition-all font-mono"
            title="Transcribe Audio with Gemini 3.5"
          >
            <Mic className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden lg:inline">Transcribe</span>
          </button>

          {/* 4. Live Voice Conversation */}
          <button
            onClick={() => setIsLiveVoiceOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 font-semibold text-xs flex items-center gap-1.5 transition-all font-mono"
            title="Live Voice Conversation (Gemini 3.8 Live)"
          >
            <Radio className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
            <span className="hidden md:inline">Live</span> Voice
          </button>

          {/* 5. Veo 3.1 AI Video Generation */}
          <button
            onClick={() => setIsVeoStudioOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all font-mono"
            title="Veo 3.1 Fast Video Studio"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Veo 3.1</span> Video
          </button>

          {/* Codex Drawer Trigger */}
          <button
            onClick={() => setIsCodexOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs flex items-center gap-1.5 transition-colors font-mono"
            title="Archival Codex & Pages"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline">Pages</span>
          </button>
        </div>
      </header>

      {/* Main Movie Theater Stage */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 md:p-6 relative overflow-hidden">
        
        {/* Background ambient lighting */}
        <div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-[140px] pointer-events-none transition-colors duration-1000 opacity-25"
          style={{ backgroundColor: currentScene.artPalette.accentGlow }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-[140px] pointer-events-none transition-colors duration-1000 opacity-20"
          style={{ backgroundColor: currentScene.artPalette.ambientHue }}
        />

        {/* View Mode Switcher Header */}
        <div className="w-full max-w-5xl mb-3 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-300">
              {currentScene.act} &bull; PAGE {currentScene.pageNumber}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Aspect Ratio Switcher */}
            <div className="flex items-center bg-slate-900/80 border border-white/10 rounded-lg p-0.5">
              <button
                onClick={() => setAspectRatio('16:9')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 ${
                  aspectRatio === '16:9' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'hover:text-white'
                }`}
              >
                <Tv className="w-3 h-3" />
                16:9
              </button>
              <button
                onClick={() => setAspectRatio('2.39:1')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                  aspectRatio === '2.39:1' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'hover:text-white'
                }`}
              >
                2.39:1
              </button>
              <button
                onClick={() => setAspectRatio('9:16')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 ${
                  aspectRatio === '9:16' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'hover:text-white'
                }`}
              >
                <Smartphone className="w-3 h-3" />
                9:16
              </button>
            </div>

            {/* Movie vs Reader view mode */}
            <div className="flex items-center bg-slate-900/80 border border-white/10 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('movie')}
                className={`px-2.5 py-0.5 rounded text-[11px] ${
                  viewMode === 'movie' ? 'bg-amber-500 text-black font-semibold' : 'hover:text-white'
                }`}
              >
                Movie
              </button>
              <button
                onClick={() => setViewMode('reader')}
                className={`px-2.5 py-0.5 rounded text-[11px] ${
                  viewMode === 'reader' ? 'bg-amber-500 text-black font-semibold' : 'hover:text-white'
                }`}
              >
                Reader
              </button>
            </div>
          </div>
        </div>

        {/* Stage Frame Container */}
        {viewMode === 'movie' ? (
          <div
            ref={movieContainerRef}
            className={`relative w-full max-w-5xl rounded-2xl overflow-hidden bg-black border border-amber-500/20 shadow-2xl flex flex-col justify-center items-center ${
              aspectRatio === '16:9'
                ? 'aspect-video'
                : aspectRatio === '2.39:1'
                ? 'aspect-[2.39/1]'
                : 'aspect-[9/16] max-h-[75vh]'
            }`}
          >
            {/* The Cinematic Motion Canvas / Video Display */}
            <SceneArtwork
              scene={currentScene}
              customImage={uploadedImages[currentScene.id]}
              generatedVideoUrl={generatedVideos[currentScene.id]}
              cameraTransform={cameraTransform}
              aspectRatio={aspectRatio === '9:16' ? '9:16' : '16:9'}
            />

            {/* Cinematic Scanlines effect overlay */}
            <div className="absolute inset-0 scanlines opacity-30 pointer-events-none" />

            {/* Letterboxing for 2.39:1 Anamorphic cinema */}
            {aspectRatio === '2.39:1' && (
              <>
                <div className="absolute top-0 left-0 right-0 h-6 bg-black pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-black pointer-events-none" />
              </>
            )}

            {/* Top Scene Identifier Overlay */}
            <div className="absolute top-4 left-4 z-20 pointer-events-none flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] tracking-widest uppercase px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-amber-300 border border-amber-500/30 font-semibold">
                  {currentScene.fileSlug.toUpperCase()} &bull; SCENE {activeSceneIndex + 1}
                </span>
                <span className="font-mono text-[10px] tracking-wider text-slate-300 px-2 py-0.5 rounded bg-black/40 backdrop-blur-md border border-white/10">
                  {currentScene.location}
                </span>
              </div>
            </div>

            {/* Dynamic Dialogue & Subtitle Banner */}
            {activeDialogue && (
              <div className="absolute bottom-16 left-6 right-6 z-20 pointer-events-none flex justify-center">
                <div className="max-w-2xl bg-black/80 backdrop-blur-xl border border-amber-500/30 rounded-2xl px-5 py-3 shadow-2xl animate-fade-in flex items-start gap-3.5">
                  <div
                    className="w-3 h-3 rounded-full mt-1.5 shrink-0 animate-ping"
                    style={{ backgroundColor: activeDialogue.avatarColor }}
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="font-serif font-bold text-xs tracking-wider uppercase"
                        style={{ color: activeDialogue.avatarColor }}
                      >
                        {activeDialogue.speaker}
                      </span>
                      {activeDialogue.role && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          [{activeDialogue.role}]
                        </span>
                      )}
                    </div>
                    <p className="font-sans text-sm md:text-base text-white font-medium leading-relaxed drop-shadow">
                      &ldquo;{activeDialogue.text}&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* On-Canvas Play/Pause Floating Indicator when paused */}
            {!isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 hover:bg-black/20 transition-colors group"
              >
                <div className="w-16 h-16 rounded-full bg-amber-500/90 group-hover:bg-amber-400 text-black flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-all">
                  <Play className="w-7 h-7 fill-current ml-1" />
                </div>
              </button>
            )}

            {/* Bottom Progress Bar on the frame */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60 z-20">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 transition-all duration-100"
                style={{
                  width: `${(sceneElapsedTime / currentScene.defaultDuration) * 100}%`,
                }}
              />
            </div>
          </div>
        ) : (
          /* Reader Mode: Side-by-side Page & Narrative Script */
          <div className="w-full max-w-5xl rounded-2xl overflow-hidden bg-[#070b12] border border-amber-500/20 p-6 shadow-2xl grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[75vh] overflow-y-auto">
            <div className="aspect-[3/4] bg-black rounded-xl overflow-hidden border border-white/10 relative flex items-center justify-center">
              <SceneArtwork
                scene={currentScene}
                customImage={uploadedImages[currentScene.id]}
                generatedVideoUrl={generatedVideos[currentScene.id]}
              />
            </div>
            
            <div className="space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-amber-400 mb-1">
                  <span>{currentScene.loreArchivalId}</span>
                  <span>&bull;</span>
                  <span>{currentScene.stardateOrSetting}</span>
                </div>
                <h3 className="font-serif font-bold text-2xl text-white">
                  {currentScene.title}
                </h3>
                <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                  {currentScene.summary}
                </p>

                {/* Full dialogue transcript */}
                <div className="mt-6 space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-amber-400/90 font-semibold">
                    Sequential Dialogue Script
                  </h4>
                  {currentScene.dialogue.map((line) => (
                    <div
                      key={line.id}
                      className="p-3 rounded-lg bg-slate-900/60 border border-white/5 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="font-serif font-semibold text-xs"
                          style={{ color: line.avatarColor }}
                        >
                          {line.speaker}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          +{line.timeOffset}s
                        </span>
                      </div>
                      <p className="text-xs text-slate-200">
                        &ldquo;{line.text}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <button
                  onClick={() => setIsVeoStudioOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate Scene Video (Veo 3.1)
                </button>
                <button
                  onClick={() => setViewMode('movie')}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-colors"
                >
                  Watch in Cinema Mode
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Master Movie Playback Controls Bar */}
        <div className="w-full max-w-5xl mt-4 bg-[#0a0f18]/90 backdrop-blur-md border border-amber-500/20 rounded-2xl p-3 sm:p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
          
          {/* Left: Play/Pause & Skipping */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevScene}
              disabled={activeSceneIndex === 0}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-slate-300 hover:text-white transition-colors"
              title="Previous Page / Scene"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span className="text-xs uppercase font-mono">Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                  <span className="text-xs uppercase font-mono">Play Movie</span>
                </>
              )}
            </button>

            <button
              onClick={nextScene}
              disabled={activeSceneIndex === COMIC_SCENES.length - 1}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-slate-300 hover:text-white transition-colors"
              title="Next Page / Scene"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setSceneElapsedTime(0);
                triggeredSoundCuesRef.current.clear();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 transition-colors ml-1"
              title="Restart Scene"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Center: Time scrubber */}
          <div className="flex-1 min-w-[200px] flex items-center gap-3">
            <span className="font-mono text-xs text-amber-400 w-10 text-right">
              {sceneElapsedTime.toFixed(1)}s
            </span>
            <input
              type="range"
              min="0"
              max={currentScene.defaultDuration}
              step="0.1"
              value={sceneElapsedTime}
              onChange={(e) => {
                setSceneElapsedTime(parseFloat(e.target.value));
              }}
              className="flex-1 accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="font-mono text-xs text-slate-400 w-10">
              {currentScene.defaultDuration.toFixed(1)}s
            </span>
          </div>

          {/* Right: Audio Volume, Speed & Fullscreen */}
          <div className="flex items-center gap-3">
            {/* Speed Picker */}
            <div className="flex items-center bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs font-mono">
              <span className="text-slate-500 mr-1.5">Speed</span>
              {[1, 1.25, 1.5].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-1.5 py-0.5 rounded ${
                    playbackSpeed === spd
                      ? 'bg-amber-500/20 text-amber-400 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Audio Volume */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-amber-400" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 accent-amber-500 h-1 bg-slate-800 rounded cursor-pointer"
              />
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="Fullscreen Theater"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Bottom Sequential Filmstrip Navigation */}
        <div className="w-full max-w-5xl mt-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              Movie Timeline Reel &bull; 12 Sequential Scenes
            </span>
            <span className="text-[11px] font-mono text-amber-400">
              Act I: Prologue (1–4) &bull; Act II: Verdantis Pilot (5–12)
            </span>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
            {COMIC_SCENES.map((scene, idx) => {
              const isCurrent = idx === activeSceneIndex;
              const hasVideo = !!generatedVideos[scene.id];
              const hasCustomImg = !!uploadedImages[scene.id];
              const hasScore = !!attachedMusicTracks[scene.id];

              return (
                <div
                  key={scene.id}
                  onClick={() => goToScene(idx)}
                  className={`group relative shrink-0 w-28 sm:w-32 rounded-xl overflow-hidden border p-2 cursor-pointer transition-all ${
                    isCurrent
                      ? 'bg-amber-500/20 border-amber-500 shadow-lg scale-105 z-10'
                      : 'bg-slate-900/50 border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="aspect-video rounded-lg overflow-hidden bg-black/60 mb-1.5 relative flex items-center justify-center">
                    <SceneArtwork
                      scene={scene}
                      customImage={uploadedImages[scene.id]}
                      generatedVideoUrl={generatedVideos[scene.id]}
                    />

                    {/* Status Icons */}
                    <div className="absolute top-1 right-1 flex items-center gap-0.5">
                      {hasVideo && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow" title="Veo Video Available" />
                      )}
                      {hasScore && (
                        <span className="w-2 h-2 rounded-full bg-purple-400 shadow" title="Lyria Score Attached" />
                      )}
                      {hasCustomImg && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 shadow" title="Custom Image Loaded" />
                      )}
                    </div>

                    <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-black/80 font-mono text-[9px] text-white">
                      #{idx + 1}
                    </span>
                  </div>

                  <p className="text-[11px] font-serif font-semibold text-white truncate group-hover:text-amber-300">
                    {scene.title}
                  </p>
                  <p className="text-[9px] font-mono text-slate-400 uppercase truncate">
                    {scene.fileSlug}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#060a12] px-6 py-4 text-xs font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Shield className="w-4 h-4 text-amber-500/80" />
          <span>SHARKFILET LLC &bull; Adaptive Storytelling & Heirloom Digital Ownership</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 text-slate-400 flex-wrap">
          <span className="text-amber-400">Veo 3.1 Fast</span>
          <span>&bull;</span>
          <span className="text-purple-400">Lyria 3</span>
          <span>&bull;</span>
          <span className="text-sky-400">Gemini 3.5 Transcribe</span>
          <span>&bull;</span>
          <span className="text-teal-400">Gemini 3.8 Live</span>
          <span>&bull;</span>
          <span className="text-emerald-400">Three.js 3D</span>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <VeoStudioModal
        isOpen={isVeoStudioOpen}
        onClose={() => setIsVeoStudioOpen(false)}
        currentScene={currentScene}
        onVideoGenerated={handleVideoGenerated}
        allScenes={COMIC_SCENES}
      />

      <ComicCodexDrawer
        isOpen={isCodexOpen}
        onClose={() => setIsCodexOpen(false)}
        scenes={COMIC_SCENES}
        activeSceneIndex={activeSceneIndex}
        onSelectScene={goToScene}
        uploadedImages={uploadedImages}
        onBatchImagesUploaded={(mapped) => setUploadedImages(mapped)}
        generatedVideos={generatedVideos}
        onOpenVeoStudioForScene={(sc) => {
          setActiveSceneIndex(sc.sequenceIndex);
          setIsCodexOpen(false);
          setIsVeoStudioOpen(true);
        }}
      />

      <LyriaMusicModal
        isOpen={isLyriaModalOpen}
        onClose={() => setIsLyriaModalOpen(false)}
        currentScene={currentScene}
        onTrackAttached={handleMusicAttached}
      />

      <AudioTranscribeModal
        isOpen={isTranscribeModalOpen}
        onClose={() => setIsTranscribeModalOpen(false)}
        currentScene={currentScene}
        onTranscriptionAdded={handleTranscriptionAdded}
      />

      <LiveVoiceModal
        isOpen={isLiveVoiceOpen}
        onClose={() => setIsLiveVoiceOpen(false)}
      />

      {/* Lore Ledger Modal */}
      {isLoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl bg-[#0a0f18] border border-amber-500/30 rounded-2xl p-6 sm:p-8 text-slate-200 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-amber-400" />
                <h3 className="font-serif font-bold text-lg text-white">
                  SHARKFILET Ark Mirror & Lore Ledger
                </h3>
              </div>
              <button
                onClick={() => setIsLoreModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
              <p>
                <strong>Ecosystem Vision:</strong> SHARKFILET combines retro-futurism, sacred technology, and mythic science fiction with AI narrative synthesis and collectible heirloom permanence.
              </p>
              <div className="p-3 rounded-xl bg-slate-900 border border-white/10 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Node:</span>
                  <span className="text-amber-400">{currentScene.loreArchivalId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Location:</span>
                  <span className="text-emerald-400">{currentScene.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Chronicle Setting:</span>
                  <span className="text-slate-200">{currentScene.stardateOrSetting}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setIsLoreModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs"
              >
                Return to Cinema
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
