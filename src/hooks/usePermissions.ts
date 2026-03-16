import { useState, useEffect, useCallback } from 'react';

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'idle' | 'error';

interface PermissionStatus {
  camera: PermissionState;
  microphone: PermissionState;
  devices: MediaDeviceInfo[];
  isLoading: boolean;
  error: string | null;
}

export const usePermissions = () => {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>({
    camera: 'idle',
    microphone: 'idle',
    devices: [],
    isLoading: false,
    error: null
  });

  const checkDeviceAvailability = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some(device => device.kind === 'videoinput');
      const hasMicrophone = devices.some(device => device.kind === 'audioinput');
      
      if (!hasCamera || !hasMicrophone) {
        setPermissionStatus(prev => ({
          ...prev,
          error: !hasCamera ? 'Kamera bulunamadı' : 'Mikrofon bulunamadı',
          isLoading: false
        }));
        return false;
      }
      
      setPermissionStatus(prev => ({
        ...prev,
        devices,
        error: null
      }));
      return true;
    } catch (error) {
      setPermissionStatus(prev => ({
        ...prev,
        error: 'Cihazlar kontrol edilemedi: ' + (error as Error).message,
        isLoading: false
      }));
      return false;
    }
  }, []);

  const checkPermissions = useCallback(async () => {
    try {
      setPermissionStatus(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Check device availability first
      const devicesAvailable = await checkDeviceAvailability();
      if (!devicesAvailable) return;

      // Check camera permission
      let cameraPermission: PermissionState = 'prompt';
      let microphonePermission: PermissionState = 'prompt';

      try {
        const cameraResult = await navigator.permissions.query({ name: 'camera' as PermissionName });
        cameraPermission = cameraResult.state as PermissionState;
      } catch (e) {
        // Some browsers don't support permission query for camera
        console.log('Camera permission query not supported');
      }

      try {
        const micResult = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        microphonePermission = micResult.state as PermissionState;
      } catch (e) {
        // Some browsers don't support permission query for microphone
        console.log('Microphone permission query not supported');
      }

      // Try to get media stream to verify permissions
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        // If we get here, permissions are granted
        cameraPermission = 'granted';
        microphonePermission = 'granted';
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
      } catch (error: any) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          cameraPermission = 'denied';
          microphonePermission = 'denied';
        } else if (error.name === 'NotFoundError') {
          setPermissionStatus(prev => ({
            ...prev,
            error: 'Kamera veya mikrofon bulunamadı',
            isLoading: false
          }));
          return;
        } else if (error.name === 'NotReadableError') {
          setPermissionStatus(prev => ({
            ...prev,
            error: 'Kamera veya mikrofon başka bir uygulama tarafından kullanılıyor',
            isLoading: false
          }));
          return;
        } else {
          setPermissionStatus(prev => ({
            ...prev,
            error: 'Bilinmeyen hata: ' + error.message,
            isLoading: false
          }));
          return;
        }
      }

      setPermissionStatus(prev => ({
        ...prev,
        camera: cameraPermission,
        microphone: microphonePermission,
        isLoading: false
      }));

    } catch (error) {
      setPermissionStatus(prev => ({
        ...prev,
        error: 'İzinler kontrol edilemedi: ' + (error as Error).message,
        isLoading: false
      }));
    }
  }, [checkDeviceAvailability]);

  const requestPermissions = useCallback(async () => {
    try {
      setPermissionStatus(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Check device availability first
      const devicesAvailable = await checkDeviceAvailability();
      if (!devicesAvailable) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Stop the stream immediately after getting permissions
      stream.getTracks().forEach(track => track.stop());

      setPermissionStatus(prev => ({
        ...prev,
        camera: 'granted',
        microphone: 'granted',
        isLoading: false,
        error: null
      }));

      return true;
    } catch (error: any) {
      let errorMessage = 'İzin alınamadı';
      let cameraState: PermissionState = 'denied';
      let microphoneState: PermissionState = 'denied';

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Kamera ve mikrofon izni reddedildi. Tarayıcı ayarlarından izin vermeniz gerekiyor.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Kamera veya mikrofon bulunamadı.';
        cameraState = 'error';
        microphoneState = 'error';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Kamera veya mikrofon başka bir uygulama tarafından kullanılıyor.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Cihaz gereksinimleri karşılamıyor.';
      } else if (error.name === 'TypeError') {
        errorMessage = 'MediaDevices API desteklenmiyor.';
      }

      setPermissionStatus(prev => ({
        ...prev,
        camera: cameraState,
        microphone: microphoneState,
        isLoading: false,
        error: errorMessage
      }));

      return false;
    }
  }, [checkDeviceAvailability]);

  const resetPermissions = useCallback(() => {
    setPermissionStatus({
      camera: 'idle',
      microphone: 'idle',
      devices: [],
      isLoading: false,
      error: null
    });
  }, []);

  useEffect(() => {
    // Initial check
    checkPermissions();
  }, [checkPermissions]);

  return {
    ...permissionStatus,
    checkPermissions,
    requestPermissions,
    resetPermissions,
    isGranted: permissionStatus.camera === 'granted' && permissionStatus.microphone === 'granted',
    isDenied: permissionStatus.camera === 'denied' || permissionStatus.microphone === 'denied',
    hasError: !!permissionStatus.error
  };
};
