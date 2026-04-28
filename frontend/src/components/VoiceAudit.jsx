import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Mic, MicOff, Play, Pause } from 'lucide-react';
import { API_BASE } from '../utils/apiConfig';

const QUICK_QUERIES = [
  { label: 'Indigenous patients', query: 'Analyze the bias against Indigenous patients in this model.' },
  { label: 'Elderly women', query: 'Is this model safe for elderly women in low-income areas?' },
  { label: 'Rural access', query: 'Check this model\'s performance for rural low-income patients.' },
  { label: 'Disability bias', query: 'How does this model treat patients with disabilities?' },
  { label: 'Regulatory risk', query: 'What regulatory violations does this model have?' },
];

function WaveformBars({ isPlaying }) {
  return (
    <div className="flex items-end gap-0.5 h-6">
      {Array.from({ length: 20 }, (_, i) => (
        <div key={i} className="w-[3px] rounded-sm bg-accent-purple transition-all"
          style={{
            height: isPlaying ? `${4 + Math.sin(Date.now() / 200 + i) * 12 + Math.random() * 8}px` : '4px',
            animationDelay: `${i * 50}ms`,
            transition: 'height 0.15s ease',
          }} />
      ))}
    </div>
  );
}

function AnimatedWaveform({ isPlaying }) {
  const [bars, setBars] = useState(Array(20).fill(4));
  const rafRef = useRef(null);

  useEffect(() => {
    if (!isPlaying) {
      setBars(Array(20).fill(4));
      return;
    }

    const animate = () => {
      setBars(prev => prev.map((_, i) =>
        4 + Math.sin(Date.now() / 200 + i * 0.8) * 10 + Math.random() * 6
      ));
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying]);

  return (
    <div className="flex items-end gap-0.5 h-8">
      {bars.map((h, i) => (
        <div key={i} className="w-[3px] rounded-sm bg-accent-purple"
          style={{ height: `${h}px`, transition: 'height 0.1s ease' }} />
      ))}
    </div>
  );
}

export default function VoiceAudit() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [displayedResponse, setDisplayedResponse] = useState('');
  const [audioBase64, setAudioBase64] = useState(null);
  const [error, setError] = useState('');
  const audioRef = useRef(null);
  const typewriterRef = useRef(null);

  const playAudio = useCallback((base64Audio) => {
    try {
      const binary = atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play();
      setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
    } catch {
      console.error('Audio playback failed');
    }
  }, []);

  const typewriterEffect = useCallback((text) => {
    setDisplayedResponse('');
    let index = 0;
    if (typewriterRef.current) clearInterval(typewriterRef.current);
    typewriterRef.current = setInterval(() => {
      if (index < text.length) {
        setDisplayedResponse(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(typewriterRef.current);
      }
    }, 25);
  }, []);

  const sendQuery = useCallback(async (queryText) => {
    setError('');
    setResponse('');
    setDisplayedResponse('');
    setAudioBase64(null);
    setIsProcessing(true);

    try {
      const res = await axios.post(`${API_BASE}/api/voice-audit`, {
        query: queryText,
        query_type: 'custom',
      });
      setResponse(res.data.analysis);
      typewriterEffect(res.data.analysis);
      if (res.data.audio_base64) {
        setAudioBase64(res.data.audio_base64);
        playAudio(res.data.audio_base64);
      }
    } catch (err) {
      setError('Gemini analysis unavailable — check API key');
      console.error(err);
    }
    setIsProcessing(false);
  }, [playAudio, typewriterEffect]);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('🎙 Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      sendQuery(transcript);
    };
    recognition.onerror = (e) => {
      setIsListening(false);
      if (e.error === 'not-allowed') setError('🎙 Microphone access required. Please enable microphone permissions.');
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  }, [sendQuery]);

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    } else if (audioBase64) {
      playAudio(audioBase64);
    }
  };

  const highlightText = (text) => {
    return text
      .replace(/(Group 4|Indigenous|Alaska Native)/g, '<span class="text-accent-red font-semibold">$1</span>')
      .replace(/(\d+\.?\d*%)/g, '<span class="text-accent-cyan font-mono">$1</span>')
      .replace(/(847)/g, '<span class="text-accent-red font-mono font-bold">$1</span>')
      .replace(/(reduction|improvement|improved|included)/gi, '<span class="text-accent-green">$1</span>');
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <Mic size={20} className="text-accent-purple" />
          Voice-to-Audit
        </h3>
        <span className="text-[10px] px-2 py-1 rounded-full bg-accent-purple/20 text-accent-purple border border-accent-purple/40 font-medium">
          GEMINI POWERED
        </span>
      </div>

      {/* Input area */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <button onClick={startListening} disabled={isListening || isProcessing}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isListening ? 'bg-accent-red text-white' : 'bg-accent-purple text-white hover:bg-accent-purple/80'
            }`}>
            {isListening ? <MicOff size={22} /> : <Mic size={22} />}
          </button>
          {isListening && (
            <>
              <div className="pulse-ring absolute inset-0 w-14 h-14 rounded-full" />
              <div className="pulse-ring absolute inset-0 w-14 h-14 rounded-full" />
              <div className="pulse-ring absolute inset-0 w-14 h-14 rounded-full" />
            </>
          )}
        </div>
        <input type="text" value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && query && sendQuery(query)}
          placeholder="Ask anything about this model's fairness..."
          className="flex-1 bg-bg-elevated border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-purple transition-colors"
        />
        {query && (
          <button onClick={() => sendQuery(query)} disabled={isProcessing}
            className="btn btn-purple text-sm">
            Analyze
          </button>
        )}
      </div>

      {isListening && <p className="text-xs text-accent-red mb-4 animate-pulse">Listening...</p>}

      {/* Quick queries */}
      <div className="flex flex-wrap gap-2 mb-6">
        {QUICK_QUERIES.map(q => (
          <button key={q.label}
            onClick={() => { setQuery(q.query); sendQuery(q.query); }}
            className="text-xs px-3 py-1.5 rounded-full border border-accent-purple/30 text-text-secondary hover:bg-accent-purple/10 hover:border-accent-purple hover:text-text-primary transition-all">
            {q.label}
          </button>
        ))}
      </div>

      {/* Processing state */}
      {isProcessing && (
        <div className="flex items-center gap-3 p-4 bg-bg-elevated rounded-lg border border-border">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-accent-purple animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }} />
            ))}
          </div>
          <span className="text-sm text-accent-purple">Gemini is analyzing...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg text-sm text-accent-red">
          {error}
        </div>
      )}

      {/* Response */}
      {displayedResponse && (
        <div className="mt-4 p-5 bg-bg-elevated rounded-lg border border-border">
          <div className="text-sm text-text-secondary leading-relaxed"
            dangerouslySetInnerHTML={{ __html: highlightText(displayedResponse) }} />

          {/* Audio player */}
          {audioBase64 && (
            <div className="mt-4 flex items-center gap-4 p-3 bg-bg-card rounded-lg border border-border/50">
              <button onClick={togglePlayback}
                className="w-10 h-10 rounded-full bg-accent-purple flex items-center justify-center text-white hover:bg-accent-purple/80 transition-colors">
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <div className="flex-1">
                <p className="text-xs text-text-muted mb-1">Gemini Voice Analysis</p>
                <AnimatedWaveform isPlaying={isPlaying} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
