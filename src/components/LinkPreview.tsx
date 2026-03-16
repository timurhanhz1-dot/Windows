import React, { useState, useEffect } from 'react';

function getEmbedInfo(url: string): { type: string; embedUrl: string; title: string } | null {
  try {
    const u = new URL(url);
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return {
      type: 'youtube', title: 'YouTube Video',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0`
    };
    // Spotify
    const spMatch = url.match(/spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/);
    if (spMatch) return {
      type: 'spotify', title: 'Spotify',
      embedUrl: `https://open.spotify.com/embed/${spMatch[1]}/${spMatch[2]}?utm_source=generator`
    };
    // SoundCloud
    if (u.hostname.includes('soundcloud.com')) return {
      type: 'soundcloud', title: 'SoundCloud',
      embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%2310b981&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false`
    };
  } catch {}
  return null;
}

export function LinkPreview({ content }: { content: string }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = content.match(urlRegex) || [];

  const embeds = urls.map(url => ({ url, info: getEmbedInfo(url) })).filter(e => e.info);
  if (embeds.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      {embeds.map(({ url, info }) => {
        if (!info) return null;
        if (info.type === 'youtube') return (
          <div key={url} className="rounded-xl overflow-hidden border border-white/10" style={{ maxWidth: 480 }}>
            <iframe src={info.embedUrl} width="100%" height="270"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen className="block" />
          </div>
        );
        if (info.type === 'spotify') return (
          <div key={url} className="rounded-xl overflow-hidden border border-white/10" style={{ maxWidth: 480 }}>
            <iframe src={info.embedUrl} width="100%" height="152"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy" className="block" />
          </div>
        );
        if (info.type === 'soundcloud') return (
          <div key={url} className="rounded-xl overflow-hidden border border-white/10" style={{ maxWidth: 480 }}>
            <iframe src={info.embedUrl} width="100%" height="120" scrolling="no"
              allow="autoplay" className="block" />
          </div>
        );
        return null;
      })}
    </div>
  );
}
