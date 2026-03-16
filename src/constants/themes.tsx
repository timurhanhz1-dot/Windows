import React from 'react';
import { Leaf, Wind, Zap, Palette } from 'lucide-react';

export const themes = {
  original: {
    id: 'original',
    name: 'Nature.co (Orijinal)',
    bg: '#0B0E11',
    sidebar: 'linear-gradient(180deg, #0a1a12 0%, #080e0a 50%, #060c08 100%)',
    channelSidebar: '#111418',
    accent: '#10B981',
    accentLight: 'rgba(16, 185, 129, 0.1)',
    accentBorder: 'rgba(16, 185, 129, 0.2)',
    text: '#E3E5E8',
    icon: <Leaf size={20} />,
    glass: false,
    pattern: false
  },
  harmony: {
    id: 'harmony',
    name: 'Harmony (Kusursuz Uyum)',
    bg: 'radial-gradient(circle at 50% 50%, #0B1410 0%, #050505 100%)',
    sidebar: 'linear-gradient(180deg, rgba(16,185,129,0.12) 0%, rgba(10,26,18,0.85) 40%, rgba(6,12,8,0.9) 100%)',
    channelSidebar: 'rgba(17, 20, 24, 0.6)',
    accent: '#10B981',
    accentLight: 'rgba(16, 185, 129, 0.15)',
    accentBorder: 'rgba(16, 185, 129, 0.3)',
    text: '#E3E5E8',
    icon: <Wind size={20} />,
    glass: true,
    pattern: true
  },
  ocean: {
    id: 'ocean',
    name: 'Midnight Ocean',
    bg: '#0A0F14',
    sidebar: '#05070A',
    channelSidebar: '#0D131A',
    accent: '#00D1FF',
    accentLight: 'rgba(0, 209, 255, 0.15)',
    accentBorder: 'rgba(0, 209, 255, 0.3)',
    text: '#E3E5E8',
    icon: <Zap size={20} />,
    glass: false,
    pattern: false
  },
  volcano: {
    id: 'volcano',
    name: 'Volcano Gamer',
    bg: '#120D0D',
    sidebar: '#0A0505',
    channelSidebar: '#1A0F0F',
    accent: '#FF4D4D',
    accentLight: 'rgba(255, 77, 77, 0.15)',
    accentBorder: 'rgba(255, 77, 77, 0.3)',
    text: '#E3E5E8',
    icon: <Zap size={20} />,
    glass: false,
    pattern: false
  },
  nebula: {
    id: 'nebula',
    name: 'Neon Nebula',
    bg: '#0F0B14',
    sidebar: '#07050A',
    channelSidebar: '#150D1A',
    accent: '#BF00FF',
    accentLight: 'rgba(191, 0, 255, 0.15)',
    accentBorder: 'rgba(191, 0, 255, 0.3)',
    text: '#E3E5E8',
    icon: <Palette size={20} />,
    glass: false,
    pattern: false
  }
};

export type ThemeKey = keyof typeof themes;
