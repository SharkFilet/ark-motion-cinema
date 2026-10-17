import React from 'react';
import { ComicScene } from '../data/comicSequence';

interface SceneArtworkProps {
  scene: ComicScene;
  customImage?: string;
  generatedVideoUrl?: string;
  cameraTransform?: {
    zoom: number;
    x: number;
    y: number;
  };
  aspectRatio?: '16:9' | '9:16' | 'original';
}

export const SceneArtwork: React.FC<SceneArtworkProps> = ({
  scene,
  customImage,
  generatedVideoUrl,
  cameraTransform = { zoom: 1, x: 0, y: 0 },
  aspectRatio = '16:9',
}) => {
  // If a Veo generated video exists, render the video with responsive framing
  if (generatedVideoUrl) {
    return (
      <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-black">
        <video
          src={generatedVideoUrl}
          autoPlay
          loop
          muted
          playsInline
          className={`w-full h-full object-cover transition-transform duration-700 ease-out`}
          style={{
            transform: `scale(${cameraTransform.zoom}) translate(${cameraTransform.x * 0.1}%, ${cameraTransform.y * 0.1}%)`,
          }}
        />
        <div className="absolute top-4 right-4 bg-emerald-500/80 backdrop-blur-md px-3 py-1 rounded text-xs font-mono uppercase tracking-wider text-black font-bold flex items-center gap-1.5 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
          Veo 3.1 AI Video
        </div>
      </div>
    );
  }

  // If user uploaded a custom page image
  if (customImage) {
    return (
      <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-black">
        <img
          src={customImage}
          alt={scene.title}
          className={`w-full h-full object-contain transition-transform duration-100 ease-linear`}
          style={{
            transform: `scale(${cameraTransform.zoom}) translate(${cameraTransform.x}%, ${cameraTransform.y}%)`,
          }}
        />
      </div>
    );
  }

  // Otherwise, render the custom-crafted cinematic SVG graphic canvas matching the exact uploaded comic scene!
  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-[#070b12] select-none">
      <div
        className="w-full h-full transition-transform duration-100 ease-linear flex items-center justify-center"
        style={{
          transform: `scale(${cameraTransform.zoom}) translate(${cameraTransform.x}%, ${cameraTransform.y}%)`,
        }}
      >
        {renderSceneSVG(scene)}
      </div>

      {/* Subtle atmospheric dust & sacred lighting overlay */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-black/30" />
      <div className="absolute inset-0 pointer-events-none opacity-30 mix-blend-screen bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.15)_0,transparent_70%)]" />
    </div>
  );
};

function renderSceneSVG(scene: ComicScene) {
  const { motif } = scene.artPalette;

  switch (motif) {
    case 'orbital-station':
      // Prologue 001: Caldran IV and Prime Assembly
      return (
        <svg viewBox="0 0 1200 675" className="w-full h-full object-cover">
          <defs>
            <radialGradient id="planetGrad" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="40%" stopColor="#4338ca" />
              <stop offset="70%" stopColor="#1e1b4b" />
              <stop offset="100%" stopColor="#030712" />
            </radialGradient>
            <radialGradient id="shardGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#991b1b" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="goldArch" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d4af37" />
              <stop offset="50%" stopColor="#854d0e" />
              <stop offset="100%" stopColor="#422006" />
            </linearGradient>
          </defs>

          {/* Deep Space Background */}
          <rect width="1200" height="675" fill="#030712" />
          
          {/* Caldran IV Planet Atmosphere */}
          <circle cx="280" cy="480" r="460" fill="url(#planetGrad)" />
          {/* Atmospheric Swirls */}
          <path d="M -50 350 Q 200 280 500 380 Q 750 480 300 600" fill="none" stroke="#a5b4fc" strokeWidth="18" opacity="0.35" filter="blur(6px)" />
          <path d="M 0 450 Q 350 400 650 520" fill="none" stroke="#c084fc" strokeWidth="24" opacity="0.25" filter="blur(8px)" />

          {/* Distant Moons & Stations */}
          <circle cx="980" cy="90" r="28" fill="#cbd5e1" opacity="0.8" />
          <circle cx="980" cy="90" r="32" fill="none" stroke="#94a3b8" strokeWidth="1" opacity="0.4" />

          {/* Orbital Station Rings */}
          <ellipse cx="820" cy="220" rx="260" ry="85" fill="none" stroke="#d4af37" strokeWidth="5" opacity="0.85" />
          <ellipse cx="820" cy="220" rx="300" ry="100" fill="none" stroke="#e2e8f0" strokeWidth="2" opacity="0.4" />
          <line x1="820" y1="60" x2="820" y2="420" stroke="#d4af37" strokeWidth="12" />

          {/* Assembly Arch Interior (Foreground) */}
          <path d="M 0 675 L 0 200 Q 600 80 1200 200 L 1200 675 Z" fill="#0f172a" opacity="0.75" />
          <path d="M 100 675 L 100 250 Q 600 140 1100 250 L 1100 675 Z" fill="none" stroke="url(#goldArch)" strokeWidth="6" />

          {/* Red Holographic Ark Shards on Console */}
          <circle cx="850" cy="520" r="140" fill="url(#shardGlow)" />
          <polygon points="800,500 820,440 840,490 825,540" fill="#f87171" opacity="0.9" />
          <polygon points="850,480 870,420 890,480 870,530" fill="#ef4444" opacity="0.95" />
          <polygon points="900,500 920,450 940,510 920,550" fill="#f87171" opacity="0.85" />

          {/* Diplomat Silhouettes */}
          <rect x="250" y="320" width="45" height="180" rx="20" fill="#1e1b4b" stroke="#3b82f6" strokeWidth="2" />
          <circle cx="272" cy="300" r="22" fill="#d4af37" />
          <rect x="580" y="340" width="48" height="180" rx="15" fill="#f8fafc" stroke="#d4af37" strokeWidth="3" />
          <circle cx="604" cy="315" r="20" fill="#78350f" />
        </svg>
      );

    case 'arcanum-hologram':
      // Prologue 002 & 003: High Priestess Sylvi & Verdantis Hologram
      return (
        <svg viewBox="0 0 1200 675" className="w-full h-full object-cover">
          <defs>
            <radialGradient id="sylviGlow" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#059669" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#064e3b" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="verdantisCore" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#a7f3d0" />
              <stop offset="40%" stopColor="#10b981" />
              <stop offset="80%" stopColor="#064e3b" />
            </radialGradient>
          </defs>

          <rect width="1200" height="675" fill="#031109" />
          {/* Glowing Neural Grid Lines */}
          <g opacity="0.3" stroke="#10b981" strokeWidth="1">
            <line x1="0" y1="200" x2="1200" y2="400" />
            <line x1="0" y1="400" x2="1200" y2="200" />
            <circle cx="600" cy="300" r="220" fill="none" strokeDasharray="6,6" />
            <circle cx="600" cy="300" r="340" fill="none" strokeDasharray="8,8" />
          </g>

          {/* Sylvi Translucent Foliage Avatar */}
          <circle cx="600" cy="240" r="220" fill="url(#sylviGlow)" />
          {/* Sacred Leaf Cloak Geometry */}
          <path d="M 600 120 Q 520 220 400 300 Q 520 380 600 480 Q 680 380 800 300 Q 680 220 600 120 Z" fill="#10b981" fillOpacity="0.35" stroke="#6ee7b7" strokeWidth="3" />
          <path d="M 600 150 Q 550 240 460 310 Q 550 370 600 440 Q 650 370 740 310 Q 650 240 600 150 Z" fill="#34d399" fillOpacity="0.25" stroke="#a7f3d0" strokeWidth="2" />
          
          {/* Verdantis Orb Hologram */}
          <circle cx="600" cy="520" r="65" fill="url(#verdantisCore)" filter="drop-shadow(0 0 25px #34d399)" />
          <ellipse cx="600" cy="520" rx="110" ry="30" fill="none" stroke="#6ee7b7" strokeWidth="2" opacity="0.8" />
          <text x="600" y="615" textAnchor="middle" fill="#6ee7b7" fontFamily="Cinzel, serif" fontSize="18" letterSpacing="4">VERDANTIS</text>

          {/* Assembly Balcony Pillars */}
          <line x1="120" y1="0" x2="120" y2="675" stroke="#d4af37" strokeWidth="8" opacity="0.6" />
          <line x1="1080" y1="0" x2="1080" y2="675" stroke="#d4af37" strokeWidth="8" opacity="0.6" />
        </svg>
      );

    case 'warp-portal':
      // Prologue 004: Temporal Arrival
      return (
        <svg viewBox="0 0 1200 675" className="w-full h-full object-cover">
          <defs>
            <radialGradient id="warpCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="25%" stopColor="#f43f5e" />
              <stop offset="60%" stopColor="#881337" />
              <stop offset="100%" stopColor="#090105" />
            </radialGradient>
          </defs>
          <rect width="1200" height="675" fill="#090105" />
          {/* Concentric Tunnel Rings */}
          {[120, 200, 300, 420, 560].map((r, i) => (
            <ellipse key={i} cx="850" cy="340" rx={r} ry={r * 0.55} fill="none" stroke="#e11d48" strokeWidth={6 - i} opacity={0.9 - i * 0.15} />
          ))}
          <circle cx="850" cy="340" r="100" fill="url(#warpCore)" filter="drop-shadow(0 0 35px #f43f5e)" />
          <text x="850" y="220" textAnchor="middle" fill="#fda4af" fontFamily="Space Grotesk, monospace" fontSize="24" letterSpacing="6">HUMMM...</text>
          
          {/* Foreground Council silhouettes reacting */}
          <path d="M 0 675 L 350 480 L 450 675 Z" fill="#18181b" />
          <circle cx="340" cy="460" r="28" fill="#d4af37" />
        </svg>
      );

    case 'temple-vista':
      // StarKeep Pilot 01: Sunrise over Southern Temple of the Ark
      return (
        <svg viewBox="0 0 1200 675" className="w-full h-full object-cover">
          <defs>
            <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fdba74" />
              <stop offset="40%" stopColor="#fef08a" />
              <stop offset="70%" stopColor="#86efac" />
              <stop offset="100%" stopColor="#14532d" />
            </linearGradient>
            <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="30%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1200" height="675" fill="url(#skyGrad)" />
          {/* Sun */}
          <circle cx="240" cy="180" r="120" fill="url(#sunGlow)" opacity="0.85" />

          {/* Distant Mountain Valleys & Waterfalls */}
          <path d="M 0 320 Q 250 260 500 340 T 1000 300 L 1200 360 L 1200 675 L 0 675 Z" fill="#2d6a4f" opacity="0.7" />
          <path d="M 0 420 Q 350 380 700 450 L 1200 480 L 1200 675 L 0 675 Z" fill="#1b4332" />

          {/* Cascading Waterfall Streams */}
          <line x1="280" y1="340" x2="280" y2="520" stroke="#f0fdf4" strokeWidth="8" opacity="0.7" filter="blur(2px)" />
          <line x1="420" y1="380" x2="420" y2="580" stroke="#f0fdf4" strokeWidth="12" opacity="0.6" filter="blur(3px)" />

          {/* White Avian Creatures Gliding */}
          <path d="M 180 280 Q 200 270 220 285 Q 240 270 260 280" fill="none" stroke="#ffffff" strokeWidth="3" />
          <path d="M 320 240 Q 335 230 350 245 Q 365 230 380 240" fill="none" stroke="#ffffff" strokeWidth="2.5" />

          {/* Colossal Living Tree Temple Balcony (Right) */}
          <path d="M 680 675 Q 750 420 850 320 Q 950 200 1200 100 L 1200 675 Z" fill="#081c15" />
          {/* Balustrade & Circular Marble Deck */}
          <ellipse cx="880" cy="460" rx="220" ry="60" fill="#f8fafc" stroke="#d4af37" strokeWidth="6" opacity="0.9" />
          
          {/* Seated Aku Figure Meditating */}
          <circle cx="880" cy="420" r="14" fill="#78350f" />
          <path d="M 865 435 L 895 435 L 880 470 Z" fill="#0369a1" />
          {/* Glowing Ark Sphere in Hands */}
          <circle cx="880" cy="445" r="16" fill="#fef08a" filter="drop-shadow(0 0 14px #eab308)" />
        </svg>
      );

    case 'orb-fracture':
      // StarKeep Pilot 02: Sphere splits in two
      return (
        <svg viewBox="0 0 1200 675" className="w-full h-full object-cover">
          <defs>
            <radialGradient id="orbGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="60%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1200" height="675" fill="#18181b" />
          
          {/* Sunlit Balcony Floor */}
          <path d="M 0 350 L 1200 350 L 1200 675 L 0 675 Z" fill="#27272a" />
          <ellipse cx="600" cy="520" rx="340" ry="110" fill="none" stroke="#d4af37" strokeWidth="2" strokeDasharray="4,8" opacity="0.5" />

          {/* Upper Orb Half Floating */}
          <path d="M 520 280 A 90 90 0 0 1 680 280 Z" fill="url(#orbGlow)" stroke="#fef08a" strokeWidth="3" filter="drop-shadow(0 0 20px #10b981)" />
          {/* Lower Orb Half Resting on Floor */}
          <path d="M 520 370 A 90 90 0 0 0 680 370 Z" fill="url(#orbGlow)" stroke="#fef08a" strokeWidth="3" filter="drop-shadow(0 0 20px #10b981)" />

          {/* Crack Sound Cue & Light Steam */}
          <path d="M 600 290 Q 580 320 620 340 T 600 370" fill="none" stroke="#ffffff" strokeWidth="4" />
          <text x="740" y="325" fill="#fb923c" fontFamily="Cinzel, serif" fontWeight="bold" fontSize="36" letterSpacing="4">* KRRK *</text>

          {/* Aku Silhouette Looking Down */}
          <circle cx="340" cy="300" r="32" fill="#78350f" />
          <path d="M 310 335 Q 340 370 380 440" stroke="#0284c7" strokeWidth="28" strokeLinecap="round" />
        </svg>
      );

    case 'awakened-eyes':
      // StarKeep Pilot 06: Macro view into Aku's amber eyes with sacred rings
      return (
        <svg viewBox="0 0 1200 675" className="w-full h-full object-cover">
          <defs>
            <radialGradient id="amberIris" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#451a03" />
              <stop offset="35%" stopColor="#b45309" />
              <stop offset="70%" stopColor="#f59e0b" />
              <stop offset="90%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#78350f" />
            </radialGradient>
            <radialGradient id="sacredPupil" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#000000" />
              <stop offset="80%" stopColor="#1c1917" />
              <stop offset="100%" stopColor="#78350f" />
            </radialGradient>
          </defs>

          <rect width="1200" height="675" fill="#0c0a09" />

          {/* Left Eye Outline */}
          <g transform="translate(150, 0)">
            <ellipse cx="250" cy="337" rx="190" ry="110" fill="#fef3c7" stroke="#451a03" strokeWidth="8" />
            {/* Iris */}
            <circle cx="250" cy="337" r="85" fill="url(#amberIris)" />
            {/* Pupil */}
            <circle cx="250" cy="337" r="38" fill="url(#sacredPupil)" />
            {/* Sacred Concentric Sigil Rings */}
            <circle cx="250" cy="337" r="54" fill="none" stroke="#fde047" strokeWidth="2" strokeDasharray="4,6" opacity="0.9" />
            <circle cx="250" cy="337" r="72" fill="none" stroke="#fde047" strokeWidth="1.5" strokeDasharray="8,4" opacity="0.75" />
            {/* Solar Eyelash Highlights */}
            <circle cx="230" cy="315" r="12" fill="#ffffff" opacity="0.9" />
          </g>

          {/* Right Eye Outline */}
          <g transform="translate(450, 0)">
            <ellipse cx="250" cy="337" rx="190" ry="110" fill="#fef3c7" stroke="#451a03" strokeWidth="8" />
            {/* Iris */}
            <circle cx="250" cy="337" r="85" fill="url(#amberIris)" />
            {/* Pupil */}
            <circle cx="250" cy="337" r="38" fill="url(#sacredPupil)" />
            {/* Sacred Concentric Sigil Rings */}
            <circle cx="250" cy="337" r="54" fill="none" stroke="#fde047" strokeWidth="2" strokeDasharray="4,6" opacity="0.9" />
            <circle cx="250" cy="337" r="72" fill="none" stroke="#fde047" strokeWidth="1.5" strokeDasharray="8,4" opacity="0.75" />
            <circle cx="230" cy="315" r="12" fill="#ffffff" opacity="0.9" />
          </g>

          {/* Dramatic Shadowing */}
          <path d="M 0 0 L 1200 0 L 1200 230 Q 600 280 0 230 Z" fill="#1c1917" opacity="0.9" />
          <path d="M 0 675 L 1200 675 L 1200 450 Q 600 410 0 450 Z" fill="#1c1917" opacity="0.9" />
        </svg>
      );

    case 'threshold-sunset':
    default:
      // StarKeep Pilot 08: Sunset Threshold
      return (
        <svg viewBox="0 0 1200 675" className="w-full h-full object-cover">
          <defs>
            <linearGradient id="sunsetGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ea580c" />
              <stop offset="35%" stopColor="#f59e0b" />
              <stop offset="65%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#1e3a1e" />
            </linearGradient>
            <radialGradient id="sunDusk" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="1200" height="675" fill="url(#sunsetGrad)" />
          <circle cx="950" cy="200" r="140" fill="url(#sunDusk)" opacity="0.9" />

          {/* Forest Valley in Sunset Silhouettes */}
          <path d="M 0 380 Q 400 320 800 420 L 1200 360 L 1200 675 L 0 675 Z" fill="#14532d" opacity="0.85" />
          <path d="M 0 460 Q 500 420 1200 480 L 1200 675 L 0 675 Z" fill="#052e16" />

          {/* Temple Balustrade & Railing (Foreground) */}
          <path d="M 0 675 L 600 520 L 1200 675 Z" fill="#f8fafc" opacity="0.9" />
          <line x1="200" y1="580" x2="1000" y2="580" stroke="#d4af37" strokeWidth="8" />

          {/* Aku at the Railing looking out */}
          <circle cx="680" cy="430" r="20" fill="#78350f" />
          <path d="M 660 450 L 700 450 L 685 530 Z" fill="#0284c7" />

          {/* Birds soaring into the sun */}
          <path d="M 780 230 Q 795 220 810 235 Q 825 220 840 230" fill="none" stroke="#ffffff" strokeWidth="2.5" />
          <path d="M 880 270 Q 890 260 900 275 Q 910 260 920 270" fill="none" stroke="#ffffff" strokeWidth="2" />
        </svg>
      );
  }
}
