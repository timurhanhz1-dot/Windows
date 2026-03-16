import React from 'react';
import { motion } from 'motion/react';
import { ExternalLink } from 'lucide-react';

interface MediaEmbedProps {
  url: string;
  className?: string;
}

// Extract YouTube video ID from various URL formats
const getYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

// Extract Spotify track/playlist/album ID
const getSpotifyId = (url: string): { type: string; id: string } | null => {
  const match = url.match(/spotify\.com\/(track|playlist|album|episode|show)\/([^?&\n]+)/);
  if (match) {
    return { type: match[1], id: match[2] };
  }
  return null;
};

// Extract SoundCloud URL
const isSoundCloud = (url: string): boolean => {
  return url.includes('soundcloud.com/');
};

// Extract Twitch video/channel
const getTwitchId = (url: string): { type: string; id: string } | null => {
  const videoMatch = url.match(/twitch\.tv\/videos\/(\d+)/);
  if (videoMatch) return { type: 'video', id: videoMatch[1] };
  
  const channelMatch = url.match(/twitch\.tv\/([^/?&\n]+)/);
  if (channelMatch && channelMatch[1] !== 'videos') {
    return { type: 'channel', id: channelMatch[1] };
  }
  
  return null;
};

export const MediaEmbed: React.FC<MediaEmbedProps> = ({ url, className = '' }) => {
  // YouTube
  const youtubeId = getYouTubeId(url);
  if (youtubeId) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative rounded-xl overflow-hidden bg-black ${className}`}
      >
        <div className="aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 rounded-lg transition-colors"
        >
          <ExternalLink size={14} className="text-white" />
        </a>
      </motion.div>
    );
  }

  // Spotify
  const spotifyData = getSpotifyId(url);
  if (spotifyData) {
    const height = spotifyData.type === 'track' || spotifyData.type === 'episode' ? '152' : '352';
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative rounded-xl overflow-hidden ${className}`}
      >
        <iframe
          src={`https://open.spotify.com/embed/${spotifyData.type}/${spotifyData.id}`}
          width="100%"
          height={height}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="rounded-xl"
        />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 rounded-lg transition-colors"
        >
          <ExternalLink size={14} className="text-white" />
        </a>
      </motion.div>
    );
  }

  // SoundCloud
  if (isSoundCloud(url)) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative rounded-xl overflow-hidden ${className}`}
      >
        <iframe
          width="100%"
          height="166"
          scrolling="no"
          allow="autoplay"
          src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%2310b981&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`}
          className="rounded-xl"
        />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 rounded-lg transition-colors"
        >
          <ExternalLink size={14} className="text-white" />
        </a>
      </motion.div>
    );
  }

  // Twitch
  const twitchData = getTwitchId(url);
  if (twitchData) {
    const src = twitchData.type === 'video'
      ? `https://player.twitch.tv/?video=${twitchData.id}&parent=${window.location.hostname}`
      : `https://player.twitch.tv/?channel=${twitchData.id}&parent=${window.location.hostname}`;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative rounded-xl overflow-hidden bg-black ${className}`}
      >
        <div className="aspect-video">
          <iframe
            src={src}
            allowFullScreen
            className="w-full h-full"
          />
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 rounded-lg transition-colors"
        >
          <ExternalLink size={14} className="text-white" />
        </a>
      </motion.div>
    );
  }

  // Not a supported media URL, return null
  return null;
};

// Helper function to detect if a URL contains media
export const containsMediaUrl = (text: string): boolean => {
  return !!(
    getYouTubeId(text) ||
    getSpotifyId(text) ||
    isSoundCloud(text) ||
    getTwitchId(text)
  );
};

// Helper function to extract URLs from text
export const extractUrls = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
};
