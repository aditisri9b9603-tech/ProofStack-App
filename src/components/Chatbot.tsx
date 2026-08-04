import React, { useState, useEffect, useRef } from 'react';
import { useApi } from '../context/ApiContext';
import { Send, Bot, User, X, MessageSquare, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../context/ToastContext';

export function Chatbot() {
  const { fetchApi } = useApi();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: string, text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Live API states
  const [isLiveActive, setIsLiveActive] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextStartTimeRef = useRef(0);

  const [tokensRemaining, setTokensRemaining] = useState<number | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const newMessages = [...messages, { role: 'user', text: input }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    
    try {
      const result = await fetchApi('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: input, history: messages })
      });
      if (result.error) {
        setMessages([...newMessages, { role: 'model', text: `Error: ${result.error}` }]);
      } else {
        setMessages([...newMessages, { role: 'model', text: result.reply }]);
        setTokensRemaining(result.tokensRemaining);
      }
    } catch (e: any) {
      const errorMsg = e.message || 'Failed to send message';
      showToast(errorMsg, 'error');
      setMessages([...newMessages, { role: 'model', text: `System: ${errorMsg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLiveAPI = async () => {
    if (isLiveActive) {
      stopLiveAPI();
    } else {
      startLiveAPI();
    }
  };

  const startLiveAPI = async () => {
    try {
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const inputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = inputAudioCtx;
      outputAudioContextRef.current = outputAudioCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const source = inputAudioCtx.createMediaStreamSource(stream);
      const processor = inputAudioCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;
      
      source.connect(processor);
      processor.connect(inputAudioCtx.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const pcmData = e.inputBuffer.getChannelData(0);
          const base64 = pcmToBase64(pcmData);
          ws.send(JSON.stringify({ audio: base64 }));
        }
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.audio) {
          playAudioChunk(outputAudioCtx, msg.audio);
        }
        if (msg.interrupted) {
          // stop playback
          audioQueueRef.current = [];
          nextStartTimeRef.current = 0;
        }
      };

      setIsLiveActive(true);
      showToast('Voice conversation started!', 'success');
    } catch (e) {
      showToast('Failed to start voice. Allow mic access.', 'error');
      stopLiveAPI();
    }
  };

  const pcmToBase64 = (pcmData: Float32Array) => {
    const buffer = new ArrayBuffer(pcmData.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < pcmData.length; i++) {
      let s = Math.max(-1, Math.min(1, pcmData[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const playAudioChunk = (ctx: AudioContext, base64: string) => {
    const binaryStr = window.atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }
    
    const buffer = ctx.createBuffer(1, float32Array.length, 24000);
    buffer.getChannelData(0).set(float32Array);
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    
    if (nextStartTimeRef.current < ctx.currentTime) {
      nextStartTimeRef.current = ctx.currentTime;
    }
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += buffer.duration;
  };

  const stopLiveAPI = () => {
    wsRef.current?.close();
    scriptProcessorRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    audioContextRef.current?.close();
    outputAudioContextRef.current?.close();
    setIsLiveActive(false);
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-primary to-accent text-white rounded-full shadow-[0_10px_30px_rgba(2,195,154,0.4)] transition-all z-40 border-2 border-white/40 flex items-center justify-center overflow-hidden"
        animate={{ 
          y: [0, -15, 0],
          x: [0, -5, 5, 0],
          rotate: [-5, 5, -5],
          boxShadow: [
            "0px 10px 30px rgba(2,195,154,0.4)",
            "0px 25px 50px rgba(2,195,154,0.6)",
            "0px 10px 30px rgba(2,195,154,0.4)"
          ]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{ scale: 1.15, rotate: 0 }}
        whileTap={{ scale: 0.85 }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }}>
              <X size={24} />
            </motion.div>
          ) : (
            <motion.div key="bot" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} className="flex items-center justify-center">
              <Bot size={28} className="animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.8, rotateX: 10 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20, transition: { duration: 0.2 } }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="fixed bottom-28 right-6 w-[360px] h-[540px] bg-white/70 backdrop-blur-3xl rounded-3xl shadow-[0_30px_60px_rgba(2,195,154,0.2)] border border-white/60 flex flex-col overflow-hidden z-40 transform-gpu"
            >
            {/* Header */}
            <div className="bg-primary/90 backdrop-blur-md p-4 flex justify-between items-center text-white border-b border-white/20">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ y: [-2, 2, -2], rotate: [-2, 2, -2] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="bg-white/20 p-2 rounded-full shadow-inner"
                >
                  <Bot size={24} className="text-white" />
                </motion.div>
                <div className="flex flex-col">
                  <span className="font-bold font-serif text-md tracking-tight">ProofStack Core</span>
                  {tokensRemaining !== null && (
                    <span className="text-[10px] uppercase tracking-wider opacity-80 font-bold">
                      {tokensRemaining} Tokens
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={toggleLiveAPI} 
                className={`p-2 rounded-full transition-colors backdrop-blur-sm ${isLiveActive ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30 border border-white/10'}`}
                title={isLiveActive ? "Stop Voice Chat" : "Start Voice Chat"}
              >
                {isLiveActive ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-offwhite/30">
              {messages.length === 0 && (
                <div className="text-center text-muted mt-10 text-sm">
                  Hi! I'm your AI assistant. How can I help you today?
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className={`max-w-[80%] p-3 rounded-2xl backdrop-blur-md shadow-sm ${m.role === 'user' ? 'bg-primary/90 text-white rounded-tr-sm border border-primary/20' : 'bg-white/90 border border-white/50 text-dark rounded-tl-sm'}`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.text}</p>
                  </motion.div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/90 backdrop-blur-md border border-white/50 text-muted p-3 rounded-2xl rounded-tl-sm flex gap-1 shadow-sm">
                    <span className="animate-bounce">●</span>
                    <span className="animate-bounce delay-100">●</span>
                    <span className="animate-bounce delay-200">●</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-white/60 backdrop-blur-md border-t border-white/40 flex gap-2">
              <input
                type="text"
                placeholder="Ask me anything..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                className="flex-1 px-4 py-2 bg-white/70 backdrop-blur-sm border border-white/60 shadow-inner rounded-full text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted/70"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="p-2.5 bg-primary/90 backdrop-blur-sm text-white rounded-full disabled:opacity-50 hover:bg-primary hover:shadow-lg transition-all"
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
