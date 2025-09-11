import { useEffect, useRef } from 'react';

import { noop } from 'lodash';

import { GlobalJotaiReady } from '../../../components/GlobalJotaiReady';
import { useActiveAccount } from '../../../states/jotai/contexts/accountSelector';
import { useHyperliquidActions } from '../../../states/jotai/contexts/hyperliquid';
import { usePerpsCurrentAccountAtom } from '../../../states/jotai/contexts/hyperliquid/atoms';
import { useHyperliquidSession } from '../hooks';

export function PerpsGlobalEffectsView() {
  useHyperliquidSession();

  const { activeAccount } = useActiveAccount({ num: 0 });
  const [currentPerpsAccount] = usePerpsCurrentAccountAtom();
  const actions = useHyperliquidActions();
  const isFirstMountRef = useRef(true);
  useEffect(() => {
    void actions.current.loadPerpsCurrentAccount({
      indexedAccountId: activeAccount?.indexedAccount?.id || null,
      accountId: activeAccount?.account?.id || null,
      deriveType: activeAccount?.deriveType ?? 'default',
    });
  }, [
    actions,
    activeAccount?.account?.id,
    activeAccount?.deriveType,
    activeAccount?.indexedAccount?.id,
  ]);

  useEffect(() => {
    noop(currentPerpsAccount?.evmAddress);

    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      if (currentPerpsAccount?.evmAddress) {
        void actions.current.updateSubscriptions();
      }
    } else {
      void actions.current.updateSubscriptions();
    }
  }, [actions, currentPerpsAccount?.evmAddress]);

  return null;
}

export function PerpsGlobalEffects() {
  return (
    <GlobalJotaiReady>
      <PerpsGlobalEffectsView />
    </GlobalJotaiReady>
  );
}
