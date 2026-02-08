import { NodeData } from './types';
import { GraduationCap, Briefcase, Code, Award, Brain } from 'lucide-react';

export const NODES: NodeData[] = [
  {
    id: 'education',
    label: 'Education',
    items: [
      {
        title: 'MSc AI & ML',
        subtitle: 'University of Birmingham',
        date: '2025 - Current',
        iconType: 'college',
        details: [
          'Distinction Expected',
          'Key Coursework: Current Topics in Artificial Intelligence and Machine Learning, Machine Learning, Mathematical Foundations of Artificial Intelligence (AI) and Machine Learning (ML), Intelligent Robotics (Extended), Evolutionary Computation (Extended), Natural Language Processing (Extended)'
        ]
      },
      {
        title: 'B.Tech, Electronics and Electrical Engineering',
        subtitle: 'IIT Guwahati',
        date: '2019 - 2023',
        iconType: 'college',
        details: [
          '7.93 GPA',
          'Key Coursework: Introduction to Computing (CS 101), Computing Lab (CS 110), Information Theory & Coding (EE 335), Data Structures and Algorithms (EE 390), Deep Learning (CS 590), Optimization Techniques (EE 658)'
        ]
      }
    ]
  },
  {
    id: 'work',
    label: 'Work Experience',
    items: [
      {
        title: 'Applications Developer',
        subtitle: 'Oracle',
        date: '2023 - 2025',
        iconType: 'company',
        details: [
          'Collaborated with the Transaction Framework team, focusing on backend development and AI-powered components.',
          'Designed and implemented an internal AI powered approval rule generation system using 19 specialised prompts called via internal API’s, extensive pre and post processing, and structured JSON latent representations. Decomposed the workflow into parallel components to reduce end to end runtime from linear scaling to a consistent 20 seconds in production.',
          'Conducted a comparative analysis of diﬀerent AI approaches, including fine-tuned models using Cohere, prompt engineering using prompt lab, reinforcement learning using guardrails and Agentic Workflows using AI Agent Studio. Implemented the most eﬀective context-specific approach to develop AI-assisted features.',
          'Built a Chrome extension for AI prompt testing with API selection, CSV-based input, hyperparameters adjustment and post-processing, featuring AI analysis of the current prompt and a reinforcement learning based prompt optimizer.',
          'Created a modular string-matching algorithm leveraging Levenshtein distance, adaptable to diverse use cases.'
        ]
      }
    ]
  },
  {
    id: 'projects',
    label: 'Technical Projects',
    items: [
      {
        title: 'GFA EquiShift (Winner of UKFinnovator Hackathon 2026)',
        link: 'https://github.com/Harsh-159/GFA-EquiShift',
        iconType: 'award',
        details: [
          'AI-Driven Portfolio Intelligence: Leverages Gemini 1.5 Flash to provide real-time strategic advice, identifying concentration risks and generating proactive "Keep, Reallocate, or Hedge" investment memos.',
          'Tokenized Secondary Marketplace: Revolutionizes lending liquidity by tokenizing SME assets, enabling instant, transparent transactions via smart contracts and automated bid-ask price discovery.',
          'Scalable Financial Inclusion: Bridges the gap for underserved demographics by utilizing anonymized data and proprietary GFA Scores to eliminate lending exclusion through efficient capital reallocation.',
          'Real-Time Performance Benchmarking: Features an interactive dashboard built with React 19 and Recharts to track ESG impact, sector growth, and regional distribution against global financial mandates.'
        ]
      },
      {
        title: 'Automated AI DeFi Trading System',
        link: 'https://github.com/Harsh-159/Automated-AI-Powered-DeFi-Trading-System',
        details: [
          'Developed an automated AI trading system that optimizes portfolio management by analysing on-chain data, whale activity, market sentiment, and government policies using Perplexity AI Sonar Pro and DEX Screener API.',
          'Crash Detector that monitors portfolio every 15 minutes and triggers trading workflow upon detecting sharp drops.',
          'AI-driven weekly performance report generator, analysing trade history and emailing generated PDF report.'
        ]
      },
      {
        title: 'Other Projects',
        link: 'https://linktr.ee/harshyadav01',
        details: [
          'Social Network for Trip Planning (Aug 2022 - Sep 2022): Built a Flask based social trip planning platform enabling users to create, discover, and join trips.',
          'Global COVID-19 Choropleth: A data visualization tool that performs automated web-scraping of global health statistics to generate interactive, color-coded geographical maps.',
          'Real-Time Stock Simulator: A full-stack web application integrating live market APIs to simulate high-frequency trading environments and portfolio management.',
          'And more...'
        ]
      }
    ]
  },
  {
    id: 'extracurriculars',
    label: 'Extracurriculars',
    items: [
      {
        title: 'All Things AI',
        subtitle: 'University of Birmingham',
        details: [
          'Founder and Chair of the student society.'
        ]
      },
      {
        title: 'Sports Achievements',
        subtitle: 'Swimming & Taekwondo',
        iconType: 'sport',
        details: [
          'Multiple medals in swimming and taekwondo competitions.'
        ]
      }
    ]
  },
  {
    id: 'me',
    label: 'About Me',
    items: [
      {
        title: 'Harsh Yadav',
        subtitle: 'Student',
        // REPLACE THE URL BELOW WITH YOUR ACTUAL IMAGE URL
        //image: 'https://ui-avatars.com/api/?name=Harsh+Yadav&background=bef264&color=0f172a&size=512&font-size=0.3', 
        image:'/my_screenshot.png',
        details: [
          'This is me, someone who believe the most exciting space in technology right now isn’t just where AI exists, but where it meets human creativity to build things that were previously impossible.'
        ]
      },
      {
        title: 'LinkedIn',
        link: 'https://www.linkedin.com/in/harsh-yadav-01/',
        iconType: 'linkedin',
        details: ['Connect professionally.']
      },
      {
        title: 'Email',
        link: 'mailto:harshyadavhappy@gmail.com',
        iconType: 'email',
        details: ['harshyadavhappy@gmail.com']
      }
    ]
  }
];

export const ICONS = {
  education: GraduationCap,
  work: Briefcase,
  projects: Code,
  extracurriculars: Award,
  me: Brain
};
