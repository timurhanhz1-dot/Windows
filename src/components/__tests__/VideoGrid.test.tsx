/**
 * VideoGrid Test Suite
 * Tests for video grid layout calculations and responsive behavior
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import VideoGrid from '../VideoGrid';
import { VideoParticipant } from '../../types/videoConference';

// Mock motion/react
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

const mockParticipants: VideoParticipant[] = [
  {
    userId: 'user1',
    username: 'Test User 1',
    joinedAt: Date.now(),
    isCameraOn: true,
    isMicOn: true,
    isScreenSharing: false,
    connectionQuality: 'good',
    latency: 50,
    transcriptionEnabled: false,
    isSpeaking: false
  },
  {
    userId: 'user2', 
    username: 'Test User 2',
    joinedAt: Date.now() + 1000,
    isCameraOn: false,
    isMicOn: true,
    isScreenSharing: false,
    connectionQuality: 'excellent',
    latency: 30,
    transcriptionEnabled: false,
    isSpeaking: true
  }
];

describe('VideoGrid', () => {
  it('renders without crashing', () => {
    render(
      <VideoGrid
        participants={mockParticipants}
        localUserId="user1"
      />
    );
    
    expect(screen.getByText('Test User 1')).toBeInTheDocument();
    expect(screen.getByText('Test User 2')).toBeInTheDocument();
  });

  it('shows local user as "Sen"', () => {
    render(
      <VideoGrid
        participants={mockParticipants}
        localUserId="user1"
      />
    );
    
    expect(screen.getByText('Sen')).toBeInTheDocument();
  });
});