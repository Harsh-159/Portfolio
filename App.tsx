import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { NeuralNetwork } from './components/NeuralNetwork';
import { MatrixView } from './components/MatrixView';
import { CategoryId } from './types';
import { NODES } from './constants';
import { Terminal } from 'lucide-react';

const App: React.FC = () => {
  const [activeNodeId, setActiveNodeId] = useState<CategoryId | null>(null);

  const activeNodeData = NODES.find(n => n.id === activeNodeId);

  return (
    <div className="relative w-screen h-screen bg-background overflow-hidden text-white font-sans selection:bg-accent selection:text-background">
      
      {/* Global Header */}
      <header className="absolute top-0 left-0 w-full p-6 z-40 pointer-events-none flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter flex items-center gap-2">
            <span className="text-accent">●</span> HARSH YADAV
          </h1>
          <p className="font-mono text-xs text-secondary mt-1 ml-4 opacity-70">
            // NEURAL_PORTFOLIO_V1.0
          </p>
        </div>
        <div className="hidden md:block text-right font-mono text-xs text-white/30">
           <p>STATUS: ONLINE</p>
           <p>GPU: ACTIVE</p>
           <p>LATENCY: 12ms</p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full h-full relative">
        <AnimatePresence>
          {!activeNodeId ? (
            <motion.div 
              key="network"
              className="absolute inset-0 w-full h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.5 } }}
            >
              <NeuralNetwork onNodeSelect={setActiveNodeId} />
              
              {/* Floating Instruction */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2 }}
                className="absolute bottom-12 left-0 w-full flex justify-center pointer-events-none z-30"
              >
                <div className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
                    <p className="font-mono text-xs md:text-sm text-accent animate-pulse">
                    &lt; CLICK_NODES_TO_INSPECT_DATA /&gt;
                    </p>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <MatrixView 
              key="matrix"
              data={activeNodeData!} 
              onClose={() => setActiveNodeId(null)} 
            />
          )}
        </AnimatePresence>
      </main>

      {/* Footer / Status Bar */}
      <footer className="absolute bottom-0 left-0 w-full p-4 border-t border-white/5 bg-background/80 backdrop-blur flex justify-between items-center text-xs font-mono text-white/40 pointer-events-none z-40">
         <div className="flex items-center gap-2">
            <Terminal size={14} />
            <span>sys.log</span>
         </div>
         <div>
            © 2026 HARSH YADAV | STUDENT
         </div>
      </footer>

    </div>
  );
};

export default App;