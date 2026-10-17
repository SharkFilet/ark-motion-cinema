import React, { useState, useRef } from 'react';
import { Mic, MicOff, Upload, Sparkles, Loader2, Copy, Check, AlertCircle, X, FileAudio } from 'lucide-react';
import { ComicScene } from '../data/comicSequence';

interface AudioTranscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentScene: ComicScene;
  onTranscriptionAdded?: (sceneId: string, text: string) => void;
}

export const AudioTranscribeModal: React.FC<AudioTranscribeModalProps> = ({
  isOpen,
  onClose,
  currentScene,
  onTranscriptionAdded,
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioMime, setAudioMime] = useState<string>('audio/webm');
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcription, setTranscription] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Start Mic Recording
  const startRecording = async () => {
    try {
      setError(null);
      setTranscription('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioBase64(reader.result as string);
          setAudioMime(recorder.mimeType || 'audio/webm');
        };
        reader.readAsDataURL(audioBlob);

        // Stop all mic tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setError('Microphone access denied or unsupported: ' + err.message);
    }
  };

  // Stop Mic Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // File Upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setTranscription('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAudioBase64(ev.target?.result as string);
      setAudioMime(file.type || 'audio/mp3');
    };
    reader.readAsDataURL(file);
  };

  // Run Transcription with gemini-3.5-transcribe
  const handleTranscribe = async () => {
    if (!audioBase64) return;
    setIsTranscribing(true);
    setError(null);

    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: audioBase64,
          mimeType: audioMime,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to transcribe audio.');
      }

      setTranscription(data.transcription);
      setIsTranscribing(false);
    } catch (err: any) {
      setIsTranscribing(false);
      setError(err.message || 'Error occurred during transcription.');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(transcription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-[#0a0f18] border border-amber-500/25 rounded-2xl p-6 sm:p-8 text-slate-200 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-white flex items-center gap-2">
                Audio Transcription Studio
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold">
                  gemini-3.5-transcribe
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Record voice narration or upload dialogue clips for &ldquo;{currentScene.title}&rdquo;
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Methods: Mic or File */}
        <div className="grid grid-cols-2 gap-3">
          {/* Mic Button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
              isRecording
                ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                : 'bg-slate-900/60 border-white/10 hover:border-amber-500/40 text-slate-300'
            }`}
          >
            {isRecording ? (
              <>
                <MicOff className="w-6 h-6 text-rose-400" />
                <span className="font-mono text-xs text-rose-300 font-bold">
                  Stop Recording ({recordingSeconds}s)
                </span>
              </>
            ) : (
              <>
                <Mic className="w-6 h-6 text-sky-400" />
                <span className="font-mono text-xs font-semibold">Record Voice</span>
              </>
            )}
          </button>

          {/* File Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-4 rounded-xl border border-white/10 hover:border-amber-500/40 bg-slate-900/60 flex flex-col items-center justify-center gap-2 text-slate-300 transition-all"
          >
            <Upload className="w-6 h-6 text-amber-400" />
            <span className="font-mono text-xs font-semibold">Upload Audio File</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Loaded audio clip indicator */}
        {audioBase64 && !isRecording && (
          <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-emerald-400">
              <FileAudio className="w-4 h-4" />
              <span>Audio Clip Ready for Transcription</span>
            </div>
            <button
              onClick={() => setAudioBase64(null)}
              className="text-slate-500 hover:text-rose-400"
            >
              Clear
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Transcription Output */}
        {transcription && (
          <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-sky-400 font-semibold uppercase">
                Verbatim Transcription:
              </span>
              <button
                onClick={copyToClipboard}
                className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1 font-mono"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-sm font-sans text-white bg-slate-950/60 p-3 rounded-lg border border-white/5 leading-relaxed">
              &ldquo;{transcription}&rdquo;
            </p>

            {onTranscriptionAdded && (
              <button
                onClick={() => {
                  onTranscriptionAdded(currentScene.id, transcription);
                  onClose();
                }}
                className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs font-mono transition-colors"
              >
                Insert as Scene Dialogue Caption
              </button>
            )}
          </div>
        )}

        {/* Action Button */}
        <div>
          <button
            onClick={handleTranscribe}
            disabled={!audioBase64 || isTranscribing}
            className={`w-full py-3.5 px-6 rounded-xl font-semibold text-xs tracking-wider uppercase font-mono flex items-center justify-center gap-2 shadow-lg transition-all ${
              !audioBase64 || isTranscribing
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold'
            }`}
          >
            {isTranscribing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Transcribing with Gemini 3.5...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Transcribe Audio (gemini-3.5-transcribe)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
