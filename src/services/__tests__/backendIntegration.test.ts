/**
 * Backend Integration Fix - Verification Tests
 * Task 1 (Bug Condition Exploration) + Task 2 (Preservation) combined
 *
 * These tests verify:
 * 1. Backend services ARE integrated into UI components (bug is fixed)
 * 2. Existing features and UI structure remain unchanged (no regressions)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../../..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf-8');

// ─── Property 1: Bug Condition → Expected Behavior ───────────────────────────
describe('Property 1: Backend Services Integrated (Bug Fixed)', () => {
  describe('Forum.tsx', () => {
    const src = read('src/components/Forum.tsx');

    it('imports advancedForumService', () => {
      expect(src).toMatch(/import.*advancedForumService.*from/);
    });

    it('imports aiModerationService', () => {
      expect(src).toMatch(/import.*aiModerationService.*from/);
    });

    it('imports ForumDashboard', () => {
      expect(src).toMatch(/import.*ForumDashboard.*from/);
    });

    it('calls advancedForumService.createPost()', () => {
      expect(src).toMatch(/advancedForumService\.createPost\(/);
    });

    it('calls aiModerationService.analyzeContent()', () => {
      expect(src).toMatch(/aiModerationService\.analyzeContent\(/);
    });

    it('renders ForumDashboard component', () => {
      expect(src).toMatch(/<ForumDashboard/);
    });

    it('has showDashboard state', () => {
      expect(src).toMatch(/showDashboard/);
    });
  });

  describe('DirectMessages.tsx', () => {
    const src = read('src/components/DirectMessages.tsx');

    it('imports advancedDMService', () => {
      expect(src).toMatch(/import.*advancedDMService.*from/);
    });

    it('imports aiModerationService', () => {
      expect(src).toMatch(/import.*aiModerationService.*from/);
    });

    it('imports AdvancedDMPanel', () => {
      expect(src).toMatch(/import.*AdvancedDMPanel.*from/);
    });

    it('calls advancedDMService.sendMessage()', () => {
      expect(src).toMatch(/advancedDMService\.sendMessage\(/);
    });

    it('calls aiModerationService.analyzeContent()', () => {
      expect(src).toMatch(/aiModerationService\.analyzeContent\(/);
    });

    it('renders AdvancedDMPanel component', () => {
      expect(src).toMatch(/<AdvancedDMPanel/);
    });

    it('has showAdvancedPanel state', () => {
      expect(src).toMatch(/showAdvancedPanel/);
    });

    it('has smart replies state', () => {
      expect(src).toMatch(/smartReplies/);
    });

    it('has voice recording state', () => {
      expect(src).toMatch(/isRecordingVoice/);
    });
  });

  describe('LiveSection.tsx', () => {
    const src = read('src/components/LiveSection.tsx');

    it('imports advancedStreamingService', () => {
      expect(src).toMatch(/import.*advancedStreamingService.*from/);
    });

    it('imports aiModerationService', () => {
      expect(src).toMatch(/import.*aiModerationService.*from/);
    });

    it('imports StreamingDashboard', () => {
      expect(src).toMatch(/import.*StreamingDashboard.*from/);
    });

    it('calls advancedStreamingService.createStream()', () => {
      expect(src).toMatch(/advancedStreamingService\.createStream\(/);
    });

    it('calls advancedStreamingService.startStream()', () => {
      expect(src).toMatch(/advancedStreamingService\.startStream\(/);
    });

    it('calls advancedStreamingService.endStream()', () => {
      expect(src).toMatch(/advancedStreamingService\.endStream\(/);
    });

    it('calls advancedStreamingService.generateAutoHighlights()', () => {
      expect(src).toMatch(/advancedStreamingService\.generateAutoHighlights\(/);
    });

    it('renders StreamingDashboard component', () => {
      expect(src).toMatch(/<StreamingDashboard/);
    });
  });
});

// ─── Property 2: Preservation — Existing Features Unchanged ──────────────────
describe('Property 2: Preservation — Existing Features Unchanged', () => {
  describe('Forum.tsx — existing Firebase operations preserved', () => {
    const src = read('src/components/Forum.tsx');

    it('still uses Firebase push for posts', () => {
      expect(src).toMatch(/push\(ref\(db.*forum/);
    });

    it('still uses Firebase onValue for posts', () => {
      // onValue is called with a ref variable, not inline string
      expect(src).toMatch(/onValue\(/);
      expect(src).toMatch(/ref\(db,'forum'\)/);
    });

    it('still has like/dislike functionality', () => {
      expect(src).toMatch(/likePost|handleLike/);
    });

    it('still has comment functionality', () => {
      expect(src).toMatch(/addComment|forum_comments/);
    });
  });

  describe('DirectMessages.tsx — existing Firebase operations preserved', () => {
    const src = read('src/components/DirectMessages.tsx');

    it('still uses Firebase push for messages', () => {
      expect(src).toMatch(/push\(ref\(db.*dm/);
    });

    it('still uses Firebase onValue for messages', () => {
      expect(src).toMatch(/onValue\(.*dm/);
    });

    it('still has voice/video call buttons', () => {
      expect(src).toMatch(/onStartCall/);
    });

    it('still has file upload functionality', () => {
      expect(src).toMatch(/handleFileUpload|fileInputRef/);
    });
  });

  describe('LiveSection.tsx — existing Firebase operations preserved', () => {
    const src = read('src/components/LiveSection.tsx');

    it('still uses Firebase for stream data', () => {
      expect(src).toMatch(/ref\(db/);
    });

    it('still has stream start/stop functionality', () => {
      expect(src).toMatch(/handleWizardStart|handleStopStream/);
    });
  });

  describe('App.tsx — no new routes added', () => {
    const src = read('src/App.tsx');

    it('does not add /forum-dashboard route', () => {
      expect(src).not.toMatch(/path.*forum-dashboard/);
    });

    it('does not add /advanced-dm route', () => {
      expect(src).not.toMatch(/path.*advanced-dm/);
    });

    it('does not add /streaming-dashboard route', () => {
      expect(src).not.toMatch(/path.*streaming-dashboard/);
    });
  });
});
