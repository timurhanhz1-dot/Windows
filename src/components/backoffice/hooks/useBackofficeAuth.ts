import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, db } from '../../../firebase';
import { BackofficeRole, isValidBackofficeRole } from '../types/backoffice.types';

export interface BackofficeAuthState {
  uid: string | null;
  displayName: string | null;
  role: BackofficeRole | null;
  isLoading: boolean;
  isAuthorized: boolean;
}

async function fetchRole(uid: string): Promise<BackofficeRole | null> {
  try {
    const snap = await get(ref(db, `users/${uid}/backoffice_role`));
    const role = snap.val();
    console.log('[BackofficeAuth] role fetched:', role);
    return isValidBackofficeRole(role) ? role : null;
  } catch (e) {
    console.error('[BackofficeAuth] role fetch error:', e);
    return null;
  }
}

export function useBackofficeAuth(): BackofficeAuthState {
  // Sync check: if Firebase already has a current user, start with loading=true but skip null state
  const currentUser = auth.currentUser;
  const [state, setState] = useState<BackofficeAuthState>({
    uid: currentUser?.uid ?? null,
    displayName: currentUser?.displayName || currentUser?.email?.split('@')[0] || currentUser?.uid || null,
    role: null,
    isLoading: true,
    isAuthorized: false,
  });

  useEffect(() => {
    // If we already have a current user, fetch role immediately without waiting for onAuthStateChanged
    if (auth.currentUser) {
      const user = auth.currentUser;
      console.log('[BackofficeAuth] currentUser sync:', user.uid);
      fetchRole(user.uid).then(role => {
        setState({
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || user.uid,
          role,
          isLoading: false,
          isAuthorized: role !== null,
        });
      });
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      console.log('[BackofficeAuth] onAuthStateChanged:', user?.uid || 'null');
      if (!user) {
        setState({ uid: null, displayName: null, role: null, isLoading: false, isAuthorized: false });
        return;
      }
      const role = await fetchRole(user.uid);
      setState({
        uid: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || user.uid,
        role,
        isLoading: false,
        isAuthorized: role !== null,
      });
    });
    return unsub;
  }, []);

  return state;
}
