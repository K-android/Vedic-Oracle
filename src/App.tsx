/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Moon, 
  Sun, 
  Star, 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  Send, 
  Loader2,
  Compass,
  ChevronRight,
  Info,
  MessageSquare,
  RefreshCw,
  History
} from 'lucide-react';
import Markdown from 'react-markdown';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BirthDetails {
  name: string;
  date: string;
  time: string;
  place: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface SavedSession {
  id: string;
  timestamp: number;
  details: BirthDetails;
  reading: string;
  chatMessages: ChatMessage[];
}

export default function App() {
  const [details, setDetails] = useState<BirthDetails>({
    name: '',
    date: '',
    time: '',
    place: ''
  });
  const [reading, setReading] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  // History state
  const [history, setHistory] = useState<SavedSession[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [chatInstance, setChatInstance] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load history on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('vedic_oracle_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history whenever it changes
  useEffect(() => {
    localStorage.setItem('vedic_oracle_history', JSON.stringify(history));
  }, [history]);

  // Update current session in history whenever reading or chat messages change
  useEffect(() => {
    if (currentSessionId && reading) {
      setHistory(prev => prev.map(session => 
        session.id === currentSessionId 
          ? { ...session, reading, chatMessages } 
          : session
      ));
    }
  }, [reading, chatMessages, currentSessionId]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDetails(prev => ({ ...prev, [name]: value }));
  };

  const loadSession = (session: SavedSession) => {
    setDetails(session.details);
    setReading(session.reading);
    setChatMessages(session.chatMessages);
    setCurrentSessionId(session.id);
    setIsHistoryOpen(false);
    
    // Re-initialize chat instance if needed
    reinitializeChat(session.details, session.reading, session.chatMessages);
  };

  const reinitializeChat = async (birthDetails: BirthDetails, initialReading: string, messages: ChatMessage[]) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = "gemini-3.1-pro-preview";
      
      const systemInstruction = `
        You are an expert Vedic Astrologer (Jyotishi) with deep knowledge of Parashara and Jaimini systems.
        Your goal is to provide highly accurate readings. 
        
        CRITICAL NAKSHATRA ACCURACY:
        - When calculating Nakshatras, be extremely precise about the Moon's position.
        - Mention the Nakshatra name, its Pada (quarter), the Nakshatra Lord, and the Deity associated with it.
        - Explain the specific qualities of that Nakshatra Pada in detail.
        - If you are unsure of the exact degree, use your vast knowledge of planetary cycles to provide the most probable Nakshatra based on the birth date and time.
        
        TONE: Professional, compassionate, insightful, and rooted in traditional Vedic wisdom.
      `;

      const chat = ai.chats.create({
        model: model,
        config: {
          systemInstruction: `${systemInstruction}\n\nYou are now in a follow-up chat session with ${birthDetails.name}. 
          Reference their birth details: Born on ${birthDetails.date} at ${birthDetails.time} in ${birthDetails.place}.
          
          CRITICAL: You MUST be consistent with the initial reading provided below. Do not contradict the Nakshatra, Lagna, or planetary positions mentioned in this reading:
          
          --- INITIAL READING START ---
          ${initialReading}
          --- INITIAL READING END ---
          
          Keep the conversation focused on Vedic Astrology and their specific chart as defined in the reading above.`,
        },
        history: messages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }))
      });
      setChatInstance(chat);
    } catch (err) {
      console.error("Error reinitializing chat:", err);
    }
  };

  const generateReading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.name || !details.date || !details.time || !details.place) {
      setError("Please fill in all birth details.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setReading(null);
    setChatMessages([]);
    setIsChatting(false);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = "gemini-3.1-pro-preview";
      
      const systemInstruction = `
        You are an expert Vedic Astrologer (Jyotishi) with deep knowledge of Parashara and Jaimini systems.
        Your goal is to provide highly accurate readings. 
        
        CRITICAL NAKSHATRA ACCURACY:
        - When calculating Nakshatras, be extremely precise about the Moon's position.
        - Mention the Nakshatra name, its Pada (quarter), the Nakshatra Lord, and the Deity associated with it.
        - Explain the specific qualities of that Nakshatra Pada in detail.
        - If you are unsure of the exact degree, use your vast knowledge of planetary cycles to provide the most probable Nakshatra based on the birth date and time.
        
        TONE: Professional, compassionate, insightful, and rooted in traditional Vedic wisdom.
      `;

      const prompt = `
        Provide a detailed Vedic Astrology reading for:
        Name: ${details.name}
        Date of Birth: ${details.date}
        Time of Birth: ${details.time}
        Place of Birth: ${details.place}
        
        Please include:
        1. **Ascendant (Lagna)**: Personality and physical traits.
        2. **Moon Sign (Rashi) & Detailed Nakshatra Analysis**: Emotional nature, mental makeup, Nakshatra Pada, Lord, and Deity.
        3. **Planetary Positions**: Key highlights of major planets.
        4. **Current Mahadasha & Antardasha**: Estimation of the current period.
        5. **Life Areas**: Insights into Career, Relationships, and Health.
        6. **Remedies (Upayas)**: Specific Vedic remedies.
        
        Format the response in beautiful Markdown.
      `;

      const response = await ai.models.generateContent({
        model: model,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }] // Use search to verify ephemeris if needed
        }
      });

      const text = response.text || "The stars are silent. Please try again.";
      setReading(text);

      const newSessionId = crypto.randomUUID();
      setCurrentSessionId(newSessionId);
      
      const newSession: SavedSession = {
        id: newSessionId,
        timestamp: Date.now(),
        details: { ...details },
        reading: text,
        chatMessages: []
      };
      
      setHistory(prev => [newSession, ...prev]);

      // Initialize chat session with the initial reading as context to ensure consistency
      const chat = ai.chats.create({
        model: model,
        config: {
          systemInstruction: `${systemInstruction}\n\nYou are now in a follow-up chat session with ${details.name}. 
          Reference their birth details: Born on ${details.date} at ${details.time} in ${details.place}.
          
          CRITICAL: You MUST be consistent with the initial reading provided below. Do not contradict the Nakshatra, Lagna, or planetary positions mentioned in this reading:
          
          --- INITIAL READING START ---
          ${text}
          --- INITIAL READING END ---
          
          Keep the conversation focused on Vedic Astrology and their specific chart as defined in the reading above.`
        }
      });
      setChatInstance(chat);
      
    } catch (err) {
      console.error("Error generating reading:", err);
      setError("The cosmic connection was interrupted. Please check your details and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || !chatInstance || isLoading) return;

    const message = userInput.trim();
    setUserInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: message }]);
    setIsLoading(true);
    setIsChatting(true);

    try {
      const response = await chatInstance.sendMessage({ message });
      const text = response.text || "I am unable to interpret the stars at this moment.";
      setChatMessages(prev => [...prev, { role: 'model', text }]);
    } catch (err) {
      console.error("Chat error:", err);
      setChatMessages(prev => [...prev, { role: 'model', text: "Forgive me, the cosmic channel is flickering. Could you repeat your question?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
      setReading(null);
      setCurrentSessionId(null);
      setChatMessages([]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-5 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-astrology-gold blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-astrology-gold blur-[120px]" />
      </div>

      {/* History Sidebar */}
      <AnimatePresence>
        {isHistoryOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col border-l border-astrology-gold/10"
            >
              <div className="p-6 border-b border-astrology-gold/10 flex items-center justify-between bg-astrology-paper">
                <div className="flex items-center gap-3">
                  <History className="w-5 h-5 text-astrology-gold" />
                  <h2 className="text-xl font-serif font-bold">Reading History</h2>
                </div>
                <div className="flex items-center gap-2">
                  {history.length > 0 && (
                    <button 
                      onClick={() => {
                        if (confirm("Are you sure you want to clear all history?")) {
                          setHistory([]);
                          setReading(null);
                          setCurrentSessionId(null);
                        }
                      }}
                      className="text-xs text-red-400 hover:text-red-500 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                  <button 
                    onClick={() => setIsHistoryOpen(false)}
                    className="p-2 hover:bg-astrology-gold/10 rounded-full transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                    <History className="w-12 h-12 mb-4 text-astrology-gold" />
                    <p className="font-serif italic">Your cosmic journey begins here. No saved readings yet.</p>
                  </div>
                ) : (
                  history.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => loadSession(session)}
                      className={cn(
                        "p-4 rounded-2xl border transition-all cursor-pointer group relative",
                        currentSessionId === session.id
                          ? "bg-astrology-gold/10 border-astrology-gold shadow-sm"
                          : "bg-white border-astrology-gold/10 hover:border-astrology-gold/30 hover:shadow-md"
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-semibold text-astrology-deep truncate pr-6">{session.details.name}</h3>
                        <button 
                          onClick={(e) => deleteSession(session.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-red-400 rounded-md transition-all absolute right-2 top-2"
                        >
                          <RefreshCw className="w-3 h-3 rotate-45" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-astrology-deep/40 mb-2">
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(session.timestamp), 'MMM dd, HH:mm')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-astrology-deep/60">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{session.details.place}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12 w-full max-w-4xl flex flex-col items-center relative"
      >
        <div className="absolute right-0 top-0">
          <button 
            onClick={() => setIsHistoryOpen(true)}
            className="p-3 rounded-full bg-white shadow-md border border-astrology-gold/10 text-astrology-gold hover:bg-astrology-gold/5 transition-all flex items-center gap-2"
          >
            <History className="w-5 h-5" />
            <span className="hidden sm:inline text-sm font-medium">History</span>
          </button>
        </div>

        <div className="inline-block p-3 rounded-full bg-astrology-gold/10 mb-4 cursor-pointer hover:bg-astrology-gold/20 transition-colors" onClick={() => window.location.reload()}>
          <Compass className="w-10 h-10 text-astrology-gold animate-slow-spin" />
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-astrology-deep tracking-tight mb-2">
          Vedic Oracle
        </h1>
        <p className="text-astrology-deep/60 italic font-serif text-lg">
          Ancient wisdom, illuminated by artificial intelligence
        </p>
      </motion.header>

      <main className="w-full max-w-4xl flex flex-col gap-8">
        {/* Input Form - Only show if no reading yet or if user wants to reset */}
        {!reading && (
          <motion.section 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-xl shadow-astrology-gold/5 border border-astrology-gold/10 p-8 md:p-10"
          >
            <div className="flex items-center gap-3 mb-8 border-b border-astrology-gold/10 pb-4">
              <Sparkles className="w-6 h-6 text-astrology-gold" />
              <h2 className="text-2xl font-semibold">Enter Birth Details</h2>
            </div>

            <form onSubmit={generateReading} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-astrology-deep/70 ml-1">
                  <User className="w-4 h-4" /> Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={details.name}
                  onChange={handleInputChange}
                  placeholder="Full Name"
                  className="w-full px-4 py-3 rounded-xl border border-astrology-gold/20 focus:ring-2 focus:ring-astrology-gold/30 focus:border-astrology-gold outline-none transition-all bg-astrology-paper/50"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-astrology-deep/70 ml-1">
                  <Calendar className="w-4 h-4" /> Date of Birth
                </label>
                <input
                  type="date"
                  name="date"
                  value={details.date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-astrology-gold/20 focus:ring-2 focus:ring-astrology-gold/30 focus:border-astrology-gold outline-none transition-all bg-astrology-paper/50"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-astrology-deep/70 ml-1">
                  <Clock className="w-4 h-4" /> Time of Birth
                </label>
                <input
                  type="time"
                  name="time"
                  value={details.time}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-astrology-gold/20 focus:ring-2 focus:ring-astrology-gold/30 focus:border-astrology-gold outline-none transition-all bg-astrology-paper/50"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-astrology-deep/70 ml-1">
                  <MapPin className="w-4 h-4" /> Place of Birth
                </label>
                <input
                  type="text"
                  name="place"
                  value={details.place}
                  onChange={handleInputChange}
                  placeholder="City, Country"
                  className="w-full px-4 py-3 rounded-xl border border-astrology-gold/20 focus:ring-2 focus:ring-astrology-gold/30 focus:border-astrology-gold outline-none transition-all bg-astrology-paper/50"
                  required
                />
              </div>

              <div className="md:col-span-2 mt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={cn(
                    "w-full py-4 rounded-xl flex items-center justify-center gap-3 text-lg font-semibold transition-all duration-300",
                    isLoading 
                      ? "bg-astrology-gold/50 cursor-not-allowed text-white" 
                      : "bg-astrology-gold hover:bg-astrology-gold/90 text-white shadow-lg shadow-astrology-gold/20 active:scale-[0.98]"
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Consulting the Heavens...
                    </>
                  ) : (
                    <>
                      <Star className="w-5 h-5" />
                      Generate Vedic Reading
                    </>
                  )}
                </button>
              </div>
            </form>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center gap-3"
              >
                <Info className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </motion.div>
            )}
          </motion.section>
        )}

        {/* Reading Result & Chat */}
        <AnimatePresence mode="wait">
          {reading && (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Initial Reading Card */}
              <section className="bg-white rounded-3xl shadow-2xl border border-astrology-gold/10 overflow-hidden">
                <div className="bg-astrology-gold/5 px-8 py-6 border-b border-astrology-gold/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Moon className="w-6 h-6 text-astrology-gold" />
                    <h2 className="text-2xl font-serif font-bold">Your Cosmic Blueprint</h2>
                  </div>
                  <button 
                    onClick={() => setReading(null)}
                    className="text-xs font-mono text-astrology-gold hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> New Reading
                  </button>
                </div>
                
                <div className="p-8 md:p-12">
                  <div className="markdown-body prose prose-astrology max-w-none">
                    <Markdown>{reading}</Markdown>
                  </div>
                </div>
              </section>

              {/* Chat Section */}
              <section className="bg-white rounded-3xl shadow-xl border border-astrology-gold/10 overflow-hidden flex flex-col h-[600px]">
                <div className="bg-astrology-deep text-white px-8 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-astrology-gold" />
                    <h3 className="font-semibold">Ask the Oracle</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs opacity-60">
                    <History className="w-3 h-3" />
                    <span>Follow-up Session</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-astrology-paper/30">
                  {chatMessages.length === 0 && !isLoading && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                      <Sparkles className="w-12 h-12 mb-4 text-astrology-gold" />
                      <p className="font-serif italic text-lg">
                        Do you have questions about your career, relationships, or specific planetary periods?
                      </p>
                    </div>
                  )}

                  {chatMessages.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "flex w-full",
                        msg.role === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div className={cn(
                        "max-w-[85%] p-4 rounded-2xl shadow-sm",
                        msg.role === 'user' 
                          ? "bg-astrology-gold text-white rounded-tr-none" 
                          : "bg-white border border-astrology-gold/10 text-astrology-deep rounded-tl-none"
                      )}>
                        <div className={cn(
                          "markdown-body text-sm leading-relaxed",
                          msg.role === 'user' ? "text-white" : ""
                        )}>
                          <Markdown>{msg.text}</Markdown>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {isLoading && isChatting && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-astrology-gold/10 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-astrology-gold" />
                        <span className="text-xs italic text-astrology-deep/60">The Oracle is contemplating...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-astrology-gold/10 flex gap-2">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Ask about your chart..."
                    className="flex-1 px-4 py-3 rounded-xl border border-astrology-gold/20 focus:ring-2 focus:ring-astrology-gold/30 focus:border-astrology-gold outline-none transition-all bg-astrology-paper/50"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !userInput.trim()}
                    className="p-3 bg-astrology-gold text-white rounded-xl hover:bg-astrology-gold/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </section>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Info */}
        <footer className="text-center text-astrology-deep/30 text-sm mt-8 mb-12">
          <p>© {new Date().getFullYear()} Vedic Oracle AI • For spiritual guidance and entertainment purposes only.</p>
        </footer>
      </main>
    </div>
  );
}
