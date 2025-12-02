
import React, { useState, useEffect, useRef } from 'react';
import { generateEventPhrases, generateSpeech, playAudioBuffer, preloadAudioBatch, stopAudio, initializeAudio, playNativeSpeech } from './services/gemini';
import { Phrase, AppMode, AppSettings } from './types';
import { SparklesIcon, CardsIcon, EarIcon, MicIcon, CheckCircleIcon, XCircleIcon, RefreshIcon, PuzzleIcon, CogIcon, GridIcon, PencilIcon, LinkIcon } from './components/Icons';

// --- SUB COMPONENTS ---

const Header = ({ title, onBack, onSettings }: { title: string, onBack?: () => void, onSettings?: () => void }) => (
  <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10 px-4 md:px-6 py-4 flex items-center justify-between shadow-md">
    <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
      {onBack && (
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-800 rounded-full text-slate-300 hover:text-white transition-colors flex-shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      <div className="flex flex-col overflow-hidden">
        <h1 className="text-lg md:text-xl font-serif font-bold text-white tracking-wide truncate max-w-[200px] md:max-w-none">{title}</h1>
        <div className="flex items-center gap-1.5 opacity-80">
            <span className="text-[10px] uppercase tracking-widest text-amber-400 font-semibold truncate">American Wedding Prep</span>
            {/* Small subtle US Flag representation */}
            <div className="w-4 h-2.5 bg-red-600 flex-shrink-0 flex flex-col justify-between rounded-[1px] overflow-hidden opacity-80">
                <div className="h-[20%] bg-white"></div>
                <div className="h-[20%] bg-white"></div>
                <div className="absolute top-0 left-0 w-2 h-1.5 bg-blue-800"></div>
            </div>
        </div>
      </div>
    </div>
    
    <div className="flex items-center gap-2 flex-shrink-0">
      {onSettings && (
        <button onClick={onSettings} className="p-2 rounded-full text-slate-400 hover:bg-slate-800 hover:text-amber-400 transition-colors" title="Configurações">
           <CogIcon className="w-6 h-6" />
        </button>
      )}
    </div>
  </header>
);

const ProgressBar = ({ current, total }: { current: number; total: number }) => (
  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-6 flex-shrink-0">
    <div 
      className="bg-slate-800 h-full transition-all duration-500 ease-out"
      style={{ width: `${((current + 1) / total) * 100}%` }}
    />
  </div>
);

// --- MAIN APP COMPONENT ---

const DEFAULT_TEXT = `A reader continues: For this bride and groom, and for their well-being as a family, let us pray to the Lord.
O leitor continua: Por estes noivos, e pelo seu bem-estar como família, rezemos ao Senhor.

R. Lord, we ask you, hear our prayer.
R. Senhor, escutai a nossa prece.

Or another appropriate response of the people.
Ou outra resposta apropriada do povo.

For their relatives and friends, and for all who have assisted this couple, let us pray to the Lord. R.
Pelos seus familiares e amigos, e por todos os que ajudaram este casal, rezemos ao Senhor. R.

For young people preparing to enter Marriage, and for all whom the Lord is calling to another state in life, let us pray to the Lord. R.
Pelos jovens que se preparam para o Matrimónio, e por todos aqueles que o Senhor chama a outro estado de vida, rezemos ao Senhor. R.

For all families throughout the world and for lasting peace among all people, let us pray to the Lord. R.
Por todas as famílias do mundo inteiro e pela paz duradoura entre todos os povos, rezemos ao Senhor. R.

For all members of our families who have passed from this world, and for all the departed, let us pray to the Lord. R.
Por todos os membros das nossas famílias que partiram deste mundo, e por todos os defuntos, rezemos ao Senhor. R.

For the Church, the holy People of God, and for unity among all Christians, let us pray to the Lord. R.
Pela Igreja, o Povo santo de Deus, e pela unidade entre todos os cristãos, rezemos ao Senhor. R.

The priest or deacon concludes: Lord Jesus, who are present in our midst, as N. and N. seal their union accept our prayer and fill us with your Spirit. Who live and reign for ever and ever.
O sacerdote ou o diácono conclui: Senhor Jesus, que estais presente no meio de nós, enquanto N. e N. selam a sua união, aceitai a nossa oração e enchei-nos com o vosso Espírito. Vós que viveis e reinais por todos os séculos dos séculos.

R. Amen.
R. Amém.`;

export default function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.SETUP);
  const [topic, setTopic] = useState('Wedding Ceremony Prayers');
  const [level, setLevel] = useState('Intermediate');
  const [sourceText, setSourceText] = useState(DEFAULT_TEXT);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Settings State
  const [settings, setSettings] = useState<AppSettings>({
    voice: 'Kore',
    speed: 1.0
  });

  // Stats for the session
  const [completedActivities, setCompletedActivities] = useState<number>(0);

  const handleGenerate = async () => {
    initializeAudio(); // Unlock audio context
    if (!topic) return;
    setLoading(true);
    setError(null);
    try {
      const result = await generateEventPhrases(topic, level, sourceText);
      setPhrases(result);
      setMode(AppMode.DASHBOARD);
      
      // BACKGROUND AUDIO PRELOADING
      // Start fetching audio immediately so it's ready when user clicks an activity
      const allEnglish = result.map(p => p.english);
      
      // Prioritize the first few
      preloadAudioBatch(allEnglish.slice(0, 3), settings.voice).then(() => {
        // Then load the rest
        preloadAudioBatch(allEnglish.slice(3), settings.voice);
      });

    } catch (err) {
      setError("Não foi possível gerar o plano de aula. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const finishActivity = () => {
    stopAudio();
    setCompletedActivities(prev => prev + 1);
    setMode(AppMode.DASHBOARD);
  }

  // --- VIEWS ---

  if (mode === AppMode.SETUP) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Wedding Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40" 
          style={{backgroundImage: 'url(https://images.unsplash.com/photo-1519741497674-611481863552?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80)'}}
        ></div>
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>

        <div className="bg-white/95 backdrop-blur-sm max-w-2xl w-full rounded-2xl shadow-2xl p-6 md:p-8 border-t-4 border-amber-500 relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-2">BoaViagemBete!</h1>
            <p className="text-slate-600 font-medium">Preparação para Casamento Americano</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Evento</label>
              <input 
                type="text" 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all outline-none text-slate-900 font-serif"
                placeholder="ex: Cerimônia de Casamento"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Nível</label>
              <select 
                value={level} 
                onChange={(e) => setLevel(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg bg-slate-50 outline-none focus:border-amber-500 text-slate-900"
              >
                <option value="Beginner">Iniciante (Beginner)</option>
                <option value="Intermediate">Intermediário (Intermediate)</option>
                <option value="Advanced">Avançado (Advanced)</option>
              </select>
            </div>

            <div>
               <label className="block text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">
                 Roteiro / Liturgia
                 <span className="ml-2 text-xs font-normal text-slate-500 normal-case tracking-normal">Cole aqui o texto da cerimônia</span>
               </label>
               <textarea
                 value={sourceText}
                 onChange={(e) => setSourceText(e.target.value)}
                 className="w-full p-3 border border-slate-300 rounded-lg h-56 text-sm font-mono focus:ring-2 focus:ring-amber-500 outline-none resize-none bg-slate-50"
                 placeholder="Cole o texto aqui e a IA irá extrair as frases..."
               />
            </div>

            {error && (
              <div className="bg-red-50 text-red-800 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-200">
                <XCircleIcon className="w-5 h-5" />
                {error}
              </div>
            )}

            <button 
              onClick={handleGenerate}
              disabled={loading || !topic}
              className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.01] active:scale-[0.99]
                ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 border-b-4 border-slate-950'}`}
            >
              {loading ? (
                <>
                  <RefreshIcon className="w-5 h-5 animate-spin" /> Preparando...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5 text-amber-400" /> Iniciar Preparação
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === AppMode.DASHBOARD) {
    return (
      <div className="min-h-screen bg-slate-50 relative">
        {/* Subtle background texture */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{backgroundImage: 'url(https://www.transparenttextures.com/patterns/linen.png)'}}></div>
        
        <Header 
          title={topic} 
          onBack={() => { stopAudio(); setMode(AppMode.SETUP); }} 
          onSettings={() => { stopAudio(); setMode(AppMode.SETTINGS); }}
        />
        
        <main className="max-w-6xl mx-auto p-4 md:p-6 relative z-0">
          <div className="mb-8 text-center md:text-left">
            <h2 className="text-3xl font-serif font-bold text-slate-900 mb-2">Plano de Estudos</h2>
            <p className="text-slate-600 font-medium">Você tem {phrases.length} frases para dominar para a cerimônia.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
             {/* Wedding Theme Colors: Navy, Dusty Rose, Sage, Gold, Burgundy */}
             <ActivityCard 
              title="Preencher Lacunas" 
              description="Complete as frases com as palavras que faltam."
              icon={<PencilIcon className="w-8 h-8 text-white" />}
              color="bg-rose-400" // Dusty Rose
              onClick={() => { initializeAudio(); setMode(AppMode.CLOZE); }}
            />
            <ActivityCard 
              title="Ordenar Frases" 
              description="Ouça e organize as palavras na ordem certa."
              icon={<PuzzleIcon className="w-8 h-8 text-white" />}
              color="bg-slate-600" // Navy/Slate
              onClick={() => { initializeAudio(); setMode(AppMode.PUZZLE); }}
            />
            <ActivityCard 
              title="Encontre os Pares" 
              description="Conecte o Inglês com o Português rapidamente."
              icon={<LinkIcon className="w-8 h-8 text-white" />}
              color="bg-amber-500" // Gold/Champagne
              onClick={() => { initializeAudio(); setMode(AppMode.PAIRS); }}
            />
             <ActivityCard 
              title="Palavras Cruzadas" 
              description="Descubra a palavra que completa a frase."
              icon={<GridIcon className="w-8 h-8 text-white" />}
              color="bg-emerald-700" // Deep Sage/Emerald
              onClick={() => { initializeAudio(); setMode(AppMode.CROSSWORD); }}
            />
            <ActivityCard 
              title="Flashcards" 
              description="Teste sua memória: Português para Inglês."
              icon={<CardsIcon className="w-8 h-8 text-white" />}
              color="bg-indigo-900" // Midnight Blue
              onClick={() => { initializeAudio(); setMode(AppMode.FLASHCARDS); }}
            />
            <ActivityCard 
              title="Treino de Escuta" 
              description="Treine seu ouvido para entender."
              icon={<EarIcon className="w-8 h-8 text-white" />}
              color="bg-sky-600" // Sky Blue (Something Blue)
              onClick={() => { initializeAudio(); setMode(AppMode.LISTENING); }}
            />
            <ActivityCard 
              title="Laboratório de Fala" 
              description="Leia em voz alta e corrija a pronúncia."
              icon={<MicIcon className="w-8 h-8 text-white" />}
              color="bg-fuchsia-900" // Deep Burgundy/Purple
              onClick={() => { initializeAudio(); setMode(AppMode.SPEAKING); }}
            />
          </div>

          <div className="mt-12 bg-white rounded-xl p-8 shadow-sm border-t-4 border-slate-900">
             <h3 className="font-serif font-bold text-slate-800 mb-6 text-xl">Roteiro Completo</h3>
             <ul className="divide-y divide-slate-100">
                {phrases.map((p, i) => (
                  <li key={i} className="py-4 flex justify-between items-start hover:bg-slate-50 transition-colors px-2 rounded-lg">
                    <div>
                      <p className="font-serif font-medium text-slate-900 text-lg mb-1">{p.english}</p>
                      <p className="text-sm text-slate-500 italic">{p.portuguese}</p>
                    </div>
                  </li>
                ))}
             </ul>
          </div>
        </main>
      </div>
    );
  }

  // --- SETTINGS VIEW ---
  if (mode === AppMode.SETTINGS) {
     return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
           <Header title="Configurações" onBack={() => { stopAudio(); setMode(AppMode.DASHBOARD); }} />
           <div className="flex-1 max-w-2xl mx-auto w-full p-4 md:p-6">
              <div className="bg-white rounded-xl shadow-md border-t-4 border-slate-900 p-6 md:p-8 space-y-10">
                 
                 {/* Voice Selection */}
                 <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                       <EarIcon className="w-5 h-5 text-amber-500" />
                       Voz da Inteligência Artificial
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                       {['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'].map(voiceName => (
                          <button
                             key={voiceName}
                             onClick={() => setSettings(s => ({...s, voice: voiceName}))}
                             className={`p-4 rounded-lg border transition-all text-left ${
                                settings.voice === voiceName 
                                ? 'border-amber-500 bg-amber-50 text-slate-900 ring-1 ring-amber-500' 
                                : 'border-slate-200 hover:border-slate-400 text-slate-600'
                             }`}
                          >
                             <div className="font-bold">{voiceName}</div>
                             <div className="text-xs opacity-70">
                                {voiceName === 'Kore' ? 'Equilibrado' : 
                                 voiceName === 'Puck' ? 'Suave' : 
                                 voiceName === 'Charon' ? 'Grave' : 'Padrão'}
                             </div>
                          </button>
                       ))}
                    </div>
                 </div>

                 {/* Speed Selection */}
                 <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                       <RefreshIcon className="w-5 h-5 text-amber-500" />
                       Velocidade de Reprodução
                    </h3>
                    <div className="flex items-center gap-4 bg-slate-50 p-6 rounded-xl border border-slate-100">
                       <span className="text-slate-500 text-sm font-medium">Lento</span>
                       <input 
                          type="range" 
                          min="0.5" 
                          max="1.5" 
                          step="0.25"
                          value={settings.speed}
                          onChange={(e) => setSettings(s => ({...s, speed: parseFloat(e.target.value)}))}
                          className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                       />
                       <span className="text-slate-500 text-sm font-medium">Rápido</span>
                    </div>
                    <div className="text-center mt-2 font-mono text-slate-900 font-bold bg-amber-100 inline-block px-3 py-1 rounded-lg">
                       {settings.speed}x
                    </div>
                 </div>

                 <div className="pt-6 border-t border-slate-100">
                    <button 
                       onClick={() => { stopAudio(); setMode(AppMode.DASHBOARD); }}
                       className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-colors"
                    >
                       Salvar e Voltar
                    </button>
                 </div>
              </div>
           </div>
        </div>
     )
  }

  // --- ACTIVITY WRAPPERS ---

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
       <Header 
        title={
          mode === AppMode.FLASHCARDS ? 'Flashcards' : 
          mode === AppMode.LISTENING ? 'Treino de Escuta' : 
          mode === AppMode.SPEAKING ? 'Laboratório de Fala' : 
          mode === AppMode.PUZZLE ? 'Ordenar Frases' :
          mode === AppMode.CROSSWORD ? 'Palavras Cruzadas' :
          mode === AppMode.CLOZE ? 'Preencher Lacunas' :
          mode === AppMode.PAIRS ? 'Encontre os Pares' :
          'Atividade'
        } 
        onBack={() => { stopAudio(); setMode(AppMode.DASHBOARD); }}
        onSettings={() => { stopAudio(); setMode(AppMode.SETTINGS); }}
       />
       <div className="flex-1 flex flex-col max-w-full mx-auto w-full p-2 md:p-4 relative z-0 min-h-0 overflow-y-auto">
          {/* Subtle bg texture for activities too */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{backgroundImage: 'url(https://www.transparenttextures.com/patterns/linen.png)'}}></div>
          
          <div className="relative z-10 w-full h-full flex flex-col">
            {mode === AppMode.PUZZLE && <PuzzleActivity phrases={phrases} settings={settings} onFinish={finishActivity} />}
            {mode === AppMode.FLASHCARDS && <FlashcardActivity phrases={phrases} settings={settings} onFinish={finishActivity} />}
            {mode === AppMode.LISTENING && <ListeningActivity phrases={phrases} settings={settings} onFinish={finishActivity} />}
            {mode === AppMode.SPEAKING && <SpeakingActivity phrases={phrases} settings={settings} onFinish={finishActivity} />}
            {mode === AppMode.CROSSWORD && <CrosswordActivity phrases={phrases} settings={settings} onFinish={finishActivity} />}
            {mode === AppMode.CLOZE && <ClozeActivity phrases={phrases} settings={settings} onFinish={finishActivity} />}
            {mode === AppMode.PAIRS && <PairsActivity phrases={phrases} settings={settings} onFinish={finishActivity} />}
          </div>
       </div>
    </div>
  );
}

// --- ACTIVITY COMPONENTS ---

const ActivityCard = ({ title, description, icon, color, onClick }: any) => (
  <button onClick={onClick} className="group text-left bg-white rounded-xl p-6 shadow-sm hover:shadow-xl border-t-4 border-transparent hover:border-slate-800 transition-all duration-300 transform hover:-translate-y-1 h-full min-h-[140px] relative overflow-hidden w-full">
    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/0 to-slate-100 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`}></div>
    <div className={`${color} w-14 h-14 rounded-lg flex items-center justify-center shadow-md mb-4 group-hover:scale-105 transition-transform relative z-10`}>
      {icon}
    </div>
    <h3 className="text-xl font-serif font-bold text-slate-800 mb-1 relative z-10">{title}</h3>
    <p className="text-sm text-slate-500 leading-relaxed relative z-10">{description}</p>
  </button>
);

// --- RESTORED COMPLEX GRID CROSSWORD ---

interface CrosswordWord {
  word: string;
  phrase: Phrase;
  row: number;
  col: number;
  direction: 'across' | 'down';
  number: number;
}

const CrosswordActivity = ({ phrases, settings, onFinish }: { phrases: Phrase[], settings: AppSettings, onFinish: () => void }) => {
  const [grid, setGrid] = useState<(string | null)[][]>([]);
  const [words, setWords] = useState<CrosswordWord[]>([]);
  const [userInputs, setUserInputs] = useState<string[][]>([]);
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  const [isSolved, setIsSolved] = useState(false);
  const [foundWordIndices, setFoundWordIndices] = useState<Set<number>>(new Set());
  
  // Refs for auto-focus
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);
  if (inputRefs.current.length === 0) {
      inputRefs.current = Array(12).fill(null).map(() => Array(12).fill(null));
  }
  
  // Phase 2 State
  const [phase, setPhase] = useState<'CROSSWORD' | 'FILL_BLANKS'>('CROSSWORD');
  const [phase2Inputs, setPhase2Inputs] = useState<{[wordId: number]: string}>({}); // wordIndex -> selectedWordString

  useEffect(() => {
    generateCrossword();
  }, [phrases]);

  const generateCrossword = () => {
    // 1. Extract words
    const stopWords = new Set([
        'THE', 'AND', 'FOR', 'THAT', 'THIS', 'WITH', 'YOU', 'OUR', 'WHO', 'ALL', 'ARE', 'BUT', 'NOT', 'HAVE', 'CAN', 
        'FROM', 'YOUR', 'WHAT', 'WHEN', 'WHERE', 'BEEN', 'THEY', 'THEM', 'THEIR', 'WILL', 'WHICH', 'THERE', 'SOME',
        'INTO', 'ONTO', 'UPON', 'ABOUT', 'THEN', 'THAN', 'MORE', 'MOST', 'SUCH', 'LIKE', 'ONLY', 'VERY', 'ALSO', 'LORD', 'PRAY'
    ]);

    const candidates: {word: string, phrase: Phrase}[] = [];
    const uniqueWords = new Set<string>();

    phrases.forEach(p => {
       const clean = p.english.toUpperCase().replace(/[.,!?;:]/g, '');
       const parts = clean.split(' ');
       parts.forEach(w => {
         if (w.length >= 4 && !stopWords.has(w) && !uniqueWords.has(w)) {
            uniqueWords.add(w);
            candidates.push({ word: w, phrase: p });
         }
       });
    });
    
    // Sort by length (longest first)
    candidates.sort((a, b) => b.word.length - a.word.length);

    // 2. Generate Grid
    const gridSize = 12;
    const tempGrid: (string | null)[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    const placedWords: CrosswordWord[] = [];
    let wordNum = 1;

    const canPlace = (word: string, r: number, c: number, dir: 'across' | 'down') => {
        if (dir === 'across') {
            if (c + word.length > gridSize) return false;
            // Check boundaries (before/after)
            if (c > 0 && tempGrid[r][c - 1] !== null) return false;
            if (c + word.length < gridSize && tempGrid[r][c + word.length] !== null) return false;
            
            for (let i = 0; i < word.length; i++) {
                const cell = tempGrid[r][c + i];
                // Strict isolation: No parallel touching
                if (cell === null) {
                    // If empty, check neighbors above/below to ensure no touching
                    if (r > 0 && tempGrid[r-1][c+i] !== null) return false;
                    if (r < gridSize - 1 && tempGrid[r+1][c+i] !== null) return false;
                } else if (cell !== word[i]) {
                    // Intersection mismatch
                    return false; 
                }
            }
        } else {
            if (r + word.length > gridSize) return false;
            // Check boundaries
            if (r > 0 && tempGrid[r - 1][c] !== null) return false;
            if (r + word.length < gridSize && tempGrid[r + word.length][c] !== null) return false;

            for (let i = 0; i < word.length; i++) {
                const cell = tempGrid[r + i][c];
                // Strict isolation: No parallel touching
                if (cell === null) {
                    if (c > 0 && tempGrid[r+i][c-1] !== null) return false;
                    if (c < gridSize - 1 && tempGrid[r+i][c+1] !== null) return false;
                } else if (cell !== word[i]) {
                    return false;
                }
            }
        }
        return true;
    };

    const placeWord = (item: {word: string, phrase: Phrase}) => {
        // Try all positions
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const directions: ('across'|'down')[] = Math.random() > 0.5 ? ['across', 'down'] : ['down', 'across'];
                for (const dir of directions) {
                    if (canPlace(item.word, r, c, dir)) {
                        // Place it
                        for (let i = 0; i < item.word.length; i++) {
                            if (dir === 'across') tempGrid[r][c + i] = item.word[i];
                            else tempGrid[r + i][c] = item.word[i];
                        }
                        placedWords.push({
                            word: item.word,
                            phrase: item.phrase,
                            row: r, col: c, direction: dir,
                            number: wordNum++
                        });
                        return true;
                    }
                }
            }
        }
        return false;
    };

    // Attempt to place words
    const maxWords = 8;
    let count = 0;
    for (const cand of candidates) {
        if (count >= maxWords) break;
        if (placeWord(cand)) count++;
    }

    setGrid(tempGrid);
    setWords(placedWords);
    
    // Init Inputs: Pre-fill hyphens where needed!
    const initialInputs = tempGrid.map(row => row.map(cell => cell === '-' ? '-' : ''));
    setUserInputs(initialInputs);
    
    setIsSolved(false);
    setFoundWordIndices(new Set());
    setPhase('CROSSWORD');
  };

  const handleCellClick = (r: number, c: number) => {
    // Determine which word is being clicked
    const candidates = words.filter(w => {
         if (w.direction === 'across') return r === w.row && c >= w.col && c < w.col + w.word.length;
         return c === w.col && r >= w.row && r < w.row + w.word.length;
    });

    if (candidates.length === 0) return;

    // Logic: If already active on a word containing this cell, switch direction if possible (intersection)
    // Else, just pick the first candidate
    if (activeWordIndex !== null) {
        const current = words[activeWordIndex];
        const isCurrentAtCell = (current.direction === 'across' 
            ? (current.row === r && c >= current.col && c < current.col + current.word.length)
            : (current.col === c && r >= current.row && r < current.row + current.word.length));
        
        if (isCurrentAtCell && candidates.length > 1) {
            // Toggle to the other word at intersection
            const other = candidates.find(w => w.number !== current.number);
            if (other) {
                setActiveWordIndex(words.indexOf(other));
                return;
            }
        }
    }
    
    // Default: Set to first candidate
    setActiveWordIndex(words.indexOf(candidates[0]));
  };

  const checkCompletion = (currentInputs: string[][]) => {
    let allCorrect = true;
    const newFoundIndices = new Set<number>();

    words.forEach((w, idx) => {
        let wordCorrect = true;
        for (let i = 0; i < w.word.length; i++) {
            const rr = w.direction === 'down' ? w.row + i : w.row;
            const cc = w.direction === 'across' ? w.col + i : w.col;
            if (currentInputs[rr][cc] !== w.word[i]) {
                wordCorrect = false;
                allCorrect = false;
            }
        }
        if (wordCorrect) newFoundIndices.add(idx);
    });
    
    // Check for newly found words to play audio
    const newlyCompletedIndices = [...newFoundIndices].filter(x => !foundWordIndices.has(x));
    if (newlyCompletedIndices.length > 0) {
        // Play audio for the newly found word IMMEDIATELY using Native Speech (Zero Latency)
        const wordToSpeak = words[newlyCompletedIndices[0]].word;
        playNativeSpeech(wordToSpeak, settings.speed);
    }

    setFoundWordIndices(newFoundIndices);

    if (allCorrect && words.length > 0) {
        setIsSolved(true);
        setTimeout(() => setPhase('FILL_BLANKS'), 1500); // Transition after delay
    }
  };

  const handleInputChange = (r: number, c: number, val: string) => {
    // Only allow letters (ignore hyphen logic here, hyphen is strictly controlled by grid)
    if (val && !/^[a-zA-Z]$/.test(val)) return;
    
    const newVal = val.toUpperCase().slice(-1); // Take last char
    const newInputs = [...userInputs];
    newInputs[r][c] = newVal;
    setUserInputs(newInputs);

    // Auto-focus logic: Jump to next cell in active word
    if (newVal && activeWordIndex !== null) {
        const w = words[activeWordIndex];
        
        let nextR = r;
        let nextC = c;

        if (w.direction === 'across') {
             nextC++;
             // Skip if next cell is a hyphen (non-editable)
             if (nextC < 12 && grid[nextR][nextC] === '-') nextC++;
        } else {
             nextR++;
             // Skip if next cell is a hyphen
             if (nextR < 12 && grid[nextR][nextC] === '-') nextR++;
        }

        // Focus bounds check
        if (w.direction === 'across') {
             if (nextC < w.col + w.word.length) inputRefs.current[nextR][nextC]?.focus();
        } else {
             if (nextR < w.row + w.word.length) inputRefs.current[nextR][nextC]?.focus();
        }
    }

    checkCompletion(newInputs);
  };

  const handleKeyDown = (r: number, c: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
        e.preventDefault();
        
        const newInputs = [...userInputs];
        newInputs[r][c] = '';
        setUserInputs(newInputs);

        // Move focus backward
        if (activeWordIndex !== null) {
            const w = words[activeWordIndex];
            
            let prevR = r;
            let prevC = c;

            if (w.direction === 'across') {
                prevC--;
                // Skip back over hyphen
                if (prevC >= 0 && grid[prevR][prevC] === '-') prevC--;
                
                if (prevC >= w.col) inputRefs.current[prevR][prevC]?.focus();
            } else {
                prevR--;
                // Skip back over hyphen
                if (prevR >= 0 && grid[prevR][prevC] === '-') prevR--;
                
                if (prevR >= w.row) inputRefs.current[prevR][prevC]?.focus();
            }
        }
        checkCompletion(newInputs);
    }
  };

  // Phase 2 Logic
  const handlePhase2Select = (wordIndex: number, selectedWord: string) => {
    setPhase2Inputs(prev => ({...prev, [wordIndex]: selectedWord}));
  }

  const checkPhase2 = () => {
    const allCorrect = words.every((w, i) => phase2Inputs[i] === w.word);
    if (allCorrect) {
        playAudioBuffer(generateSpeech("Excellent work!", settings.voice).then(b => b!) as any); // hacky play
        onFinish();
    } else {
        alert("Algumas palavras estão incorretas. Tente novamente!");
    }
  }

  // --- RENDER ---

  if (phase === 'FILL_BLANKS') {
    return (
        <div className="max-w-4xl mx-auto w-full pb-12 animate-in fade-in slide-in-from-right duration-500">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4 text-green-600">
                    <CheckCircleIcon className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Cruzadinha Completa!</h2>
                <p className="text-slate-600">Agora, complete as frases usando as palavras que você encontrou.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    {words.map((w, idx) => {
                        const parts = w.phrase.english.split(new RegExp(`\\b${w.word}\\b`, 'i'));
                        return (
                            <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <p className="text-lg leading-relaxed font-medium text-slate-800">
                                    {parts[0]}
                                    <button 
                                      className={`inline-block min-w-[80px] border-b-2 px-2 mx-1 font-bold text-blue-600 ${phase2Inputs[idx] ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50'}`}
                                      onClick={() => handlePhase2Select(idx, '')}
                                    >
                                        {phase2Inputs[idx] || "______"}
                                    </button>
                                    {parts[1]}
                                </p>
                                <p className="text-sm text-slate-400 mt-2 italic">{w.phrase.portuguese}</p>
                            </div>
                        )
                    })}
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 h-fit sticky top-24">
                    <h3 className="font-bold text-slate-500 uppercase text-xs mb-4 tracking-wider">Palavras Encontradas</h3>
                    <div className="flex flex-wrap gap-2">
                        {words.map((w, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    // Find first empty slot or just fill next available? 
                                    const firstEmpty = words.findIndex((_, idx) => !phase2Inputs[idx]);
                                    if (firstEmpty !== -1) handlePhase2Select(firstEmpty, w.word);
                                }}
                                disabled={Object.values(phase2Inputs).includes(w.word)}
                                className="bg-white px-3 py-2 rounded-lg shadow-sm border border-slate-200 font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                {w.word}
                            </button>
                        ))}
                    </div>
                    <div className="mt-8 pt-6 border-t border-slate-200">
                        <button onClick={checkPhase2} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-colors">
                            Verificar Frases
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
  }

  // Phase 1: Crossword
  return (
    <div className="flex flex-col lg:flex-row h-full w-full gap-6">
        {/* Sidebar Word List - Fixed width on Desktop for better space management */}
        <div className="lg:w-72 flex-shrink-0 order-2 lg:order-1 h-full flex flex-col min-h-[200px]">
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex-1 flex flex-col overflow-hidden">
                <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <PuzzleIcon className="w-5 h-5 text-emerald-600" />
                    Palavras
                </h3>
                
                {/* Scrollable list */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-2 flex flex-col max-h-64 lg:max-h-full">
                    {words.map((w, i) => (
                        <div key={i} className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all text-center w-full ${
                            foundWordIndices.has(i) 
                            ? 'bg-green-50 border-green-200 text-green-700 line-through opacity-70' 
                            : 'bg-slate-50 border-slate-100 text-slate-600'
                        }`}>
                            {w.word}
                        </div>
                    ))}
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-800">
                    <p className="font-bold mb-1">Dica:</p>
                    <p>Toque nas células numeradas. As palavras encontradas serão riscadas.</p>
                </div>
             </div>
        </div>

        {/* Grid Area - Takes remaining space */}
        <div className="flex-1 order-1 lg:order-2 flex flex-col items-center justify-center min-h-0">
             <div className="bg-slate-800 p-2 md:p-6 rounded-xl shadow-2xl w-full max-w-lg lg:max-w-4xl aspect-square flex items-center justify-center overflow-hidden border-4 border-slate-700">
                 <div 
                   className="grid gap-1 w-full h-full"
                   style={{ 
                     gridTemplateColumns: `repeat(${grid.length}, 1fr)`,
                     gridTemplateRows: `repeat(${grid.length}, 1fr)` 
                   }}
                 >
                    {grid.map((row, r) => (
                        row.map((cell, c) => {
                            const wordStart = words.find(w => w.row === r && w.col === c);
                            // Is part of any word?
                            const isCellActive = words.some(w => {
                                if (w.direction === 'across') return r === w.row && c >= w.col && c < w.col + w.word.length;
                                return c === w.col && r >= w.row && r < w.row + w.word.length;
                            });

                            if (!isCellActive) {
                                return <div key={`${r}-${c}`} className="w-full h-full bg-transparent" />
                            }

                            // Hyphen special rendering
                            if (cell === '-') {
                                return (
                                    <div key={`${r}-${c}`} className="w-full h-full bg-slate-200 flex items-center justify-center rounded-sm">
                                        <span className="text-slate-400 font-bold text-lg md:text-2xl">-</span>
                                    </div>
                                )
                            }

                            // Is this cell part of the CURRENTLY SELECTED word?
                            const isActiveWordCell = activeWordIndex !== null && (() => {
                                const w = words[activeWordIndex];
                                if (w.direction === 'across') return r === w.row && c >= w.col && c < w.col + w.word.length;
                                return c === w.col && r >= w.row && r < w.row + w.word.length;
                            })();

                            return (
                                <div key={`${r}-${c}`} className="relative w-full h-full">
                                    {wordStart && (
                                        <span className="absolute top-0.5 left-0.5 text-[7px] sm:text-[10px] font-bold text-slate-500 z-10 pointer-events-none">
                                            {wordStart.number}
                                        </span>
                                    )}
                                    <input
                                        ref={el => {
                                            if (!inputRefs.current[r]) inputRefs.current[r] = [];
                                            inputRefs.current[r][c] = el;
                                        }}
                                        type="text"
                                        maxLength={1}
                                        value={userInputs[r][c]}
                                        onClick={() => handleCellClick(r, c)}
                                        onKeyDown={(e) => handleKeyDown(r, c, e)}
                                        onChange={(e) => handleInputChange(r, c, e.target.value)}
                                        className={`w-full h-full text-center font-bold text-xs sm:text-lg uppercase outline-none transition-colors rounded-sm
                                            ${isSolved ? 'bg-green-100 text-green-800' : 
                                              isActiveWordCell ? 'bg-amber-100 text-slate-900 border-2 border-amber-400' : 'bg-white text-slate-900'}
                                            focus:bg-amber-50
                                        `}
                                    />
                                </div>
                            )
                        })
                    ))}
                 </div>
             </div>
             
             {isSolved && (
                 <div className="mt-6 text-center animate-bounce">
                     <p className="text-green-600 font-bold text-lg">Cruzadinha Resolvida!</p>
                     <p className="text-slate-400 text-sm">Carregando próxima fase...</p>
                 </div>
             )}
        </div>
    </div>
  );
};

const PairsActivity = ({ phrases, settings, onFinish }: { phrases: Phrase[], settings: AppSettings, onFinish: () => void }) => {
  type CardItem = { id: string, text: string, type: 'EN'|'PT', phraseId: string, state: 'idle'|'selected'|'matched'|'error' };
  const [cards, setCards] = useState<CardItem[]>([]);
  const [selection, setSelection] = useState<CardItem[]>([]);
  const [completedPairs, setCompletedPairs] = useState(0);
  const [totalPairs, setTotalPairs] = useState(0);

  const startNewGame = () => {
    // REDUCE TO 4 PAIRS to allow larger cards (Total 8 cards)
    const shuffledPhrases = [...phrases].sort(() => 0.5 - Math.random()).slice(0, 4);
    setTotalPairs(shuffledPhrases.length);
    
    // NATIVE AUDIO: No need to preload via network!

    // 2. Generate cards
    const newCards: CardItem[] = [];
    shuffledPhrases.forEach(p => {
       newCards.push({ id: p.id + '-en', text: p.english, type: 'EN', phraseId: p.id, state: 'idle' });
       newCards.push({ id: p.id + '-pt', text: p.portuguese, type: 'PT', phraseId: p.id, state: 'idle' });
    });

    // 3. Shuffle cards
    setCards(newCards.sort(() => 0.5 - Math.random()));
    setCompletedPairs(0);
    setSelection([]);
  }

  useEffect(() => {
    startNewGame();
  }, [phrases]);

  const handleCardClick = (card: CardItem) => {
    if (card.state === 'matched' || card.state === 'selected' || selection.length >= 2) return;

    const newSelection = [...selection, card];
    setSelection(newSelection);
    
    // Update visual state to selected
    setCards(prev => prev.map(c => c.id === card.id ? { ...c, state: 'selected' } : c));

    if (newSelection.length === 2) {
      checkMatch(newSelection[0], newSelection[1]);
    } else {
        if (card.type === 'EN') {
            const cleanText = card.text.replace(/^R\.\s*/i, '').replace(/^V\.\s*/i, '');
            // USE NATIVE AUDIO for instant feedback in game
            playNativeSpeech(cleanText, settings.speed);
        }
    }
  };

  const checkMatch = (c1: CardItem, c2: CardItem) => {
    if (c1.phraseId === c2.phraseId) {
       // Match!
       setTimeout(() => {
         setCards(prev => prev.map(c => (c.id === c1.id || c.id === c2.id) ? { ...c, state: 'matched' } : c));
         setSelection([]);
         setCompletedPairs(prev => prev + 1);
         // Play audio of the English one
         const enCard = c1.type === 'EN' ? c1 : c2;
         const cleanText = enCard.text.replace(/^R\.\s*/i, '').replace(/^V\.\s*/i, '');
         playNativeSpeech(cleanText, settings.speed);
       }, 500);
    } else {
       // Mismatch
       setTimeout(() => {
         setCards(prev => prev.map(c => (c.id === c1.id || c.id === c2.id) ? { ...c, state: 'error' } : c));
       }, 200);

       setTimeout(() => {
          setCards(prev => prev.map(c => (c.id === c1.id || c.id === c2.id) ? { ...c, state: 'idle' } : c));
          setSelection([]);
       }, 1000);
    }
  }

  if (completedPairs === totalPairs && totalPairs > 0) {
      return (
          <div className="flex flex-col h-full items-center justify-center text-center animate-in zoom-in duration-500">
             <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircleIcon className="w-16 h-16 text-green-600" />
             </div>
             <h2 className="text-3xl font-bold text-slate-800 mb-2">Excelente!</h2>
             <p className="text-slate-600 mb-8">Você conectou todos os pares corretamente.</p>
             <div className="flex gap-4">
                 <button onClick={startNewGame} className="bg-amber-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-amber-600 transition-colors">
                    Jogar Novamente
                 </button>
                 <button onClick={onFinish} className="bg-slate-200 text-slate-700 px-8 py-3 rounded-xl font-bold hover:bg-slate-300 transition-colors">
                    Voltar ao Menu
                 </button>
             </div>
          </div>
      )
  }

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto w-full px-2 overflow-hidden">
       {/* Instruction message */}
       <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2 rounded-lg mb-4 text-center text-sm font-medium flex-shrink-0">
          Dica: Selecione primeiro a frase em Inglês, depois a tradução em Português.
       </div>

       <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-700 font-serif">Encontre os pares correspondentes</h2>
          <div className="flex items-center gap-3">
             <button onClick={startNewGame} className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-full transition-colors" title="Reiniciar Jogo">
                <RefreshIcon className="w-6 h-6" />
             </button>
             <span className="bg-slate-100 text-slate-700 px-4 py-1.5 rounded-full text-sm font-bold border border-slate-200">
               {completedPairs} / {totalPairs}
             </span>
          </div>
       </div>

       {/* NEW LAYOUT: Optimized for Visibility without Overflow
           Mobile: 2 cols, 160px min height. 
           Desktop: 4 cols, 220px min height. 
       */}
       <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 auto-rows-fr flex-1 overflow-y-auto pb-4">
          {cards.map(card => {
             let baseClass = "min-h-[160px] md:min-h-[220px] h-full rounded-2xl p-3 md:p-4 flex flex-col items-center justify-center text-center font-bold transition-all duration-300 border-b-8 cursor-pointer relative overflow-hidden active:translate-y-1 active:border-b-0 active:mt-2 ";
             
             if (card.state === 'idle') {
                 baseClass += "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm ";
             } else if (card.state === 'selected') {
                 baseClass += "bg-amber-50 border-amber-400 text-slate-900 shadow-md ring-4 ring-amber-200 transform -translate-y-1 ";
             } else if (card.state === 'matched') {
                 baseClass += "bg-green-100 border-green-300 text-green-700 opacity-0 pointer-events-none scale-90 "; 
             } else if (card.state === 'error') {
                 baseClass += "bg-red-50 border-red-400 text-red-800 animate-shake ";
             }
             
             // Clean R. prefix for display
             const cleanText = card.text.replace(/^R\.\s*/i, '').replace(/^V\.\s*/i, '');
             
             // Adaptive Typography
             let textSize = 'text-xl md:text-3xl leading-snug';
             if (cleanText.length > 80) {
                textSize = 'text-xs md:text-base leading-normal';
             } else if (cleanText.length > 40) {
                textSize = 'text-sm md:text-xl leading-normal';
             }

             return (
                 <button 
                   key={card.id}
                   onClick={() => handleCardClick(card)}
                   className={`${baseClass} ${textSize} w-full`}
                 >
                    {card.type === 'EN' && <span className="absolute top-2 md:top-3 text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded">Inglês</span>}
                    {card.type === 'PT' && <span className="absolute top-2 md:top-3 text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded">Português</span>}
                    
                    {/* Inner wrapper to handle text wrapping strictly */}
                    <span className="mt-4 block w-full break-words whitespace-normal px-1 font-serif max-h-full overflow-y-auto">
                        {cleanText}
                    </span>
                 </button>
             )
          })}
       </div>
    </div>
  );
}

const ClozeActivity = ({ phrases, settings, onFinish }: { phrases: Phrase[], settings: AppSettings, onFinish: () => void }) => {
  const [workingPhrases, setWorkingPhrases] = useState<Phrase[]>([]);
  const [index, setIndex] = useState(0);
  const [question, setQuestion] = useState<{phrase: Phrase, hiddenWord: string, options: string[], parts: string[] } | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'CORRECT' | 'WRONG'>('IDLE');

  useEffect(() => {
    // Shuffle phrases on mount
    setWorkingPhrases([...phrases].sort(() => Math.random() - 0.5));
  }, [phrases]);

  useEffect(() => {
    if (workingPhrases.length > 0) {
        generateQuestion();
        // Preload current audio
        if (workingPhrases[index]) {
            // Play Native audio for the first one for instant speed
            if (index === 0) playAudio();
            // Preload next
            if (workingPhrases[index + 1]) generateSpeech(workingPhrases[index + 1].english, settings.voice);
        }
    }
  }, [index, workingPhrases]); // Re-run when index changes or working list is ready

  const generateQuestion = () => {
    const current = workingPhrases[index];
    const words = current.english.split(' ');
    // Try to find a word > 3 chars, ideally in middle
    const candidates = words.filter(w => w.length > 3 && !w.includes('.') && !w.includes(','));
    const target = candidates.length > 0 
      ? candidates[Math.floor(Math.random() * candidates.length)] 
      : words[Math.floor(Math.random() * words.length)];
    
    // Create parts
    const parts = current.english.split(target);
    
    // Generate options: Target + 2 randoms from OTHER phrases (use original full list for variety)
    const otherWords = phrases
      .filter(p => p.id !== current.id)
      .map(p => p.english.split(' '))
      .flat()
      .filter(w => w.length > 3 && w !== target);
      
    // Replaced "Hello"/"World" fallback with context-appropriate fallbacks
    const distractor1 = otherWords[Math.floor(Math.random() * otherWords.length)] || "Hope";
    const distractor2 = otherWords[Math.floor(Math.random() * otherWords.length)] || "Faith";
    
    // Ensure we have a proportional grid amount (3 options)
    const opts = [target, distractor1, distractor2].sort(() => 0.5 - Math.random());
    
    setQuestion({
      phrase: current,
      hiddenWord: target,
      options: opts,
      parts: parts
    });
    setSelectedOption(null);
    setStatus('IDLE');
  };

  const handleSelect = (opt: string) => {
    if (status !== 'IDLE') return;
    setSelectedOption(opt);
    
    if (opt === question?.hiddenWord) {
      setStatus('CORRECT');
      playAudio();
    } else {
      setStatus('WRONG');
    }
  };

  const playAudio = async () => {
    if (!workingPhrases[index]) return;
    // USE NATIVE AUDIO FOR FIRST ITEM (Latency optimization)
    if (index === 0) {
        playNativeSpeech(workingPhrases[index].english, settings.speed);
        return;
    }

    const buffer = await generateSpeech(workingPhrases[index].english, settings.voice);
    if (buffer) playAudioBuffer(buffer, settings.speed);
  }

  const next = () => {
    stopAudio(); // Stop any pending or playing audio immediately
    if (index < workingPhrases.length - 1) setIndex(index + 1);
    else onFinish();
  };

  if (!question || workingPhrases.length === 0) return <div>Carregando...</div>;

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
      <ProgressBar current={index} total={workingPhrases.length} />
      
      {/* Top Section: Question Card - Takes available space */}
      <div className="flex-1 flex flex-col justify-center py-2 min-h-0">
        <div className="bg-white rounded-2xl p-4 md:p-8 shadow-xl border-t-4 border-rose-400 text-center relative overflow-hidden flex flex-col justify-between h-full max-h-[500px]">
           {/* Header */}
           <div className="flex justify-between items-center mb-4 flex-shrink-0">
               <h3 className="text-xs md:text-sm uppercase font-bold text-slate-400 tracking-wider">Complete a frase</h3>
               <button onClick={playAudio} className="p-2 md:p-3 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                   <EarIcon className="w-5 h-5 md:w-6 md:h-6" />
               </button>
           </div>
           
           {/* Sentence Content - Flexible center - WITH SCROLL if needed */}
           <div className="flex-1 flex items-center justify-center overflow-y-auto custom-scrollbar">
             <div className="text-xl md:text-3xl lg:text-4xl font-serif font-medium text-slate-800 leading-relaxed py-2">
               {question.parts[0]}
               {/* Proportional Interactive Slot */}
               <span className={`inline-flex items-center justify-center min-w-[100px] md:min-w-[140px] px-2 md:px-4 mx-2 py-1 md:py-2 rounded-lg font-bold align-middle transition-all duration-300 border-2 ${
                 status === 'CORRECT' ? 'bg-green-500 text-white border-green-500 shadow-md transform scale-105' : 
                 status === 'WRONG' && selectedOption ? 'bg-red-500 text-white border-red-500 shadow-md' : 
                 selectedOption ? 'bg-rose-500 text-white border-rose-500 shadow-md' : 'border-dashed border-slate-300 bg-slate-50 text-transparent'
               }`}>
                 {selectedOption || "______"}
               </span>
               {question.parts.slice(1).join(question.hiddenWord)}
             </div>
           </div>
           
           {/* Translation Footer */}
           <div className="border-t border-slate-100 pt-4 mt-4 flex-shrink-0">
              <p className="text-slate-500 text-sm md:text-lg italic flex items-center justify-center gap-2">
                 <span className="text-xs bg-slate-100 px-2 py-1 rounded font-bold text-slate-400 not-italic">PT</span>
                 {question.phrase.portuguese}
              </p>
           </div>
        </div>
      </div>

      {/* Bottom Section: Proportional Option Grid */}
      <div className="mt-6 mb-4 flex-shrink-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
           {question.options.map((opt, i) => (
             <button
               key={i}
               onClick={() => handleSelect(opt)}
               // Fixed min-height ensures proportional look even with different word lengths
               className={`w-full min-h-[60px] md:min-h-[80px] px-4 rounded-xl font-bold text-lg md:text-2xl shadow-sm transition-all duration-200 transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center ${
                  status !== 'IDLE' && opt === question.hiddenWord ? 'bg-green-500 text-white ring-4 ring-green-200' :
                  status === 'WRONG' && opt === selectedOption ? 'bg-red-500 text-white ring-4 ring-red-200' :
                  'bg-white border-2 border-slate-200 hover:border-rose-300 text-slate-700 hover:text-rose-600'
               }`}
             >
               {opt}
             </button>
           ))}
        </div>
      </div>

      {/* Next Button Area (Conditional) */}
      <div className="h-16 md:h-20 flex items-end flex-shrink-0">
        {status !== 'IDLE' && (
           <button onClick={next} 
             className={`w-full py-3 md:py-4 rounded-xl font-bold text-lg shadow-xl transition-colors flex items-center justify-center gap-2 animate-in slide-in-from-bottom-4 ${
                status === 'CORRECT' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-slate-800 text-white hover:bg-slate-900'
             }`}
           >
              {status === 'CORRECT' ? (
                  <>Continuar <CheckCircleIcon className="w-6 h-6" /></>
              ) : (
                  <>Próximo <RefreshIcon className="w-6 h-6" /></>
              )}
           </button>
        )}
      </div>
    </div>
  );
};

const PuzzleActivity = ({ phrases, settings, onFinish }: { phrases: Phrase[], settings: AppSettings, onFinish: () => void }) => {
  const [workingPhrases, setWorkingPhrases] = useState<Phrase[]>([]);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0); // For green filling animation
  const [shuffledWords, setShuffledWords] = useState<{id: number, text: string}[]>([]);
  const [selectedWords, setSelectedWords] = useState<{id: number, text: string}[]>([]);
  const [status, setStatus] = useState<'IDLE' | 'CORRECT' | 'WRONG'>('IDLE');
  const [showHint, setShowHint] = useState(false);
  const [targetString, setTargetString] = useState('');

  useEffect(() => {
    setWorkingPhrases([...phrases].sort(() => Math.random() - 0.5));
  }, [phrases]);

  const currentPhrase = workingPhrases[index];

  // Helper to tokenise and shuffle
  const initializePuzzle = () => {
    if (!currentPhrase) return;
    // Advanced tokenizer: splits by words BUT keeps punctuation separate
    // Matches word characters OR punctuation marks
    const rawTokens = currentPhrase.english.match(/[\w']+|[.,!?;:]/g) || [];
    
    // Store logic for reconstructing string for comparison
    const reconstruct = (tokens: string[]) => {
        let res = "";
        tokens.forEach((t, i) => {
            const isPunct = /^[.,!?;:]$/.test(t);
            if (i === 0) res += t;
            else if (isPunct) res += t; // No space before punctuation
            else res += " " + t; // Space before word
        });
        return res;
    };
    
    setTargetString(reconstruct(rawTokens));

    const words = rawTokens.map((w, i) => ({ id: i, text: w }));
    // Fisher-Yates shuffle
    for (let i = words.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [words[i], words[j]] = [words[j], words[i]];
    }
    setShuffledWords(words);
    setSelectedWords([]);
    setStatus('IDLE');
    setShowHint(false);
    setLoadProgress(0); // Reset loading visual
  };

  useEffect(() => {
    if (workingPhrases.length > 0) {
        initializePuzzle();
        playAudio();
        // Preload next
        if (index + 1 < workingPhrases.length) generateSpeech(workingPhrases[index + 1].english, settings.voice);
    }
  }, [index, workingPhrases, settings.voice]); // Re-run if voice changes

  const playAudio = async () => {
    if (isPlaying || !currentPhrase) return;
    setIsPlaying(true);
    setLoadProgress(5); // Start visual

    // USE NATIVE AUDIO FOR FIRST ITEM (Latency optimization)
    if (index === 0) {
        setLoadProgress(100);
        playNativeSpeech(currentPhrase.english, settings.speed);
        setTimeout(() => {
            setIsPlaying(false);
            setLoadProgress(0);
        }, 2000); // Mock duration for UI reset
        return;
    }

    // Simulate loading progress for better UX
    const progressInterval = setInterval(() => {
        setLoadProgress(prev => {
            if (prev >= 90) return prev; // Stall at 90%
            return prev + 2;
        });
    }, 50);

    try {
        const buffer = await generateSpeech(currentPhrase.english, settings.voice);
        clearInterval(progressInterval);
        setLoadProgress(100); // Complete
        
        if (buffer) {
             playAudioBuffer(buffer, settings.speed);
             // Reset after playback roughly ends + buffer
             setTimeout(() => {
                 setIsPlaying(false);
                 setLoadProgress(0);
             }, (buffer.duration * 1000) / settings.speed);
        } else {
             setIsPlaying(false);
             setLoadProgress(0);
        }
    } catch (e) {
        clearInterval(progressInterval);
        setIsPlaying(false);
        setLoadProgress(0);
    }
  };

  const handleWordSelect = (word: {id: number, text: string}) => {
    if (status === 'CORRECT') return;
    setShuffledWords(prev => prev.filter(w => w.id !== word.id));
    setSelectedWords(prev => [...prev, word]);
    setStatus('IDLE');
  };

  const handleWordDeselect = (word: {id: number, text: string}) => {
    if (status === 'CORRECT') return;
    setSelectedWords(prev => prev.filter(w => w.id !== word.id));
    setShuffledWords(prev => [...prev, word]);
    setStatus('IDLE');
  };

  const checkAnswer = () => {
    // Reconstruct user selection using the same logic as target string
    let constructed = "";
    selectedWords.forEach((w, i) => {
      const isPunct = /^[.,!?;:]$/.test(w.text);
      if (i === 0) constructed += w.text;
      else if (isPunct) constructed += w.text;
      else constructed += " " + w.text;
    });

    if (constructed === targetString) {
      setStatus('CORRECT');
      playSuccessSound();
    } else {
      setStatus('WRONG');
    }
  };

  const playSuccessSound = () => {
    // Simple Web Audio Beep
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.1); // C6
        
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
    } catch(e) {
        console.log("Audio play error", e);
    }
  };

  const next = () => {
    stopAudio(); // Stop any pending or playing audio immediately
    if (index < workingPhrases.length - 1) setIndex(index + 1);
    else onFinish();
  };

  if (!currentPhrase) return <div>Carregando...</div>;

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full px-4 overflow-y-auto">
      <ProgressBar current={index} total={workingPhrases.length} />

      {/* Audio Control with Loading Animation */}
      <div className="flex flex-col items-center justify-center mb-6 md:mb-8 relative flex-shrink-0">
        <button 
          onClick={playAudio}
          className="w-20 h-20 md:w-24 md:h-24 rounded-full text-white flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95 border-4 border-slate-100 overflow-hidden relative"
          style={{
              background: `linear-gradient(to top, #16a34a ${loadProgress}%, #0f172a ${loadProgress}%)`
          }}
        >
           {/* Icon on top */}
           <div className="relative z-10">
               <EarIcon className="w-10 h-10 md:w-12 md:h-12" />
           </div>
        </button>
        <span className="mt-3 text-slate-500 font-medium font-serif italic text-sm md:text-base">Toque para ouvir a frase</span>
      </div>

      {/* Answer Area - Spacious drop zone */}
      <div className={`min-h-[160px] md:min-h-[280px] bg-white rounded-2xl p-4 md:p-8 mb-6 md:mb-10 flex flex-wrap content-start items-start gap-2 md:gap-3 border-2 transition-all shadow-inner flex-shrink-0 ${status === 'CORRECT' ? 'border-green-400 bg-green-50/50' : status === 'WRONG' ? 'border-red-300 bg-red-50/50' : 'border-slate-200'}`}>
         {selectedWords.length === 0 && (
            <div className="w-full h-full flex items-center justify-center text-slate-400 italic text-base md:text-lg font-serif">
                Toque nas palavras abaixo para organizar...
            </div>
         )}
         {selectedWords.map(word => (
           <button 
             key={word.id} 
             onClick={() => handleWordDeselect(word)}
             className="bg-slate-50 px-4 py-2 md:px-6 md:py-4 rounded-xl shadow-sm text-slate-900 font-serif font-bold text-base md:text-2xl hover:bg-red-50 border border-slate-300 animate-in zoom-in duration-200 hover:border-red-200 hover:text-red-600 transition-colors"
           >
             {word.text}
           </button>
         ))}
      </div>

      {/* Word Pool */}
      <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-8 md:mb-12">
        {shuffledWords.map(word => (
           <button 
             key={word.id} 
             onClick={() => handleWordSelect(word)}
             className="bg-white px-4 py-2 md:px-6 md:py-4 rounded-xl shadow-md text-slate-800 font-serif font-bold text-base md:text-2xl hover:bg-slate-800 hover:text-white border border-slate-200 transition-all hover:-translate-y-1 active:translate-y-0"
           >
             {word.text}
           </button>
        ))}
      </div>

      {/* Controls */}
      <div className="mt-auto space-y-4 pb-4">
         {showHint && (
           <div className="p-4 bg-amber-50 text-amber-900 rounded-xl text-center text-sm md:text-base border border-amber-200 animate-in fade-in slide-in-from-bottom-2 font-serif italic">
             {currentPhrase.portuguese}
           </div>
         )}

         {status === 'IDLE' ? (
           <div className="flex gap-4">
             <button onClick={() => setShowHint(prev => !prev)} className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-4 rounded-xl hover:bg-slate-50 text-lg">
               {showHint ? 'Esconder' : 'Dica'}
             </button>
             <button onClick={checkAnswer} className="flex-[2] bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-slate-800 text-lg">
               Verificar
             </button>
           </div>
         ) : (
           <button onClick={status === 'CORRECT' ? next : () => { setStatus('IDLE'); initializePuzzle(); }} className={`w-full font-bold py-4 rounded-xl shadow-lg text-white text-lg ${status === 'CORRECT' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}>
             {status === 'CORRECT' ? 'Continuar' : 'Tentar Novamente'}
           </button>
         )}
      </div>
    </div>
  );
};

const FlashcardActivity = ({ phrases, settings, onFinish }: { phrases: Phrase[], settings: AppSettings, onFinish: () => void }) => {
    const [workingPhrases, setWorkingPhrases] = useState<Phrase[]>([]);
    const [index, setIndex] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [loadProgress, setLoadProgress] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        setWorkingPhrases([...phrases].sort(() => Math.random() - 0.5));
    }, [phrases]);
    
    // Preload next audio
    useEffect(() => {
      if (workingPhrases.length > 0 && index + 1 < workingPhrases.length) {
        generateSpeech(workingPhrases[index + 1].english, settings.voice);
      }
    }, [index, workingPhrases, settings.voice]);
  
    const next = () => {
      stopAudio(); // Stop audio immediately
      setFlipped(false);
      setLoadProgress(0);
      if (index < workingPhrases.length - 1) {
        setTimeout(() => setIndex(index + 1), 300);
      } else {
        onFinish();
      }
    };
  
    const playAudio = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isPlaying || !workingPhrases[index]) return;
      setIsPlaying(true);
      setLoadProgress(5);
      
      // USE NATIVE AUDIO FOR FIRST ITEM (Latency optimization)
      if (index === 0) {
        setLoadProgress(100);
        playNativeSpeech(workingPhrases[index].english, settings.speed);
        setTimeout(() => {
            setIsPlaying(false);
            setLoadProgress(0);
        }, 2000);
        return;
      }

      const progressInterval = setInterval(() => {
           setLoadProgress(prev => {
               if (prev >= 90) return prev; 
               return prev + 2;
           });
       }, 50);

      try {
          const buffer = await generateSpeech(workingPhrases[index].english, settings.voice);
          clearInterval(progressInterval);
          setLoadProgress(100);
          if (buffer) {
              playAudioBuffer(buffer, settings.speed);
              setTimeout(() => {
                  setIsPlaying(false);
                  setLoadProgress(0);
              }, (buffer.duration * 1000) / settings.speed);
          } else {
              setIsPlaying(false);
              setLoadProgress(0);
          }
      } catch (e) {
          clearInterval(progressInterval);
          setIsPlaying(false);
          setLoadProgress(0);
      }
    };

    if (workingPhrases.length === 0) return <div>Carregando...</div>;
  
    return (
      <div className="flex flex-col h-full items-center justify-center max-w-4xl mx-auto w-full">
        <ProgressBar current={index} total={workingPhrases.length} />
        
        {/* Responsive Large Card */}
        <div className="w-full h-[60vh] min-h-[400px] max-h-[600px] relative card-flip cursor-pointer group" onClick={() => setFlipped(!flipped)}>
          <div className={`card-inner w-full h-full absolute transition-transform duration-500 transform-style-3d ${flipped ? 'rotate-y-180' : ''}`} style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : '' }}>
            
            {/* Front (Portuguese - Question) */}
            <div className="card-front absolute w-full h-full bg-white rounded-3xl shadow-xl border-t-8 border-slate-900 flex flex-col items-center justify-center p-8 md:p-12 backface-hidden" style={{ backfaceVisibility: 'hidden' }}>
              <span className="text-sm uppercase font-bold text-slate-400 mb-8 tracking-widest">Traduza para o Inglês</span>
              <p className="text-3xl md:text-5xl lg:text-6xl text-center font-serif font-bold text-slate-900 leading-tight max-h-[60%] overflow-y-auto custom-scrollbar px-2">
                {workingPhrases[index].portuguese}
              </p>
              <p className="mt-8 text-base md:text-xl text-slate-500 text-center italic">{workingPhrases[index].context}</p>
              <div className="mt-auto text-base text-amber-600 font-semibold animate-pulse pb-4">Toque para ver a resposta</div>
            </div>
  
            {/* Back (English - Answer) */}
            <div className="card-back absolute w-full h-full bg-slate-900 rounded-3xl shadow-xl text-white flex flex-col items-center justify-center p-8 md:p-12 backface-hidden" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
               <button 
                  onClick={playAudio}
                  className="mb-8 w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center hover:bg-white/20 backdrop-blur-sm transition-all shadow-lg scale-110 relative overflow-hidden"
                  style={{
                      background: `linear-gradient(to top, #16a34a ${loadProgress}%, rgba(255,255,255,0.1) ${loadProgress}%)`
                  }}
               >
                  <div className="relative z-10">
                    <EarIcon className="w-8 h-8 md:w-10 md:h-10 text-amber-400" />
                  </div>
               </button>
               <p className="text-3xl md:text-5xl lg:text-6xl text-center font-serif font-bold leading-tight mb-4 max-h-[50%] overflow-y-auto custom-scrollbar px-2">
                 {workingPhrases[index].english}
               </p>
               <span className="text-sm uppercase font-bold text-slate-500 mt-6 tracking-widest">Inglês</span>
            </div>
          </div>
        </div>
  
        <div className="mt-6 md:mt-10 flex gap-4 w-full">
           <button onClick={next} className="flex-1 bg-white border-2 border-slate-200 text-slate-700 py-4 md:py-5 rounded-xl font-bold text-base md:text-lg hover:bg-slate-50 transition-colors">
              Ainda estou aprendendo
           </button>
           <button onClick={next} className="flex-1 bg-emerald-600 text-white py-4 md:py-5 rounded-xl font-bold text-base md:text-lg shadow-lg hover:bg-emerald-700 transition-colors">
              Já sei essa!
           </button>
        </div>
      </div>
    );
};

const ListeningActivity = ({ phrases, settings, onFinish }: { phrases: Phrase[], settings: AppSettings, onFinish: () => void }) => {
    const [workingPhrases, setWorkingPhrases] = useState<Phrase[]>([]);
    const [index, setIndex] = useState(0);
    const [options, setOptions] = useState<Phrase[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'CORRECT' | 'WRONG'>('IDLE');
    const [loadProgress, setLoadProgress] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        setWorkingPhrases([...phrases].sort(() => Math.random() - 0.5));
    }, [phrases]);
  
    useEffect(() => {
      if (workingPhrases.length > 0) {
        // Create options: correct answer + 2 random distractors from original list
        const correct = workingPhrases[index];
        const distractors = phrases
            .filter(p => p.id !== correct.id)
            .sort(() => 0.5 - Math.random())
            .slice(0, 2);
        
        const shuffled = [correct, ...distractors].sort(() => 0.5 - Math.random());
        setOptions(shuffled);
        setSelected(null);
        setStatus('IDLE');
        setLoadProgress(0);
    
        // Play audio automatically
        playAudio();
      }
    }, [index, workingPhrases, settings.voice]); // Re-run if voice changes
  
    const handleSelect = (optionId: string) => {
      if (status !== 'IDLE') return;
      setSelected(optionId);
      
      if (optionId === workingPhrases[index].id) {
        setStatus('CORRECT');
      } else {
        setStatus('WRONG');
      }
    };
  
    const playAudio = async () => {
       if (isPlaying || !workingPhrases[index]) return;
       setIsPlaying(true);
       setLoadProgress(5);

       // USE NATIVE AUDIO FOR FIRST ITEM (Latency optimization)
       if (index === 0) {
            setLoadProgress(100);
            playNativeSpeech(workingPhrases[index].english, settings.speed);
            setTimeout(() => {
                setIsPlaying(false);
                setLoadProgress(0);
            }, 2000);
            return;
       }

       const progressInterval = setInterval(() => {
           setLoadProgress(prev => {
               if (prev >= 90) return prev; 
               return prev + 2;
           });
       }, 50);

       try {
           const buffer = await generateSpeech(workingPhrases[index].english, settings.voice);
           clearInterval(progressInterval);
           setLoadProgress(100);

           if (buffer) {
               playAudioBuffer(buffer, settings.speed);
               setTimeout(() => {
                   setIsPlaying(false);
                   setLoadProgress(0);
               }, (buffer.duration * 1000) / settings.speed);
           } else {
               setIsPlaying(false);
               setLoadProgress(0);
           }
       } catch(e) {
           clearInterval(progressInterval);
           setIsPlaying(false);
           setLoadProgress(0);
       }
    };
  
    const next = () => {
      stopAudio(); // Stop audio immediately
      if (index < workingPhrases.length - 1) setIndex(index + 1);
      else onFinish();
    };

    if (workingPhrases.length === 0) return <div>Carregando...</div>;
  
    return (
      <div className="flex flex-col h-full max-w-xl mx-auto w-full">
         <ProgressBar current={index} total={workingPhrases.length} />
  
         <div className="flex-1 flex flex-col justify-center items-center py-4 md:py-8">
            <button 
              onClick={playAudio}
              className="w-24 h-24 md:w-32 md:h-32 rounded-full text-white flex items-center justify-center shadow-xl transition-transform hover:scale-105 active:scale-95 mb-8 border-4 border-white overflow-hidden relative"
              style={{
                  background: `linear-gradient(to top, #0284c7 ${loadProgress}%, #0369a1 ${loadProgress}%)` // Sky colors for this mode
              }}
            >
               <div className="relative z-10">
                   <EarIcon className="w-12 h-12 md:w-16 md:h-16" />
               </div>
            </button>
            <p className="text-slate-500 mb-8 font-serif italic text-sm md:text-base">Toque para ouvir a frase novamente</p>
         
            <div className="w-full space-y-3 md:space-y-4">
              {options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  className={`w-full p-4 md:p-5 text-left rounded-xl border-2 transition-all ${
                    status !== 'IDLE' && opt.id === workingPhrases[index].id ? 'bg-green-100 border-green-500 text-green-800' :
                    status === 'WRONG' && opt.id === selected ? 'bg-red-100 border-red-500 text-red-800' :
                    'bg-white border-slate-200 hover:border-sky-400 text-slate-700'
                  }`}
                >
                   <span className="font-serif font-bold text-base md:text-lg block">{opt.portuguese}</span>
                </button>
              ))}
            </div>
         </div>
  
         {status !== 'IDLE' && (
           <button onClick={next} className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-slate-900 transition-colors mt-4">
              {status === 'CORRECT' ? 'Próximo' : 'Próximo'}
           </button>
         )}
      </div>
    );
};
  
const SpeakingActivity = ({ phrases, settings, onFinish }: { phrases: Phrase[], settings: AppSettings, onFinish: () => void }) => {
    const [workingPhrases, setWorkingPhrases] = useState<Phrase[]>([]);
    const [index, setIndex] = useState(0);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [feedback, setFeedback] = useState<'IDLE' | 'CORRECT' | 'TRY_AGAIN'>('IDLE');

    useEffect(() => {
        setWorkingPhrases([...phrases].sort(() => Math.random() - 0.5));
    }, [phrases]);
  
    useEffect(() => {
        if (workingPhrases.length > 0) {
            setTranscript('');
            setFeedback('IDLE');
            // Preload audio
            generateSpeech(workingPhrases[index].english, settings.voice);
        }
    }, [index, workingPhrases, settings.voice]);

    const playTargetAudio = async () => {
        if (!workingPhrases[index]) return;
        // USE NATIVE AUDIO FOR FIRST ITEM (Latency optimization)
        if (index === 0) {
            playNativeSpeech(workingPhrases[index].english, settings.speed);
            return;
        }

        const buffer = await generateSpeech(workingPhrases[index].english, settings.voice);
        if (buffer) playAudioBuffer(buffer, settings.speed);
    }
  
    const startListening = () => {
      if (!('webkitSpeechRecognition' in window)) {
        alert("Navegador não suporta reconhecimento de fala.");
        return;
      }
      
      const recognition = new window.webkitSpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;
  
      recognition.onstart = () => setIsListening(true);
      
      recognition.onresult = (event: any) => {
        const spoken = event.results[0][0].transcript;
        setTranscript(spoken);
        
        // Simple comparison (case insensitive, remove punctuation)
        const target = workingPhrases[index].english.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").toLowerCase();
        const input = spoken.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").toLowerCase();
        
        // Allow some fuzzy matching (contains)
        if (input === target || target.includes(input) || input.includes(target)) {
          setFeedback('CORRECT');
        } else {
          setFeedback('TRY_AGAIN');
        }
        setIsListening(false);
      };
  
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
  
      recognition.start();
    };
  
    const next = () => {
      stopAudio(); // Stop audio immediately
      if (index < workingPhrases.length - 1) setIndex(index + 1);
      else onFinish();
    };

    if (workingPhrases.length === 0) return <div>Carregando...</div>;
  
    return (
      <div className="flex flex-col h-full max-w-xl mx-auto w-full">
        <ProgressBar current={index} total={workingPhrases.length} />
  
        <div className="flex-1 flex flex-col items-center justify-center py-4 md:py-8">
           <div className="text-center mb-10 w-full">
              <button onClick={playTargetAudio} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 font-bold text-sm mb-4 transition-colors">
                  <EarIcon className="w-4 h-4" /> Ouvir Pronúncia
              </button>
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-800 mb-2">{workingPhrases[index].english}</h2>
              <p className="text-slate-500 text-base md:text-lg italic">{workingPhrases[index].portuguese}</p>
           </div>
  
           <button 
             onClick={startListening}
             disabled={isListening}
             className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center shadow-xl transition-all ${
               isListening ? 'bg-red-500 scale-110 animate-pulse' : 'bg-fuchsia-900 hover:bg-fuchsia-800 hover:scale-105 border-4 border-white'
             }`}
           >
             <MicIcon className="w-8 h-8 md:w-10 md:h-10 text-white" />
           </button>
           <p className="mt-4 text-xs md:text-sm font-bold text-slate-400 uppercase tracking-widest">
             {isListening ? 'Ouvindo...' : 'Toque para Falar'}
           </p>
  
           {transcript && (
             <div className={`mt-8 p-4 rounded-xl text-center w-full ${
                feedback === 'CORRECT' ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'
             }`}>
                <p className="text-sm text-slate-500 mb-1">Você disse:</p>
                <p className={`font-bold text-base md:text-lg ${feedback === 'CORRECT' ? 'text-green-700' : 'text-orange-700'}`}>"{transcript}"</p>
             </div>
           )}
        </div>
  
        {feedback === 'CORRECT' && (
           <button onClick={next} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-green-700 transition-colors">
              Excelente! Próximo
           </button>
        )}
      </div>
    );
};
