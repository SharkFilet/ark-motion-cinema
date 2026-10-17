// Procedural Sound Engine using Web Audio API for SHARKFILET Ark Motion Cinema

class ArkSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientNodes: { osc?: OscillatorNode; filter?: BiquadFilterNode; lfo?: OscillatorNode }[] = [];
  private isMuted: boolean = false;
  private currentMood: string = '';

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.7, this.ctx.currentTime, 0.05);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime, 0.05);
    }
  }

  // Play ambient soundscape based on scene mood
  public playMood(mood: string) {
    if (this.currentMood === mood) return;
    this.init();
    if (!this.ctx || !this.ambientGain) return;

    this.stopAmbient();
    this.currentMood = mood;

    const t = this.ctx.currentTime;

    switch (mood) {
      case 'orbital-assembly': {
        // Deep spatial cosmic drone + soft high shimmers
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(55, t); // A1 note
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(110, t); // A2 note

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(280, t);

        const subGain = this.ctx.createGain();
        subGain.gain.setValueAtTime(0.25, t);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(subGain);
        subGain.connect(this.ambientGain);

        osc1.start(t);
        osc2.start(t);
        this.ambientNodes.push({ osc: osc1, filter }, { osc: osc2 });
        break;
      }

      case 'sacred-arcanum': {
        // 432Hz / 528Hz ethereal temple harmonic
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(216, t);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(432, t);

        lfo.frequency.setValueAtTime(0.2, t); // slow pulse
        lfoGain.gain.setValueAtTime(6, t);
        lfo.connect(osc2.frequency);

        const chordGain = this.ctx.createGain();
        chordGain.gain.setValueAtTime(0.2, t);

        osc1.connect(chordGain);
        osc2.connect(chordGain);
        chordGain.connect(this.ambientGain);

        osc1.start(t);
        osc2.start(t);
        lfo.start(t);
        this.ambientNodes.push({ osc: osc1 }, { osc: osc2, lfo });
        break;
      }

      case 'quantum-warp': {
        // Ominous resonant low hum with slow frequency rise
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(65, t);
        osc.frequency.exponentialRampToValueAtTime(95, t + 10);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, t);

        const qGain = this.ctx.createGain();
        qGain.gain.setValueAtTime(0.3, t);

        osc.connect(filter);
        filter.connect(qGain);
        qGain.connect(this.ambientGain);

        osc.start(t);
        this.ambientNodes.push({ osc, filter });
        break;
      }

      case 'temple-morning':
      case 'threshold-horizon': {
        // Warm golden sunrise drone + harmonic overtones
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(146.83, t); // D3
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(220, t); // A3

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, t);

        const warmGain = this.ctx.createGain();
        warmGain.gain.setValueAtTime(0.25, t);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(warmGain);
        warmGain.connect(this.ambientGain);

        osc1.start(t);
        osc2.start(t);
        this.ambientNodes.push({ osc: osc1, filter }, { osc: osc2 });
        break;
      }

      default: {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(130.81, t); // C3
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.18, t);
        osc.connect(g);
        g.connect(this.ambientGain);
        osc.start(t);
        this.ambientNodes.push({ osc });
        break;
      }
    }
  }

  public stopAmbient() {
    this.ambientNodes.forEach(node => {
      try {
        node.osc?.stop();
        node.lfo?.stop();
        node.osc?.disconnect();
      } catch (e) {}
    });
    this.ambientNodes = [];
    this.currentMood = '';
  }

  // Play specialized SFX
  public playSFX(type: 'KRRK' | 'TOK TOK' | 'HUMMM' | 'CHIME' | 'WIND') {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;

    switch (type) {
      case 'KRRK': {
        // Crystalline fracture: high pitch sudden snap with resonant ring
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(3200, t + 0.04);
        osc.frequency.exponentialRampToValueAtTime(400, t + 0.18);

        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.4);

        // Secondary glass ring
        const ring = this.ctx.createOscillator();
        const ringGain = this.ctx.createGain();
        ring.type = 'sine';
        ring.frequency.setValueAtTime(2480, t + 0.02);
        ringGain.gain.setValueAtTime(0.3, t + 0.02);
        ringGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

        ring.connect(ringGain);
        ringGain.connect(this.sfxGain);

        ring.start(t + 0.02);
        ring.stop(t + 0.75);
        break;
      }

      case 'TOK TOK': {
        // Heavy footsteps on marble
        [0, 0.28].forEach(offset => {
          if (!this.ctx || !this.sfxGain) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const filter = this.ctx.createBiquadFilter();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(160, t + offset);
          osc.frequency.exponentialRampToValueAtTime(40, t + offset + 0.08);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(350, t + offset);

          gain.gain.setValueAtTime(0.6, t + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.14);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.sfxGain);

          osc.start(t + offset);
          osc.stop(t + offset + 0.16);
        });
        break;
      }

      case 'HUMMM': {
        // Deep spatial warp ignition hum
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(70, t);
        osc.frequency.exponentialRampToValueAtTime(140, t + 1.2);

        gain.gain.setValueAtTime(0.05, t);
        gain.gain.linearRampToValueAtTime(0.4, t + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(250, t);
        filter.frequency.linearRampToValueAtTime(600, t + 1.0);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 2.1);
        break;
      }

      case 'CHIME': {
        // Celestial sacred chime / Arcanum bell
        [528, 792, 1056].forEach((freq, idx) => {
          if (!this.ctx || !this.sfxGain) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + idx * 0.06);

          gain.gain.setValueAtTime(0.25 / (idx + 1), t + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.06 + 1.8);

          osc.connect(gain);
          gain.connect(this.sfxGain);

          osc.start(t + idx * 0.06);
          osc.stop(t + idx * 0.06 + 2.0);
        });
        break;
      }

      case 'WIND': {
        // Soft mountain breeze
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, t);
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.linearRampToValueAtTime(0.2, t + 0.8);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 2.6);
        break;
      }
    }
  }
}

export const soundEngine = new ArkSoundEngine();
