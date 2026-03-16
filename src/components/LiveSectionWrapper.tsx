import React, { useState, useEffect } from 'react';
import SimulatedLiveSection from './SimulatedLiveSection';
import EnhancedLiveSection from './EnhancedLiveSection';

const LiveSectionWrapper = ({ theme }: { theme: any }) => {
  const [useSimulated, setUseSimulated] = useState(false);

  useEffect(() => {
    // Check if camera/microphone permissions are available
    const checkPermissions = async () => {
      try {
        // Try to get media permissions
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setUseSimulated(false);
      } catch (error: any) {
        console.log('Camera/mic permission denied, using simulated stream');
        setUseSimulated(true);
      }
    };

    checkPermissions();
  }, []);

  return (
    <div className="relative">
      {/* Toggle Button */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={() => setUseSimulated(!useSimulated)}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            useSimulated 
              ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-300' 
              : 'bg-green-500/20 border border-green-500/30 text-green-300'
          }`}
        >
          {useSimulated ? '🎥 Simüle Modu' : '📹 Gerçek Yayın'}
        </button>
      </div>

      {/* Render appropriate component */}
      {useSimulated ? (
        <SimulatedLiveSection theme={theme} />
      ) : (
        <EnhancedLiveSection theme={theme} />
      )}
    </div>
  );
};

export default LiveSectionWrapper;
