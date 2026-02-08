import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Cpu, ExternalLink, Building2, Library, Medal, Trophy, Linkedin, Mail } from 'lucide-react';
import { NodeData } from '../types';
import { ICONS } from '../constants';

interface MatrixViewProps {
  data: NodeData;
  onClose: () => void;
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

// Helper to render "Logo" based on iconType
const LogoIcon = ({ type }: { type?: string }) => {
  if (!type) return null;
  switch (type) {
    case 'college': return <Library size={18} />;
    case 'company': return <Building2 size={18} />;
    case 'award': return <Trophy size={18} />;
    case 'sport': return <Medal size={18} />;
    case 'linkedin': return <Linkedin size={18} />;
    case 'email': return <Mail size={18} />;
    default: return null;
  }
};

// Helper to parse text with links
const formatDetail = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s)]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a 
          key={i} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-accent underline hover:text-white transition-colors break-all"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

export const MatrixView: React.FC<MatrixViewProps> = ({ data, onClose }) => {
  const Icon = ICONS[data.id];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-center items-center p-4 overflow-hidden">
      
      {/* Background Overlay */}
      <motion.div 
        className="absolute inset-0 bg-background/95 backdrop-blur-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Main Content Card */}
      <motion.div 
        layoutId={`node-shape-${data.id}`}
        className="relative z-10 w-full max-w-5xl bg-surface border border-accent/20 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ borderRadius: 24 }}
        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
      >
        {/* Decorative Grid inside the card */}
        <div className="absolute inset-0 pointer-events-none opacity-5">
            <div className="grid grid-cols-12 h-full w-full gap-1">
            {Array.from({ length: 144 }).map((_, i) => (
                <div key={i} className="border border-accent/20 h-full w-full" />
            ))}
            </div>
        </div>

        {/* Card Header Area */}
        <div className="p-6 md:p-10 border-b border-white/10 flex items-start justify-between bg-black/20 shrink-0">
            <div className="flex items-center gap-6">
                <motion.div 
                  layoutId={`node-icon-${data.id}`}
                  className="p-3 bg-accent/10 rounded-xl text-accent"
                >
                    <Icon size={32} />
                </motion.div>
                <div>
                    <motion.h2 
                        className="text-3xl md:text-5xl font-sans font-bold text-white tracking-tight"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        {data.label}
                    </motion.h2>
                    <motion.p 
                        className="font-mono text-secondary text-sm mt-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        // DATA_NODE_ID: {data.id.toUpperCase()}
                    </motion.p>
                </div>
            </div>

            <button 
                onClick={onClose}
                className="group p-2 hover:bg-white/10 rounded-full transition-colors"
            >
                <ArrowLeft className="text-white/50 group-hover:text-white" />
            </button>
        </div>

        {/* Scrollable Content Area - Added flex-1 to ensure visibility */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar relative z-20">
            <motion.div 
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={{
                    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
                    hidden: { opacity: 0, transition: { duration: 0.1 } }
                }}
                className="space-y-8 pb-8"
            >
                {data.items.map((item, index) => (
                <motion.div 
                    key={index} 
                    variants={itemVariants}
                    className="relative pl-6 border-l-2 border-secondary/30"
                >
                    {/* Connector Dot */}
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-background border-2 border-secondary" />

                    <div className="flex flex-col md:flex-row md:items-start justify-between mb-2 gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                             <h3 className="text-2xl font-bold text-white/90">{item.title}</h3>
                             {item.link && (
                               <a 
                                 href={item.link} 
                                 target="_blank" 
                                 rel="noopener noreferrer"
                                 className="text-accent hover:text-white transition-colors"
                               >
                                 <ExternalLink size={20} />
                               </a>
                             )}
                          </div>
                          
                          {/* Subtitle / Role */}
                          {item.subtitle && (
                            <div className="flex items-center gap-2 mt-1">
                              {item.iconType && (
                                <span className="text-accent/70">
                                  <LogoIcon type={item.iconType} />
                                </span>
                              )}
                              <p className="text-accent/80 font-mono text-lg">{item.subtitle}</p>
                            </div>
                          )}
                        </div>

                        {item.date && (
                            <span className="font-mono text-xs text-white/50 bg-white/5 px-2 py-1 rounded whitespace-nowrap shrink-0">
                            {item.date}
                            </span>
                        )}
                    </div>
                    
                    {/* Profile Image (Specific for Me node) */}
                    {item.image && (
                      <div className="my-6 flex justify-center">
                        <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden border-2 border-accent/30 shadow-[0_0_20px_rgba(190,242,100,0.2)]">
                           <img 
                              src={item.image} 
                              alt={item.title} 
                              className="w-full h-full object-cover"
                           />
                           <div className="absolute inset-0 bg-accent/10 pointer-events-none" />
                        </div>
                      </div>
                    )}

                    <div className="bg-background/40 rounded-xl p-6 font-mono text-sm md:text-base text-gray-300 border border-white/5 shadow-inner mt-4">
                        <span className="text-secondary select-none opacity-50 mr-2 block mb-2">[</span>
                        <ul className="space-y-4 pl-2">
                            {item.details.map((detail, idx) => (
                            <li key={idx} className="flex gap-3 items-start">
                                <span className="text-accent select-none shrink-0 mt-1">{'>'}</span>
                                <span className="leading-relaxed whitespace-pre-line">{formatDetail(detail)}</span>
                            </li>
                            ))}
                        </ul>
                        <span className="text-secondary select-none opacity-50 ml-2 block mt-2">]</span>
                    </div>
                </motion.div>
                ))}
            </motion.div>
        </div>

        {/* Footer of Card */}
        <div className="p-4 bg-black/20 border-t border-white/5 flex justify-between items-center text-xs font-mono text-white/30 shrink-0">
             <span>READING_MEMORY_BLOCK_0{Math.floor(Math.random() * 9)}</span>
             <div className="flex items-center gap-2">
                <Cpu size={14} />
                <span>TENSOR_VIEW_ACTIVE</span>
             </div>
        </div>

      </motion.div>
    </div>
  );
};