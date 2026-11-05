// Semua suara dibuat langsung di browser, tanpa file audio.
// Fitur bicara: rekam suara pengguna, lalu anjing mengulanginya dengan nada lebih tinggi.

let context = null;

function audio() {
  if (!context) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    context = new Ctx();
  }
  if (context.state === 'suspended') context.resume();
  return context;
}

let master = null;
let muted = false;

function output(ctx) {
  if (!master) {
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
  }
  return master;
}

function tone({ type = 'sine', from, to, start = 0, duration, gain = 0.2, filter = null, filterQ = 2 }) {
  const ctx = audio();
  if (!ctx) return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t0 + duration);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.linearRampToValueAtTime(gain, t0 + Math.min(0.015, duration / 4));
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  let last = osc;
  if (filter) {
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = filter;
    band.Q.value = filterQ;
    osc.connect(band);
    last = band;
  }
  last.connect(amp);
  amp.connect(output(ctx));
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function noiseBurst({ start = 0, duration = 0.06, gain = 0.2, frequency = 2400 }) {
  const ctx = audio();
  if (!ctx) return;
  const t0 = ctx.currentTime + start;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = frequency;
  const amp = ctx.createGain();
  amp.gain.value = gain;
  source.connect(band);
  band.connect(amp);
  amp.connect(output(ctx));
  source.start(t0);
}

// Nada untuk melodi. C4 = 261,63 Hz.
const note = (semitones) => 261.63 * Math.pow(2, semitones / 12);

export const sounds = {
  shutter() {
    noiseBurst({ duration: 0.05, gain: 0.22, frequency: 3400 });
    noiseBurst({ start: 0.09, duration: 0.05, gain: 0.16, frequency: 2300 });
  },
  tick() {
    tone({ type: 'sine', from: 880, to: 880, duration: 0.09, gain: 0.1 });
  },
  birthday() {
    // Lagu Selamat Ulang Tahun, versi kotak musik.
    const song = [
      [7, 0.75], [7, 0.25], [9, 1], [7, 1], [12, 1], [11, 2],
      [7, 0.75], [7, 0.25], [9, 1], [7, 1], [14, 1], [12, 2],
      [7, 0.75], [7, 0.25], [19, 1], [16, 1], [12, 1], [11, 1], [9, 2],
      [17, 0.75], [17, 0.25], [16, 1], [12, 1], [14, 1], [12, 2.5],
    ];
    const beat = 0.34;
    let start = 0;
    song.forEach(([pitch, length]) => {
      tone({ type: 'triangle', from: note(pitch), to: note(pitch), start, duration: Math.max(length * beat * 1.2, 0.26), gain: 0.14 });
      tone({ type: 'sine', from: note(pitch + 12), to: note(pitch + 12), start, duration: 0.2, gain: 0.03 });
      start += length * beat;
    });
    return start;
  },

  bark(pitch = 1.3) {
    const once = (start) => {
      tone({ type: 'sawtooth', from: 620 * pitch, to: 240 * pitch, start, duration: 0.14, gain: 0.3, filter: 980 * pitch, filterQ: 1.3 });
      noiseBurst({ start, duration: 0.05, gain: 0.12, frequency: 1700 * pitch });
    };
    once(0);
    once(0.2);
  },
  whimper(pitch = 1.3) {
    tone({ type: 'triangle', from: 760 * pitch, to: 1060 * pitch, duration: 0.2, gain: 0.08 });
    tone({ type: 'triangle', from: 1020 * pitch, to: 700 * pitch, start: 0.18, duration: 0.24, gain: 0.07 });
  },
  squeak() {
    tone({ type: 'sine', from: 1250, to: 1800, duration: 0.09, gain: 0.08 });
    tone({ type: 'sine', from: 1800, to: 1000, start: 0.09, duration: 0.1, gain: 0.07 });
  },
  boop() {
    tone({ type: 'sine', from: 520, to: 880, duration: 0.09, gain: 0.14 });
  },
  growl(pitch = 1.3, duration = 0.8) {
    tone({ type: 'sawtooth', from: 118 * pitch, to: 92 * pitch, duration, gain: 0.26, filter: 420, filterQ: 0.9 });
    tone({ type: 'square', from: 62 * pitch, to: 54 * pitch, duration, gain: 0.08, filter: 300, filterQ: 0.7 });
  },
  angry(pitch = 1.3) {
    sounds.growl(pitch, 2.8);
    [0.1, 0.72, 1.32, 1.95].forEach((start) => {
      tone({ type: 'sawtooth', from: 560 * pitch, to: 200 * pitch, start, duration: 0.17, gain: 0.3, filter: 860 * pitch, filterQ: 1.1 });
      noiseBurst({ start, duration: 0.06, gain: 0.14, frequency: 1500 * pitch });
    });
  },
  hello() {
    tone({ type: 'triangle', from: 480, to: 660, duration: 0.14, gain: 0.1 });
    tone({ type: 'triangle', from: 660, to: 820, start: 0.13, duration: 0.18, gain: 0.09 });
  },
  crunch() {
    for (let i = 0; i < 5; i++) noiseBurst({ start: i * 0.2 + 0.05, duration: 0.07, gain: 0.16, frequency: 2800 + i * 120 });
  },
};

/** Mendengarkan mikrofon, berhenti saat hening, lalu memutar ulang dengan nada anjing. */
export function createVoiceRepeater({ onStatus, onMouth }) {
  let stream = null;
  let recorder = null;
  let chunks = [];
  let raf = 0;
  let busy = false;
  let currentPitch = 1.4;

  const SPEECH_LEVEL = 0.022;
  const SILENCE_MS = 800;
  const WAIT_MS = 7000;
  const MAX_MS = 6000;

  function stopStream() {
    cancelAnimationFrame(raf);
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    recorder = null;
  }

  function level(analyser, buffer) {
    analyser.getFloatTimeDomainData(buffer);
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
    return Math.sqrt(sum / buffer.length);
  }

  async function replay(blob) {
    const ctx = audio();
    try {
      const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
      const source = ctx.createBufferSource();
      source.buffer = decoded;
      source.playbackRate.value = currentPitch;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyser.connect(output(ctx));
      const buffer = new Float32Array(analyser.fftSize);
      onStatus('speaking');
      source.onended = () => {
        cancelAnimationFrame(raf);
        onMouth(0);
        busy = false;
        onStatus('idle');
      };
      source.start();
      const drive = () => {
        onMouth(Math.min(1, level(analyser, buffer) * 7));
        raf = requestAnimationFrame(drive);
      };
      drive();
    } catch {
      busy = false;
      onStatus('error');
    }
  }

  return {
    get busy() {
      return busy;
    },
    async start(pitch) {
      if (busy) return;
      currentPitch = pitch + 0.1;
      const ctx = audio();
      if (!ctx || !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        onStatus('unsupported');
        return;
      }
      busy = true;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      } catch {
        busy = false;
        onStatus('denied');
        return;
      }
      onStatus('listening');
      chunks = [];
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => chunks.push(event.data);
      recorder.onstop = () => {
        const heard = chunks.length ? new Blob(chunks, { type: recorder?.mimeType }) : null;
        stopStream();
        if (heard && spoke) replay(heard);
        else {
          busy = false;
          onStatus('silent');
        }
      };
      recorder.start();

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const buffer = new Float32Array(analyser.fftSize);
      const started = performance.now();
      let spoke = false;
      let lastLoud = started;

      const listen = () => {
        const now = performance.now();
        if (level(analyser, buffer) > SPEECH_LEVEL) {
          spoke = true;
          lastLoud = now;
        }
        const done = (spoke && now - lastLoud > SILENCE_MS) || now - started > (spoke ? MAX_MS : WAIT_MS);
        if (done) {
          if (recorder?.state === 'recording') recorder.stop();
          return;
        }
        raf = requestAnimationFrame(listen);
      };
      listen();
    },
  };
}

export function setMuted(value) {
  muted = value;
  if (master) master.gain.value = value ? 0 : 1;
}

/** Musik latar lembut: petikan kotak musik yang berulang. */
export function createMusic() {
  const chords = [
    [0, 4, 7, 12],
    [-3, 0, 4, 9],
    [-7, -3, 0, 5],
    [-5, -1, 2, 7],
  ];
  const melody = [16, 14, 12, 14, 16, 19, 16, 14, 12, 9, 12, 14, 12, 7, 9, 12];
  const stepTime = 0.46;
  let timer = 0;
  let step = 0;
  let nextAt = 0;
  let wanted = false;
  let paused = false;

  const pluck = (pitch, at, gain, length = 0.9) => tone({ type: 'sine', from: note(pitch), to: note(pitch), start: at, duration: length, gain });

  function schedule() {
    const ctx = audio();
    if (!ctx) return;
    if (nextAt < ctx.currentTime) nextAt = ctx.currentTime + 0.1;
    while (nextAt < ctx.currentTime + 0.6) {
      const at = nextAt - ctx.currentTime;
      const chord = chords[Math.floor(step / 4) % chords.length];
      pluck(chord[step % 4] - 12, at, 0.032, 1.1);
      if (step % 2 === 0) pluck(melody[(step / 2) % melody.length], at, 0.03, 0.8);
      step += 1;
      nextAt += stepTime;
    }
  }

  const sync = () => {
    clearInterval(timer);
    timer = wanted && !paused ? setInterval(schedule, 200) : 0;
    if (timer) schedule();
  };
  return {
    set(value) {
      wanted = value;
      sync();
    },
    pause(value) {
      paused = value;
      sync();
    },
  };
}
