import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { NODES, ICONS } from '../constants';
import { CategoryId } from '../types';
import { Brain } from 'lucide-react';

interface NeuralNetworkProps {
  onNodeSelect: (id: CategoryId) => void;
}

// Helper to generate coordinates
const generateLayer = (count: number, xPos: number, height: number = 100) => {
  return Array.from({ length: count }).map((_, i) => ({
    x: xPos,
    y: ((i + 1) / (count + 1)) * height
  }));
};

export const NeuralNetwork: React.FC<NeuralNetworkProps> = ({ onNodeSelect }) => {
  // Layer Configurations
  const layers = useMemo(() => {
    return {
      input: generateLayer(4, 15),
      hidden1: generateLayer(8, 40),
      hidden2: generateLayer(8, 65),
      output: generateLayer(1, 90)
    };
  }, []);

  // Generate Edges with Sequential Logic
  const edges = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; id: string, layerIndex: number }[] = [];
    
    // Connect layers function
    const connect = (layerA: {x:number, y:number}[], layerB: {x:number, y:number}[], prefix: string, layerIndex: number) => {
        layerA.forEach((posA, i) => {
            layerB.forEach((posB, j) => {
                lines.push({
                    x1: posA.x,
                    y1: posA.y,
                    x2: posB.x,
                    y2: posB.y,
                    id: `${prefix}-${i}-${j}`,
                    layerIndex: layerIndex
                });
            });
        });
    };

    // Sequence indices: Input->H1 (0), H1->H2 (1), H2->Out (2)
    connect(layers.input, layers.hidden1, 'in-h1', 0);
    connect(layers.hidden1, layers.hidden2, 'h1-h2', 1);
    connect(layers.hidden2, layers.output, 'h2-out', 2);
    
    return lines;
  }, [layers]);

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // TIMING CONFIGURATION (Seconds)
  // Step 1: Input->H1 Lines (0 - 1.5s)
  // Step 2: H1 Nodes (1.5s - 2.5s)
  // Step 3: H1->H2 Lines (2.5s - 4.0s)
  // Step 4: H2 Nodes (4.0s - 5.0s)
  // Step 5: H2->Out Lines (5.0s - 6.5s)
  // Step 6: Out Node (6.5s - 7.5s)
  const TOTAL_CYCLE = 8;
  const PHASE_1_LINES = 0;
  const PHASE_2_NODES = 1.5;
  const PHASE_3_LINES = 2.5;
  const PHASE_4_NODES = 4.0;
  const PHASE_5_LINES = 5.0;
  const PHASE_6_NODES = 6.5;

  return (
    <div className="w-full h-full relative flex items-center justify-center p-4">
      {/* SVG Container for Edges */}
      <svg 
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
             <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.1" />
             <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.4" />
             <stop offset="100%" stopColor="#bef264" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {edges.map((edge) => {
          // Determine Delay based on layer index
          let delay = 0;
          if (edge.layerIndex === 0) delay = PHASE_1_LINES;
          if (edge.layerIndex === 1) delay = PHASE_3_LINES;
          if (edge.layerIndex === 2) delay = PHASE_5_LINES;

          return (
            <React.Fragment key={edge.id}>
              {/* Base Line */}
              <motion.path
                d={`M ${edge.x1} ${edge.y1} L ${edge.x2} ${edge.y2}`}
                stroke="url(#edge-gradient)"
                strokeWidth="0.15"
                fill="none"
                initial={{ opacity: 0.1 }}
              />
              
              {/* Active Data Flow Animation */}
              <motion.path
                d={`M ${edge.x1} ${edge.y1} L ${edge.x2} ${edge.y2}`}
                stroke="#bef264"
                strokeWidth="0.3"
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ 
                  pathLength: [0, 1, 1, 0], 
                  opacity: [0, 0.8, 0.8, 0],
                }}
                transition={{
                  duration: 2.5, 
                  times: [0, 0.4, 0.6, 1], // Appear, stay, fade
                  delay: delay,
                  repeat: Infinity,
                  repeatDelay: TOTAL_CYCLE - 2.5 
                }}
              />
            </React.Fragment>
          );
        })}
      </svg>

      {/* Nodes Overlay */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        
        {/* INPUT LAYER NODES (INTERACTIVE) */}
        {layers.input.map((pos, i) => {
          const nodeData = NODES[i];
          if (!nodeData) return null;
          const Icon = ICONS[nodeData.id];
          const isHovered = hoveredNode === nodeData.id;

          return (
            <div 
              key={nodeData.id}
              style={{ 
                left: `${pos.x}%`, 
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
              className="absolute pointer-events-auto"
            >
              <motion.div
                layoutId={`node-container-${nodeData.id}`}
                className="relative group cursor-pointer z-10"
                onClick={() => onNodeSelect(nodeData.id)}
                onMouseEnter={() => setHoveredNode(nodeData.id)}
                onMouseLeave={() => setHoveredNode(null)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Node Label (Above) */}
                <motion.div 
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 whitespace-nowrap"
                  animate={{ y: isHovered ? -5 : 0 }}
                >
                    <div className="bg-background/80 backdrop-blur px-3 py-1 rounded border border-accent/20 text-accent font-mono text-xs md:text-sm shadow-lg">
                        {nodeData.label}
                    </div>
                </motion.div>

                {/* The Node Circle - Shared Layout Element */}
                <motion.div 
                    layoutId={`node-shape-${nodeData.id}`}
                    className={`w-12 h-12 md:w-16 md:h-16 flex items-center justify-center border-2 bg-surface z-20 relative`}
                    style={{ borderRadius: '50%' }}
                    // Explicit transition specifically for layout to be fast, overriding the infinite loop of children or self
                    transition={{
                        layout: { duration: 0.6, type: "spring", bounce: 0.2 },
                    }}
                    animate={{
                        borderColor: isHovered ? "#bef264" : ["#8b5cf6", "#bef264", "#8b5cf6"],
                        boxShadow: isHovered 
                            ? "0 0 25px rgba(190,242,100,0.6)" 
                            : ["0 0 15px rgba(139,92,246,0.3)", "0 0 25px rgba(139,92,246,0.6)", "0 0 15px rgba(139,92,246,0.3)"]
                    }}
                >
                    <motion.div layoutId={`node-icon-${nodeData.id}`}>
                       <Icon size={24} className={isHovered ? 'text-accent' : 'text-secondary'} />
                    </motion.div>
                </motion.div>

                {/* Connecting glow - Separate from shared element to avoid layout interference */}
                <div className={`absolute inset-0 rounded-full blur-md -z-10 transition-opacity duration-300 ${isHovered ? 'bg-accent/40 opacity-100' : 'bg-secondary/20 opacity-0'}`} />
              </motion.div>
            </div>
          );
        })}

        {/* HIDDEN LAYER 1 */}
        {layers.hidden1.map((pos, i) => (
          <div 
            key={`h1-${i}`}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
          >
            <motion.div 
              animate={{ 
                  scale: [1, 1.4, 1], 
                  opacity: [0.3, 1, 0.3],
                  backgroundColor: ["#8b5cf6", "#bef264", "#8b5cf6"]
              }}
              transition={{ 
                  duration: 1.5, // Pulse duration
                  delay: PHASE_2_NODES + (Math.random() * 0.5), // Start after Phase 1 lines
                  repeat: Infinity, 
                  repeatDelay: TOTAL_CYCLE - 1.5
              }}
              className="w-3 h-3 md:w-4 md:h-4 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.6)]" 
            />
          </div>
        ))}

        {/* HIDDEN LAYER 2 */}
        {layers.hidden2.map((pos, i) => (
          <div 
            key={`h2-${i}`}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
          >
            <motion.div 
               animate={{ 
                  scale: [1, 1.4, 1], 
                  opacity: [0.3, 1, 0.3],
                  backgroundColor: ["#8b5cf6", "#bef264", "#8b5cf6"]
               }}
               transition={{ 
                   duration: 1.5,
                   delay: PHASE_4_NODES + (Math.random() * 0.5), // Start after Phase 3 lines
                   repeat: Infinity, 
                   repeatDelay: TOTAL_CYCLE - 1.5
               }}
               className="w-3 h-3 md:w-4 md:h-4 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.6)]" 
            />
          </div>
        ))}

        {/* OUTPUT LAYER */}
        {layers.output.map((pos, i) => {
            const isHovered = hoveredNode === 'me';
            return (
              <div 
                key={`out-${i}`}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
              >
                 <motion.div
                    layoutId="node-container-me"
                    className="relative group cursor-pointer"
                    onClick={() => onNodeSelect('me')}
                    onMouseEnter={() => setHoveredNode('me')}
                    onMouseLeave={() => setHoveredNode(null)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                 >
                    <motion.div 
                       layoutId="node-shape-me"
                       className={`w-20 h-20 md:w-24 md:h-24 flex items-center justify-center border-4 z-20 relative bg-surface`}
                       style={{ borderRadius: '50%' }}
                       transition={{
                           layout: { duration: 0.6, type: "spring", bounce: 0.2 },
                       }}
                       animate={{
                          borderColor: isHovered ? "#bef264" : ["#8b5cf6", "#bef264", "#8b5cf6"],
                          boxShadow: isHovered 
                              ? "0 0 40px rgba(190,242,100,0.6)" 
                              : ["0 0 20px rgba(139,92,246,0.3)", "0 0 40px rgba(190,242,100,0.4)", "0 0 20px rgba(139,92,246,0.3)"]
                       }}
                    >
                       <div className="absolute inset-0 rounded-full bg-accent/5 animate-pulse"></div>
                       <motion.div layoutId="node-icon-me">
                         <Brain size={40} strokeWidth={1.5} className={isHovered ? 'text-accent' : 'text-white'} />
                       </motion.div>
                    </motion.div>
                    
                    {/* Output Label "ME" */}
                    <motion.div 
                      className="absolute top-full mt-4 left-1/2 -translate-x-1/2"
                      animate={{ y: isHovered ? 5 : 0 }}
                    >
                         <span className="font-bold text-white text-xs md:text-sm text-center bg-background/50 px-2 py-1 rounded">ME</span>
                    </motion.div>
                 </motion.div>
              </div>
            );
        })}

      </div>
    </div>
  );
};