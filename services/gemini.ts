import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Phrase } from "../types";

// --- API KEY SAFE ACCESS ---
// We use a safe getter to prevent "ReferenceError: process is not defined" 
// which causes white screens in pure browser environments.
const getApiKey = () => {
  try {
    // Check if process exists (Node/Build env) and has the key
    if (typeof process !== "undefined" && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {
    // Ignore errors if process is not defined
  }
  return "";
};

const apiKey = getApiKey();
// We allow initialization with a dummy key to prevent immediate crash, 
// but we will flag it so the UI can warn the user.
export const hasValidKey = !!apiKey && !apiKey.includes('dummy');

const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key-for-init' });

// --- AUDIO SYSTEM ---

// Cache promises to prevent duplicate network requests for the same text
// Key format: "text:::voiceName"
const audioPromiseCache = new Map<string, Promise<AudioBuffer | null>>();

// Shared context to prevent hitting browser limits
let sharedAudioContext: AudioContext | null = null;
// Track the currently playing source to ensure only one audio plays at a time
let currentSource: AudioBufferSourceNode | null = null;

const getAudioContext = () => {
  if (!sharedAudioContext) {
    // Allow browser to select native sample rate (usually 44100 or 48000) for better quality playback
    sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume();
  }
  return sharedAudioContext;
};

/**
 * Initializes the AudioContext on user gesture to unlock audio on mobile browsers.
 */
export const initializeAudio = () => {
    getAudioContext();
}

/**
 * Generates a batch of phrases. 
 */
export const generateEventPhrases = async (topic: string, level: string, sourceText?: string): Promise<Phrase[]> => {
  if (!hasValidKey) {
      throw new Error("API Key is missing. Please configure Vercel Environment Variables.");
  }

  try {
    let prompt = "";

    if (sourceText && sourceText.trim().length > 10) {
      // Extraction Mode
      prompt = `
        You are a linguistics expert helping a Brazilian student learn English for a specific event: "${topic}".
        
        I have provided a specific text below containing phrases in English and Portuguese.
        Your task is to EXTRACT these pairs into a structured JSON format.
        
        SOURCE TEXT:
        """
        ${sourceText}
        """
        
        OUTPUT RULES:
        1. Extract the English text and its corresponding Portuguese translation.
        2. CRITICAL: BREAK DOWN long sentences into VERY SHORT, ATOMIC segments (max 6-8 words).
           - Split at every comma, conjunction (and, but, or), or preposition where logical.
           - Aim for bite-sized chunks perfect for flashcards.
           - Example Source: "For this bride and groom, and for their well-being as a family, let us pray to the Lord."
           - Example Output (Split it up!):
             Item 1: "For this bride and groom,"
             Item 2: "and for their well-being"
             Item 3: "as a family,"
             Item 4: "let us pray to the Lord."
           - Ensure the Portuguese translation matches the specific English segment EXACTLY.
        3. MAINTAIN THE EXACT ORDER of phrases/segments as they appear in the source text.
        4. REMOVE "R." or "V." prefixes from the text. "R. Amen" should become just "Amen".
        5. Assign a difficulty level (${level}) based on complexity.
        6. Add a short 'context' field explaining the grammar or situation in Portuguese.
        7. Return ONLY JSON.
      `;
    } else {
      // Generation Mode
      prompt = `
        Create a list of 15 essential phrases for a Brazilian student attending the following event: "${topic}".
        The student's English level is: ${level}.
        
        Focus on practical, high-value sentences they will actually need to say or understand.
        Break long sentences into shorter, digestible chunks (max 8 words).
        Include a mix of questions and statements.
        
        Return the response in JSON format.
      `;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              english: { type: Type.STRING, description: "The phrase segment in English" },
              portuguese: { type: Type.STRING, description: "Portuguese translation of the segment" },
              context: { type: Type.STRING, description: "Context or grammar tip in Portuguese" },
              difficulty: { type: Type.STRING, enum: ["Beginner", "Intermediate", "Advanced"] }
            },
            required: ["english", "portuguese", "context", "difficulty"]
          }
        }
      }
    });

    const data = JSON.parse(response.text || "[]");
    return data.map((item: any, index: number) => ({
      ...item,
      id: `phrase-${index}-${Date.now()}`
    }));

  } catch (error) {
    console.error("Error generating phrases:", error);
    throw new Error("Failed to generate curriculum. Please try again.");
  }
};

/**
 * Preloads audio for a list of texts in batches to improve performance.
 * This is "fire and forget".
 */
export const preloadAudioBatch = async (texts: string[], voiceName: string) => {
  const BATCH_SIZE = 3;
  // Process in chunks to avoid overwhelming the network/browser
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(text => generateSpeech(text, voiceName)));
    // Small delay to yield to main thread if needed
    await new Promise(resolve => setTimeout(resolve, 50));
  }
};

/**
 * Generates speech audio for a given text using Gemini.
 * Uses caching to avoid regenerating the same audio.
 */
export const generateSpeech = (text: string, voiceName: string = 'Kore'): Promise<AudioBuffer | null> => {
  if (!text) return Promise.resolve(null);
  
  // Clean text for audio generation (remove R. prefix if present in legacy data)
  const cleanText = text.replace(/^R\.\s*/i, '').replace(/^V\.\s*/i, '').trim();
  
  // GUARD: If text is empty after cleaning (e.g. was just "R."), return null to prevent AI hallucination
  if (!cleanText) return Promise.resolve(null);
  
  const cacheKey = `${cleanText}:::${voiceName}`;

  // Check cache first
  if (audioPromiseCache.has(cacheKey)) {
    return audioPromiseCache.get(cacheKey)!;
  }

  // Create new promise
  const speechPromise = (async () => {
    if (!hasValidKey) return null;
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: cleanText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName }, 
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (!base64Audio) return null;

      // Decode Audio
      const ctx = getAudioContext();
      // Gemini TTS output is 24kHz PCM
      const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        ctx,
        24000, // Source sample rate
        1
      );

      return audioBuffer;

    } catch (error) {
      console.error("TTS Error:", error);
      // Remove from cache if failed so we can try again later
      audioPromiseCache.delete(cacheKey);
      return null;
    }
  })();

  audioPromiseCache.set(cacheKey, speechPromise);
  return speechPromise;
};

/**
 * Plays text using the browser's native Web Speech API.
 * Low latency, offline capable, best for fast-paced games.
 */
export const playNativeSpeech = (text: string, speed: number = 1.0) => {
  // Cancel current speech/audio
  stopAudio(); 
  
  // Clean text
  const cleanText = text.replace(/^R\.\s*/i, '').replace(/^V\.\s*/i, '').trim();
  if (!cleanText) return;

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'en-US'; 
  utterance.rate = speed;
  
  // Try to pick a decent US Female voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => 
    v.lang === 'en-US' && (
      v.name.includes('Google US English') || // Chrome/Android (Female)
      v.name.includes('Samantha') ||          // iOS/Mac (Female)
      v.name.includes('Zira') ||              // Windows (Female)
      v.name.includes('Victoria')             // Mac (Female)
    )
  );
  
  // Fallback to any English voice if strict female match fails
  const fallbackVoice = voices.find(v => v.lang === 'en-US');

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  } else if (fallbackVoice) {
    utterance.voice = fallbackVoice;
  }

  window.speechSynthesis.speak(utterance);
};

// Helper: Base64 Decode
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper: PCM to AudioBuffer
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sourceSampleRate: number, 
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  
  // Create buffer with the SOURCE sample rate (e.g., 24000). 
  // The context might be 48000, but this buffer tells the browser "I am 24k".
  // The browser handles the high-quality resampling during playback.
  const buffer = ctx.createBuffer(numChannels, frameCount, sourceSampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Stops any currently playing audio (Native or Web Audio).
 */
export const stopAudio = () => {
  // Stop Web Audio API
  if (currentSource) {
    try {
      currentSource.stop();
    } catch (e) {
      // Ignore if already stopped
    }
    currentSource = null;
  }
  
  // Stop Native Web Speech
  if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
  }
};

/**
 * Plays an audio buffer with optional playback rate control.
 * Ensures only one audio plays at a time.
 */
export const playAudioBuffer = (buffer: AudioBuffer, rate: number = 1.0) => {
    const ctx = getAudioContext();
    
    // Stop currently playing audio to prevent overlap
    stopAudio();

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate; // Client-side speed adjustment
    source.connect(ctx.destination);
    
    // Track new source
    currentSource = source;
    
    // Clean up reference when done
    source.onended = () => {
        if (currentSource === source) {
            currentSource = null;
        }
    };

    source.start(0);
}