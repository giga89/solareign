"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useState, useEffect } from "react";
import { 
  CopyPlus, ArrowRight, ShieldHalf, Flame, Swords, Map, Star, Zap, 
  Heart, Trophy, Coins, UserPlus, ShieldAlert, Target, Info, Medal,
  BatteryCharging, BrainCircuit, History, Activity
} from "lucide-react";

// --- Types & Constants ---

type BodyPart = "Head" | "Shoulders" | "Torso" | "Arms" | "Legs";
type Path = "Light" | "Dark";

interface HeroStats {
  strength: number;
  skill: number;
  agility: number;
  constitution: number;
  luck: number;
}

interface Hero {
  name: string;
  path: Path;
  archetype: string;
  level: number;
  xp: number;
  aurum: number;
  energy: number;
  maxEnergy: number;
  stats: HeroStats;
  points: number;
  image: string;
  attackPattern: BodyPart[];
  defensePattern: BodyPart[];
}

interface Enemy {
  name: string;
  image: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  agilityBias: number;
  attackPattern: BodyPart[];
  defensePattern: BodyPart[];
}

interface CombatStats {
  damageDealt: number;
  damageTaken: number;
  blocks: number;
  misses: number;
  rounds: number;
}

interface CombatLogEntry {
  round: number;
  text: string;
  heroDmg: number;
  enemyDmg: number;
  type: "hit" | "miss" | "block";
}

interface CombatState {
  enemy: Enemy;
  heroHp: number;
  heroMaxHp: number;
  currentRound: number;
  logs: CombatLogEntry[];
  status: "running" | "finished";
  winner: "hero" | "enemy" | null;
  stats: CombatStats;
}

function TutorialOverlay({ step, onNext, hero }: any) {
    const steps = [
        {
            title: "Welcome, Seeker",
            desc: "You have entered the realm of Solareign. To begin your journey, you must first manifest a Hero.",
            target: "mint-button"
        },
        {
            title: "The 5 Stats",
            desc: "Strength, Skill, Agility, Constitution, and Luck. Each Hero has a bias based on their Archetype. Upgrade them using Aurum!",
            target: "stats-view"
        },
        {
            title: "Tactical Combat",
            desc: "This isn't button-mashing. You must pre-configure 5 rounds of Attack and Defense zones. Strategy beats raw power.",
            target: "tactics-tab"
        },
        {
            title: "The Energy Cycle",
            desc: "PvE missions cost 20 Energy. It regenerates slowly (1 per min). Choose your battles wisely.",
            target: "pve-tab"
        },
        {
            title: "Ready for Battle",
            desc: "Go to the Quests tab and face your first monster. May the Light (or shadows) guide you!",
            target: "start-game"
        }
    ];

    if (step <= 0 || step > steps.length || (step === 1 && !hero)) return null;
    const current = steps[step - 1];

    // Auto-advance some steps or hide based on context if needed
    if (step === 1 && hero) {
        // Already minted, move to stats
        setTimeout(onNext, 100);
        return null;
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-end justify-center pointer-events-none p-6 pb-28">
            <div className="w-full bg-slate-900 border border-amber-500/50 rounded-2xl p-6 shadow-[0_0_50px_rgba(245,158,11,0.2)] pointer-events-auto animate-in fade-in slide-in-from-bottom-5 duration-500">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-amber-500 font-black uppercase tracking-tighter text-sm flex items-center">
                        <Info className="w-4 h-4 mr-2" />
                        Tutorial: {current.title}
                    </h3>
                    <span className="text-[10px] font-bold text-slate-500">{step}/{steps.length}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-bold">{current.desc}</p>
                <button 
                    onClick={onNext}
                    className="mt-4 w-full bg-amber-500 text-black font-black uppercase py-3 rounded-lg text-xs hover:bg-amber-400 transition-colors flex items-center justify-center"
                >
                    {step === steps.length ? "Let's Go!" : "Understood"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                </button>
            </div>
        </div>
    );
}

const BODY_PARTS: BodyPart[] = ["Head", "Shoulders", "Torso", "Arms", "Legs"];

const PART_META: Record<BodyPart, { damage: string; hit: string; mult: number; chance: number }> = {
  "Head":      { damage: "CRITICAL (2.5x)", hit: "LOW (25%)", mult: 2.5, chance: 0.25 },
  "Shoulders": { damage: "HIGH (1.5x)",     hit: "MODERATE (50%)", mult: 1.5, chance: 0.5 },
  "Torso":     { damage: "STABLE (1.0x)",   hit: "EXCELLENT (80%)", mult: 1.0, chance: 0.8 },
  "Arms":      { damage: "MODERATE (1.2x)", hit: "GOOD (65%)", mult: 1.2, chance: 0.65 },
  "Legs":      { damage: "LOW (0.8x)",      hit: "PERFECT (90%)", mult: 0.8, chance: 0.9 },
};

const ARCHETYPES = {
  Light: [
    { name: "Paladin", bias: "strength", img: "light1" },
    { name: "Seraph", bias: "skill", img: "light2" },
    { name: "Valkyrie", bias: "agility", img: "light3" },
    { name: "Aegis", bias: "constitution", img: "light4" }
  ],
  Dark: [
    { name: "Shade", bias: "agility", img: "dark1" },
    { name: "Necrolord", bias: "luck", img: "dark2" },
    { name: "Abyss Lord", bias: "strength", img: "dark3" },
    { name: "Dreadweaver", bias: "skill", img: "dark4" }
  ]
};

const MOCK_LEADERBOARD = [
  { name: "SolanaWhale", level: 12, path: "Light", archetype: "Paladin" },
  { name: "DegenNinja", level: 11, path: "Dark", archetype: "Shade" },
  { name: "BoraBora", level: 9, path: "Light", archetype: "Seraph" },
  { name: "GhostMaker", level: 8, path: "Dark", archetype: "Necrolord" },
];

// --- Helpers ---
const getAssetPath = (path: string) => {
    const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
    // Ensure no double slashes
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
};

// --- Components ---

export default function Home() {
  const { connected, publicKey } = useWallet();
  const [isGuest, setIsGuest] = useState(false);
  const [tab, setTab] = useState<"hero" | "pve" | "rank">("hero");
  const [hero, setHero] = useState<Hero | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [combat, setCombat] = useState<CombatState | null>(null);
  const [tutorialStep, setTutorialStep] = useState(0);

  useEffect(() => {
    // Show tutorial for new sessions if not connected/no hero
    if (!connected && !isGuest) {
        setTutorialStep(0);
    }
  }, [connected, isGuest]);

  useEffect(() => {
    const interval = setInterval(() => {
      setHero(prev => {
        if (!prev || prev.energy >= prev.maxEnergy) return prev;
        return { ...prev, energy: Math.min(prev.maxEnergy, prev.energy + 1) };
      });
    }, 60000); // 1 energy every 60 seconds (much slower)
    return () => clearInterval(interval);
  }, []);

  const mintHero = (name: string, path: Path, archetypeIdx: number) => {
    setIsMinting(true);
    setTimeout(() => {
      const arch = ARCHETYPES[path][archetypeIdx];
      // Balanced "Base 5" Rule
      let stats: HeroStats = { strength: 5, skill: 5, agility: 5, constitution: 5, luck: 5 };
      stats[arch.bias as keyof HeroStats] += 5; // Archetype bonus
      
      let remaining = 20; // Final 20 points distributed randomly
      while (remaining > 0) {
        const keys = Object.keys(stats) as Array<keyof HeroStats>;
        const idx = Math.floor(Math.random() * keys.length);
        stats[keys[idx]]++;
        remaining--;
      }

      setHero({
        name, path, archetype: arch.name,
        level: 1, xp: 0, aurum: 100,
        energy: 100, maxEnergy: 100,
        points: 0, stats,
        image: getAssetPath(`assets/heroes/${arch.img}.png`),
        attackPattern: Array(5).fill("Torso"),
        defensePattern: Array(5).fill("Torso")
      });
      setIsMinting(false);
      setTutorialStep(1); // Start tutorial after minting
    }, 1500);
  };

  const startCombat = (tier: number) => {
    if (!hero || hero.energy < 20) return;
    
    const pool = [
      { name: "Skull Guard", img: "skeleton", hp: 150, atk: 18 },
      { name: "Blood Ogre", img: "ogre", hp: 450, atk: 45 },
      { name: "Wraith Shadow", img: "wraith", hp: 200, atk: 60 },
    ];
    const base = pool[Math.min(tier-1, 2)];
    const enemyAtkPattern = Array(5).fill(null).map(() => BODY_PARTS[Math.floor(Math.random() * 5)]);
    const enemyDefPattern = Array(5).fill(null).map(() => BODY_PARTS[Math.floor(Math.random() * 5)]);

    const enemy: Enemy = {
      name: base.name,
      image: getAssetPath(`assets/enemies/${base.img}.png`),
      maxHp: base.hp * tier, hp: base.hp * tier,
      attack: base.atk * tier, defense: 8 * tier, agilityBias: 0.12 * tier,
      attackPattern: enemyAtkPattern, defensePattern: enemyDefPattern
    };

    setHero(h => h ? {...h, energy: h.energy - 20} : null);
    
    setCombat({
      enemy,
      heroHp: 120 + hero.stats.constitution * 15,
      heroMaxHp: 120 + hero.stats.constitution * 15,
      currentRound: 0,
      logs: [],
      status: "running",
      winner: null,
      stats: { damageDealt: 0, damageTaken: 0, blocks: 0, misses: 0, rounds: 0 }
    });
  };

  useEffect(() => {
    if (combat && combat.status === "running") {
      const timer = setTimeout(() => {
        const roundIdx = combat.currentRound % 5;
        const hAtkZone = hero!.attackPattern[roundIdx];
        const hDefZone = hero!.defensePattern[roundIdx];
        const eAtkZone = combat.enemy.attackPattern[roundIdx];
        const eDefZone = combat.enemy.defensePattern[roundIdx];

        // Hero Turn
        const hMeta = PART_META[hAtkZone];
        const hHitChance = hMeta.chance + (hero!.stats.skill * 0.007);
        const heroHits = Math.random() < hHitChance && hAtkZone !== eDefZone;
        let hDmg = 0;
        let blocks = combat.stats.blocks;
        let misses = combat.stats.misses;

        if (hAtkZone === eDefZone) {
            blocks++;
        } else if (heroHits) {
            hDmg = Math.max(8, (hero!.stats.strength * 2.5 * hMeta.mult) - combat.enemy.defense);
            if (Math.random() < hero!.stats.luck * 0.015) hDmg *= 1.5;
        } else {
            misses++;
        }

        // Enemy Turn
        const eMeta = PART_META[eAtkZone];
        const enemyHits = Math.random() < eMeta.chance && eAtkZone !== hDefZone;
        let eDmg = 0;
        if (eAtkZone === hDefZone) {
            blocks++;
        } else if (enemyHits) {
            eDmg = Math.max(5, (combat.enemy.attack * eMeta.mult) - (hero!.stats.agility * 0.6 + hero!.stats.constitution * 1.5));
        }

        const newEnemyHp = Math.max(0, combat.enemy.hp - hDmg);
        const newHeroHp = Math.max(0, combat.heroHp - eDmg);
        
        let winner: "hero" | "enemy" | null = null;
        let status: "running" | "finished" = "running";
        
        if (newEnemyHp <= 0) { winner = "hero"; status = "finished"; }
        else if (newHeroHp <= 0) { winner = "enemy"; status = "finished"; }
        else if (combat.currentRound >= 24) { winner = newHeroHp > newEnemyHp ? "hero" : "enemy"; status = "finished"; }

        setCombat(prev => {
          if (!prev) return null;
          return {
            ...prev,
            enemy: { ...prev.enemy, hp: newEnemyHp },
            heroHp: newHeroHp,
            currentRound: prev.currentRound + 1,
            logs: [{ round: prev.currentRound + 1, text: hDmg > 0 ? `You hit ${hAtkZone} for ${hDmg.toFixed(0)}` : `Miss/Block at ${hAtkZone}`, heroDmg: hDmg, enemyDmg: eDmg, type: "hit" as const } as CombatLogEntry, ...prev.logs].slice(0, 5),
            status,
            winner,
            stats: {
              damageDealt: prev.stats.damageDealt + hDmg,
              damageTaken: prev.stats.damageTaken + eDmg,
              blocks,
              misses,
              rounds: prev.currentRound + 1
            }
          };
        });

      }, 800);
      return () => clearTimeout(timer);
    }
  }, [combat, hero]);

  const endCombat = () => {
    if (!combat || !hero) return;
    if (combat.winner === "hero") {
        const xp = 40 + (combat.enemy.maxHp * 0.05); // Reduced from 150
        const gold = 20 + (combat.enemy.attack * 0.2); // Reduced from 75
        setHero(h => {
            if (!h) return null;
            let nxp = h.xp + xp;
            let nlvl = h.level;
            let npts = h.points;
            const xpNeeded = h.level * 150; // Increased from level * 100
            if (nxp >= xpNeeded) { 
                nxp -= xpNeeded; 
                nlvl++; 
                npts += 2; // Reduced from 5
            }
            return { ...h, xp: nxp, aurum: h.aurum + gold, level: nlvl, points: npts };
        });
    }
    setCombat(null);
  };

  if (!connected && !isGuest) return <LandingPage onGuest={() => setIsGuest(true)} />;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-950 text-white selection:bg-amber-500 overflow-x-hidden relative">
      <GlobalHUD hero={hero} publicKey={publicKey} isGuest={isGuest} />
      <TutorialOverlay step={tutorialStep} onNext={() => setTutorialStep(s => s + 1)} hero={hero} />
      
      <div className="p-6 pb-36">
        {!combat ? (
          <>
            {tab === "hero" && <HeroScreen hero={hero} onMint={mintHero} isMinting={isMinting} onUpgrade={(s: string) => setHero(h => {
                const cost = Math.floor(h!.stats[s as keyof HeroStats] * 1.5); // Dynamic cost
                if (!h || h.points <= 0 || h.aurum < cost) return h;
                return { ...h, points: h.points - 1, aurum: h.aurum - cost, stats: { ...h.stats, [s]: h.stats[s as keyof HeroStats] + 1 } }
            })} onTactic={(r: number, t: "atk" | "def", z: BodyPart) => setHero(h => {
                if (!h) return null;
                const nAtk = [...h.attackPattern]; 
                const nDef = [...h.defensePattern];
                if (t === "atk") nAtk[r] = z; else nDef[r] = z;
                return { ...h, attackPattern: nAtk, defensePattern: nDef };
            })} />}
            {tab === "pve" && <PvEScreen hero={hero} onStart={startCombat} />}
            {tab === "rank" && <LeaderboardScreen currentHero={hero} />}
          </>
        ) : (
          <CombatView combat={combat} player={hero!} onFinish={endCombat} />
        )}
      </div>

      {!combat && <Navigation activeTab={tab} onSetTab={setTab} />}
    </div>
  );
}

// --- UI Components ---

function LandingPage({ onGuest }: any) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center bg-black overflow-hidden relative">
        {/* Background Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-black to-black z-0" />
        
        {/* Mobile Cover Art */}
        <div className="relative z-10 w-full max-w-md flex flex-col items-center px-4">
            <div className="relative w-full aspect-[9/12] rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_0_80px_rgba(245,158,11,0.15)] mb-8">
                <img 
                    src={getAssetPath("assets/cover.png")} 
                    alt="Solareign" 
                    className="w-full h-full object-cover scale-105 hover:scale-100 transition-transform duration-1000"
                />
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/40 to-transparent" />
            </div>

            <p className="text-slate-500 font-bold tracking-[0.5em] text-[10px] uppercase mb-12">Blockchain Tactical Redefined</p>
            
            <div className="flex flex-col space-y-4 w-full px-8">
                <WalletMultiButton style={{ 
                    backgroundColor: '#fff', 
                    color: '#000', 
                    fontWeight: '900', 
                    borderRadius: '16px', 
                    height: '64px',
                    width: '100%',
                    justifyContent: 'center',
                    fontSize: '14px',
                    textTransform: 'uppercase'
                }} />
                <button 
                    onClick={onGuest} 
                    className="bg-slate-900/50 backdrop-blur-md text-white font-black italic rounded-2xl px-10 py-5 border border-white/10 hover:bg-slate-800 transition-all uppercase tracking-widest text-xs"
                >
                    Enter as Guest
                </button>
            </div>
        </div>
      </div>
    );
}

function GlobalHUD({ hero, publicKey, isGuest }: any) {
    return (
        <div className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-white/5 p-4 flex justify-between items-center px-6">
            <div className="flex items-center space-x-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 overflow-hidden">
                   <img src={hero?.image || getAssetPath("assets/heroes/light1.png")} className={`w-full h-full object-cover ${!hero && 'opacity-10'}`} />
                </div>
                <div>
                    <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">{hero?.archetype || 'New Seeker'}</span>
                    <span className="block text-xs font-black truncate max-w-[80px]">{hero?.name || (isGuest ? "GUEST-01" : publicKey?.toBase58().slice(0, 8))}</span>
                </div>
            </div>
            <div className="flex space-x-2">
                <div className="bg-slate-900 rounded-xl px-4 py-2 border border-white/5 flex items-center">
                    <BatteryCharging className="w-3 h-3 text-emerald-500 mr-2" />
                    <span className="text-xs font-black text-emerald-500">{hero?.energy || 0}%</span>
                </div>
                <div className="bg-amber-500/10 rounded-xl px-4 py-2 border border-amber-500/20 flex items-center">
                    <Coins className="w-3 h-3 text-amber-500 mr-2" />
                    <span className="text-xs font-black text-amber-500">{hero?.aurum || 0}</span>
                </div>
            </div>
        </div>
    );
}

function HeroScreen({ hero, onMint, isMinting, onUpgrade, onTactic }: any) {
    const [name, setName] = useState("Alpha");
    const [subTab, setSubTab] = useState<"stats" | "tactics">("stats");

    if (!hero) return (
        <div className="space-y-10 py-10 animate-in fade-in zoom-in">
            <div className="space-y-4 text-center px-6">
                <h2 className="text-4xl font-black italic tracking-tighter">FORGE YOUR SOUL</h2>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-900 border-none rounded-2xl py-5 px-6 text-center text-xl font-bold outline-none ring-1 ring-white/10" />
            </div>
            <div className="grid grid-cols-1 gap-4 px-6">
                {Object.entries(ARCHETYPES).map(([path, classes]) => (
                    <div key={path} className="grid grid-cols-2 gap-4">
                        {classes.map((c, i) => (
                            <button key={c.name} disabled={isMinting} onClick={() => onMint(name, path, i)} className="p-6 rounded-[2rem] bg-slate-900 border border-white/10 hover:border-amber-500 transition-all text-left group">
                                <span className={`text-[8px] font-black uppercase tracking-widest ${path === 'Light' ? 'text-amber-500' : 'text-purple-500'}`}>{path} Unit</span>
                                <div className="text-lg font-black text-white italic">{c.name}</div>
                                <div className="text-[10px] font-bold text-slate-500 mt-2 uppercase">Bonus: {c.bias}</div>
                            </button>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className={`p-10 rounded-[3rem] relative overflow-hidden ring-1 ring-white/10 shadow-2xl ${hero.path === 'Light' ? 'bg-gradient-to-br from-amber-600 to-orange-950' : 'bg-gradient-to-br from-slate-900 to-purple-950'}`}>
                <img src={hero.image} className="absolute right-[-30px] bottom-[-30px] w-64 h-64 opacity-50 contrast-150 rotate-[-5deg]" />
                <div className="relative z-10">
                    <h3 className="text-5xl font-black italic tracking-tighter leading-none">{hero.name}</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60 mt-2">{hero.archetype} • LVL {hero.level}</p>
                    <div className="mt-10 flex items-center space-x-4 max-w-[200px]">
                        <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-white transition-all duration-1000" style={{ width: `${(hero.xp/(hero.level*100))*100}%` }} />
                        </div>
                        <span className="text-[10px] font-black text-white/50 whitespace-nowrap">{hero.xp.toFixed(0)}/{hero.level*100} XP</span>
                    </div>
                </div>
            </div>

            <div className="flex bg-slate-900/40 rounded-3xl p-2 border border-white/5">
                <button onClick={() => setSubTab("stats")} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'stats' ? 'bg-white text-black shadow-xl' : 'text-slate-500'}`}>Character</button>
                <button onClick={() => setSubTab("tactics")} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'tactics' ? 'bg-white text-black shadow-xl' : 'text-slate-500'}`}>Tactical DNA</button>
            </div>

            {subTab === "stats" ? (
                <div className="space-y-6">
                    <div className="p-8 bg-slate-900 rounded-[2.5rem] border border-white/5 flex justify-between items-center shadow-2xl">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Available Points</span>
                            <span className="text-5xl font-black text-amber-500 leading-none mt-2">{hero.points}</span>
                        </div>
                        <div className="w-16 h-16 bg-slate-950 rounded-2xl flex items-center justify-center border border-white/10">
                            <Star className="w-8 h-8 text-amber-500 animate-pulse" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        {Object.entries(hero.stats).map(([s, v]: any) => (
                           <StatCard key={s} label={s} val={v} onUp={() => onUpgrade(s)} available={hero.points > 0 && hero.aurum >= 10} />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-6 text-left">
                    {[0,1,2,3,4].map(round => (
                        <div key={round} className="p-8 bg-slate-900 rounded-[2.5rem] border border-white/5 space-y-6 shadow-xl relative overflow-hidden">
                            <span className="absolute right-8 top-8 text-4xl font-black text-white/5 italic">#{round+1}</span>
                            <div className="space-y-6 relative z-10">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-rose-500/80 uppercase tracking-widest block">Round {round+1} Attack Focus</label>
                                    <div className="flex flex-wrap gap-2">
                                        {BODY_PARTS.map(p => (
                                            <TacticBtn key={p} active={hero.attackPattern[round] === p} label={p} onClick={() => onTactic(round, "atk", p)} type="atk" />
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-blue-500/80 uppercase tracking-widest block">Round {round+1} Guard Zone</label>
                                    <div className="flex flex-wrap gap-2">
                                        {BODY_PARTS.map(p => (
                                            <TacticBtn key={p} active={hero.defensePattern[round] === p} label={p} onClick={() => onTactic(round, "def", p)} type="def" />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function TacticBtn({ active, label, onClick, type }: any) {
    const activeS = type === "atk" ? "bg-rose-500 border-rose-400 text-black shadow-lg shadow-rose-500/20" : "bg-blue-500 border-blue-400 text-black shadow-lg shadow-blue-500/20";
    return (
        <button onClick={onClick} className={`px-4 py-2 rounded-xl border text-[9px] font-black transition-all ${active ? activeS : 'bg-slate-950 opacity-40 border-white/5 text-slate-500'}`}>{label.toUpperCase()}</button>
    );
}

function StatCard({ label, val, onUp, available }: any) {
    return (
        <div className="flex items-center justify-between p-5 bg-slate-900 border border-white/5 rounded-3xl">
            <div className="flex flex-col text-left">
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">{label}</span>
                <span className="text-2xl font-black text-white mt-1 italic">{val}</span>
            </div>
            {available && (
                <button onClick={onUp} className="bg-white/5 hover:bg-white text-white hover:text-black px-6 py-3 rounded-2xl text-[10px] font-black border border-white/10 uppercase transition-all shadow-xl">Upgrade ({Math.floor(val * 1.5)}G)</button>
            )}
        </div>
    );
}

function PvEScreen({ hero, onStart }: any) {
    if (!hero) return null;
    return (
        <div className="space-y-8 py-10">
            <h2 className="text-4xl font-black italic tracking-tighter text-left">THE WILDLANDS</h2>
            <div className="grid grid-cols-1 gap-6">
                <SectorCard tier={1} name="Bone Crypt" enemy="Skeleton" onStart={() => onStart(1)} color="bg-slate-900" active={hero.energy >= 20} />
                <SectorCard tier={2} name="Ogre Pass" enemy="Ogre" onStart={() => onStart(2)} color="bg-orange-950" active={hero.energy >= 20} />
                <SectorCard tier={3} name="Void Citadel" enemy="Wraith" onStart={() => onStart(3)} color="bg-purple-950" active={hero.energy >= 20} />
            </div>
        </div>
    );
}

function SectorCard({ tier, name, enemy, onStart, color, active }: any) {
    return (
        <button disabled={!active} onClick={onStart} className={`w-full text-left p-10 rounded-[4rem] ${color} border border-white/10 relative overflow-hidden group shadow-2xl disabled:opacity-30 active:scale-95 transition-all`}>
            <div className="relative z-10 flex flex-col space-y-2">
                <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Sector tier {tier}</span>
                <h4 className="text-3xl font-black text-white tracking-tighter uppercase italic">{name}</h4>
                <div className="flex items-center text-[10px] font-bold text-amber-500 uppercase tracking-widest pt-2">
                   <Target className="w-3 h-3 mr-2" /> {enemy} infestation
                </div>
            </div>
            <ArrowRight className="absolute right-10 bottom-10 w-10 h-10 opacity-10 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0" />
        </button>
    );
}

function LeaderboardScreen({ currentHero }: any) {
    return (
        <div className="space-y-8 py-10 text-left">
            <h2 className="text-4xl font-black italic tracking-tighter">HALL OF FAME</h2>
            <div className="space-y-3">
                {MOCK_LEADERBOARD.map((p, i) => (
                    <div key={i} className="p-6 bg-slate-900 rounded-3xl border border-white/5 flex justify-between items-center">
                        <div className="flex items-center space-x-5">
                            <span className="text-2xl font-black italic text-slate-800">#{i+1}</span>
                            <div className="flex flex-col">
                                <span className="font-black text-lg tracking-tight">{p.name}</span>
                                <span className="text-[9px] font-black uppercase text-slate-500">{p.archetype} • LVL {p.level}</span>
                            </div>
                        </div>
                        <Medal className="w-5 h-5 text-amber-500" />
                    </div>
                ))}
                {currentHero && (
                    <div className="p-6 bg-amber-500 rounded-3xl flex justify-between items-center text-black shadow-2xl shadow-amber-500/20">
                        <div className="flex items-center space-x-5">
                            <span className="text-2xl font-black italic">#5</span>
                            <div className="flex flex-col">
                                <span className="font-black text-lg tracking-tight">{currentHero.name} (YOU)</span>
                                <span className="text-[9px] font-black uppercase text-black/60">{currentHero.archetype} • LVL {currentHero.level}</span>
                            </div>
                        </div>
                        <Trophy className="w-5 h-5 text-black" />
                    </div>
                )}
            </div>
        </div>
    );
}

function CombatView({ combat, player, onFinish }: any) {
    if (combat.status === "finished") return (
        <div className="p-8 pb-32 animate-in zoom-in space-y-10">
            <div className="text-center space-y-4">
                <h4 className={`text-8xl font-black italic tracking-tighter ${combat.winner === 'hero' ? 'text-amber-500' : 'text-slate-800'}`}>{combat.winner === 'hero' ? 'VICTORY' : 'DEFEAT'}</h4>
                <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-xs">Mission Report</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <StatRep label="Dmg Dealt" val={(combat.stats?.damageDealt || 0).toFixed(0)} icon={Flame} />
                <StatRep label="Dmg Taken" val={(combat.stats?.damageTaken || 0).toFixed(0)} icon={ShieldAlert} />
                <StatRep label="Blocks" val={combat.stats?.blocks || 0} icon={ShieldHalf} />
                <StatRep label="Rounds" val={combat.stats?.rounds || 0} icon={Activity} />
            </div>

            <div className="bg-slate-900 p-8 rounded-[3rem] border border-white/5 space-y-6 shadow-2xl shadow-black/50">
                <div className="flex justify-between items-center border-b border-white/5 pb-6">
                    <div className="flex flex-col text-left">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rewards Claimed</span>
                        <div className="flex space-x-6 mt-3">
                            <div className="flex items-center space-x-2"><Coins className="w-5 h-5 text-amber-500" /><span className="text-2xl font-black italic">{combat.winner === 'hero' ? '75' : '10'}</span></div>
                            <div className="flex items-center space-x-2"><History className="w-5 h-5 text-blue-400" /><span className="text-2xl font-black italic">{combat.winner === 'hero' ? '150' : '25'} XP</span></div>
                        </div>
                    </div>
                    <Trophy className="w-12 h-12 text-slate-800" />
                </div>
                <button onClick={onFinish} className="w-full bg-white text-black py-6 rounded-[2rem] font-black text-xl italic tracking-widest hover:scale-[1.02] active:scale-95 transition-all uppercase">Back to Outpost</button>
            </div>
        </div>
    );

    return (
        <div className="space-y-12 animate-in fade-in py-10">
            <div className="flex justify-between items-center px-4">
                <div className="w-32 space-y-3">
                    <div className="relative aspect-square rounded-[2rem] bg-slate-900 border-2 border-white/10 overflow-hidden shadow-2xl">
                        <img src={player.image} className="w-full h-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 h-2 bg-black/40"><div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${(combat.heroHp/combat.heroMaxHp)*100}%` }} /></div>
                    </div>
                    <div className="text-center font-black text-[10px] text-white uppercase tracking-widest">{combat.heroHp.toFixed(0)} HP</div>
                </div>
                <div className="font-black text-slate-800 text-5xl italic animate-pulse">VS</div>
                <div className="w-32 space-y-3">
                    <div className="relative aspect-square rounded-[2rem] bg-slate-900 border-2 border-rose-500/20 overflow-hidden shadow-2xl">
                        <img src={combat.enemy.image} alt={combat.enemy.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 h-2 bg-black/40"><div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${(combat.enemy.hp/combat.enemy.maxHp)*100}%` }} /></div>
                    </div>
                    <div className="text-center font-black text-[10px] text-rose-500 uppercase tracking-widest">{combat.enemy.hp.toFixed(0)} HP</div>
                </div>
            </div>

            <div className="space-y-4 px-4 h-56 overflow-hidden flex flex-col justify-end">
                {combat.logs.map((log: any, i: number) => (
                    <div key={i} className="animate-in slide-in-from-bottom-2 bg-slate-900/40 p-4 rounded-2xl border border-white/5 last:border-white/20 last:bg-slate-900 shadow-xl">
                        <p className="text-[10px] font-bold text-slate-400 italic text-left leading-relaxed">ROUND {log.round}: {log.text}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function StatRep({ label, val, icon: Icon }: any) {
    return (
        <div className="bg-slate-900 p-6 rounded-3xl border border-white/5 flex items-center space-x-4 shadow-xl">
            <Icon className="w-4 h-4 text-slate-500" />
            <div className="flex flex-col text-left">
                <span className="text-[9px] font-black text-slate-500 uppercase">{label}</span>
                <span className="text-xl font-black italic">{val}</span>
            </div>
        </div>
    );
}

function Navigation({ activeTab, onSetTab }: any) {
    return (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-3 flex shadow-2xl z-[100]">
            <NavB active={activeTab === 'hero'} icon={ShieldHalf} onClick={() => onSetTab('hero')} />
            <NavB active={activeTab === 'pve'} icon={Map} onClick={() => onSetTab('pve')} />
            <NavB active={activeTab === 'rank'} icon={Medal} onClick={() => onSetTab('rank')} />
        </div>
    );
}

function NavB({ active, icon: Icon, onClick }: any) {
    return (
        <button onClick={onClick} className={`flex-1 flex justify-center py-4 rounded-[2rem] transition-all duration-500 ${active ? 'bg-white text-black shadow-xl scale-105' : 'text-slate-600'}`}>
            <Icon className="w-7 h-7" />
        </button>
    );
}
