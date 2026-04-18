import React, { useState, useEffect } from 'react';
import { generateEcoTip } from '../services/gemini';
import { Leaf, Sparkles, Loader2 } from 'lucide-react'; 

const EcoLoopCoach = ({ totalKmSaved, totalCo2Saved }) => {

  const [tip, setTip] = useState("Consulting the AI Eco-Brain...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchTip = async () => {
        setLoading(true);
        try {
            await new Promise(r => setTimeout(r, 500));
            
            const aiTip = await generateEcoTip(totalKmSaved, totalCo2Saved);
            
            if (isMounted) {
                setTip(aiTip);
            }
        } catch (err) {
            if (isMounted) setTip("Keep carpooling to save the planet!");
        } finally {
            if (isMounted) setLoading(false);
        }
    };

    fetchTip();

    return () => { isMounted = false; };
    
  }, [totalKmSaved, totalCo2Saved]); 

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-700 to-teal-900 rounded-2xl p-6 text-white shadow-lg transform transition hover:scale-[1.01]">

      <Leaf className="absolute -top-6 -right-6 h-28 w-28 text-white/10 rotate-12 pointer-events-none" />
      <Sparkles className="absolute bottom-4 right-12 h-8 w-8 text-emerald-300/30 pointer-events-none animate-pulse" />
      
      <div className="relative z-10 flex items-start gap-4">
        <div className="bg-white/20 p-3 rounded-full backdrop-blur-md shrink-0">
            {loading ? (
                <Loader2 className="h-7 w-7 text-emerald-200 animate-spin" />
            ) : (
                <Leaf className="h-7 w-7 text-emerald-300" />
            )}
        </div>

        <div className="flex-1 pt-1">
            <h3 className="text-emerald-200 font-bold uppercase tracking-wider text-xs mb-2 flex items-center gap-2">
                {loading ? (
                    <>Thinking... <Sparkles className="h-3 w-3" /></>
                ) : (
                    <>✨ Gemini AI Eco-Coach</>
                )}
            </h3>

            <p className={`text-lg md:text-xl font-medium leading-relaxed transition-opacity duration-300 ${loading ? 'opacity-60 animate-pulse' : 'opacity-100'}`}>
                "{tip}"
            </p>
        </div>
      </div>
    </div>
  );
};

export default EcoLoopCoach;