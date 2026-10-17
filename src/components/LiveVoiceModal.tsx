import React, { useState, useEffect, useRef } from 'react';
import { Radio, Mic, MicOff, Volume2, X, AlertCircle, Loader2, Send } from 'lucide-react';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({ isOpen, onClose }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Disconnected');
  const [transcripts, setTranscripts] = useState<{ role: 'user' | 'sylvi'; text: string }[]>([
    {
      role: 'sylvi',
      text: 'I am Sylvi, avatar of the Arcanum on Verdantis. Speak, traveler of the Ark.',
    },
  ]);
  const [textInput, setTextInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isOpen) {
      disconnect();
    }
    return () => {
      disconnect();
    };
  }, [isOpen]);

  const connect = async () => {
    setError(null);
    setStatusMessage('Connecting to Gemini 3.8 Live API channel...');

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        setStatusMessage('Connected to High Priestess Sylvi (gemini-3.8-live)');
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.error) {
            setError(data.error);
            return;
          }

          if (data.text) {
            setTranscripts((prev) => [...prev, { role: 'sylvi', text: data.text }]);
          }

          if (data.audio) {
            playRawPCM(data.audio);
          }
        } catch (e) {
          console.error('Error handling live message:', e);
        }
      };

      ws.onerror = (e) => {
        setError('WebSocket connection error.');
        setStatusMessage('Error');
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsMicActive(false);
        setStatusMessage('Channel closed.');
      };

      wsRef.current = ws;
    } catch (err: any) {
      setError(err.message || 'Failed to open Live API socket.');
    }
  };

  const disconnect = () => {
    stopMic();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsMicActive(false);
    setStatusMessage('Disconnected');
  };

  // Start Mic Audio Streaming (16kHz PCM)
  const startMic = async () => {
    try {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        await connect();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputCtxRef.current = inputCtx;

      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(inputCtx.destination);

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32 to 16-bit PCM little-endian
        const buffer = new ArrayBuffer(inputData.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        }

        // Convert to base64
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        wsRef.current.send(JSON.stringify({ audio: base64 }));
      };

      setIsMicActive(true);
    } catch (err: any) {
      setError('Could not access microphone: ' + err.message);
    }
  };

  const stopMic = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (inputCtxRef.current) {
      inputCtxRef.current.close().catch(() => {});
      inputCtxRef.current = null;
    }
    setIsMicActive(false);
  };

  // Playback Raw PCM at 24kHz (Gemini Live Default)
  const playRawPCM = (base64Audio: string) => {
    if (!outputCtxRef.current) {
      outputCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextPlayTimeRef.current = outputCtxRef.current.currentTime;
    }

    const ctx = outputCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const binary = atob(base64Audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
    audioBuffer.copyToChannel(float32Array, 0);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    if (nextPlayTimeRef.current < now) {
      nextPlayTimeRef.current = now;
    }

    source.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += audioBuffer.duration;
  };

  const sendTextMessage = () => {
    if (!textInput.trim()) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      connect();
    }

    setTranscripts((prev) => [...prev, { role: 'user', text: textInput }]);
    wsRef.current?.send(JSON.stringify({ text: textInput }));
    setTextInput('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-[#080d16] border border-emerald-500/30 rounded-2xl p-6 sm:p-8 text-slate-200 shadow-2xl flex flex-col h-[600px] max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-white flex items-center gap-2">
                The Ark Conduit &bull; Real-Time Voice Channel
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  gemini-3.8-live
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Spoken dialogue with High Priestess Sylvi (Avatar of the Arcanum)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Pill */}
        <div className="py-2 flex items-center justify-between text-xs font-mono text-slate-400 shrink-0">
          <span className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400' : 'bg-rose-500'
              }`}
            />
            {statusMessage}
          </span>
          {isConnected ? (
            <button
              onClick={disconnect}
              className="text-rose-400 hover:text-rose-300 text-[11px]"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={connect}
              className="text-emerald-400 hover:text-emerald-300 text-[11px]"
            >
              Connect
            </button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Live Conversation Transcript Display */}
        <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-2 scrollbar-thin">
          {transcripts.map((t, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${
                t.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <span className="text-[10px] font-mono uppercase text-slate-400 mb-1">
                {t.role === 'user' ? 'You (Apprentice / Ambassador)' : 'High Priestess Sylvi'}
              </span>
              <div
                className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                  t.role === 'user'
                    ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30'
                    : 'bg-emerald-950/40 text-emerald-200 border border-emerald-500/30'
                }`}
              >
                {t.text}
              </div>
            </div>
          ))}
        </div>

        {/* Controls: Voice Mic Streaming & Text */}
        <div className="pt-3 border-t border-white/10 shrink-0 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendTextMessage()}
              placeholder="Ask Sylvi about the Arcanum, Verdantis, or the Olcs..."
              className="flex-1 bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
            />
            <button
              onClick={sendTextMessage}
              className="p-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={isMicActive ? stopMic : startMic}
              className={`flex-1 py-3 px-4 rounded-xl font-mono text-xs font-bold tracking-wider flex items-center justify-center gap-2 transition-all ${
                isMicActive
                  ? 'bg-rose-500/30 border border-rose-500 text-rose-300'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black'
              }`}
            >
              {isMicActive ? (
                <>
                  <MicOff className="w-4 h-4 text-rose-400 animate-pulse" />
                  Mute Microphone (Streaming 16kHz)
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  Speak with Sylvi (Start Live Mic)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
