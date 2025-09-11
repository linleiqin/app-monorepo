import { useCallback, useEffect, useState } from 'react';

import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { useActiveAccount } from '@onekeyhq/kit/src/states/jotai/contexts/accountSelector';
import { useHyperliquidActions } from '@onekeyhq/kit/src/states/jotai/contexts/hyperliquid';
import {
  useAccountPanelDataAtom,
  useActiveAssetCtxAtom,
  useAllMidsAtom,
  useConnectionStateAtom,
  useCurrentTokenAtom,
  useSubscriptionActiveAtom,
} from '@onekeyhq/kit/src/states/jotai/contexts/hyperliquid/atoms';
import { OneKeyLocalError } from '@onekeyhq/shared/src/errors';
import type { IHex } from '@onekeyhq/shared/types/hyperliquid/sdk';

export function useHyperliquidMarket() {
  const [allMids] = useAllMidsAtom();
  const [currentToken] = useCurrentTokenAtom();
  const [activeAssetCtx] = useActiveAssetCtxAtom();
  const [connectionState] = useConnectionStateAtom();

  const currentAssetCtx = activeAssetCtx;

  return {
    allMids,
    currentToken,
    currentAssetCtx,
    isConnected: connectionState.isConnected,
    hasMarketData: !!allMids,
  };
}

export function useHyperliquidAccount() {
  const [accountData] = useAccountPanelDataAtom();

  return accountData;
}

export function useHyperliquidTrading() {
  const { currentUser, selectedAccount, hasUserData } = useHyperliquidAccount();
  // const currentUser = userAddress;
  const { activeAccount } = useActiveAccount({ num: 0 });
  const currentAccount = activeAccount?.account?.id;
  const [loading, setLoading] = useState(false);
  const [canTrade, setCanTrade] = useState(false);

  const checkWalletStatus = useCallback(async () => {
    if (!currentUser) {
      throw new OneKeyLocalError({
        message: 'No user address available',
      });
    }

    return backgroundApiProxy.serviceHyperliquid.checkWalletStatus({
      userAddress: currentUser,
    });
  }, [currentUser]);

  const checkAndApproveWallet = useCallback(async () => {
    try {
      setLoading(true);
      if (!currentAccount) return;
      const { maxBuilderFee, extraAgents } = await checkWalletStatus();
      let needApproveAgent = true;

      const proxyWalletAddress =
        await backgroundApiProxy.serviceHyperliquidWallet.getProxyWalletAddress(
          {
            userAddress: currentUser as IHex,
          },
        );
      if (extraAgents.length > 0) {
        extraAgents.forEach((agent: any) => {
          try {
            const agentObj = agent as { address?: string };
            if (
              agentObj &&
              typeof agentObj === 'object' &&
              'address' in agentObj &&
              typeof agentObj.address === 'string'
            ) {
              const agentAddress = agentObj.address.toLowerCase();
              if (agentAddress === proxyWalletAddress.toLowerCase()) {
                needApproveAgent = false;
              }
            }
          } catch (error) {
            // Ignore invalid agent objects
          }
        });
      }
      if (!maxBuilderFee || needApproveAgent) {
        await backgroundApiProxy.serviceHyperliquid.enableTrading({
          userAccountId: currentAccount,
          userAddress: currentUser as IHex,
          approveAgent: needApproveAgent,
          approveBuilderFee: !maxBuilderFee,
        });
      } else {
        await backgroundApiProxy.serviceHyperliquidExchange.setup({
          userAddress: currentUser as IHex,
          userAccountId: currentAccount,
        });
      }
    } finally {
      setLoading(false);
      setCanTrade(true);
    }
  }, [currentUser, currentAccount, checkWalletStatus]);

  // TODO remove
  useEffect(() => {
    void (async () => {
      if (currentUser && !canTrade) {
        const cachedPassword =
          await backgroundApiProxy.servicePassword.getCachedPassword();
        if (cachedPassword) {
          await checkAndApproveWallet();
        }
      }
    })();
  }, [currentUser, canTrade, checkAndApproveWallet]);

  return {
    loading,
    canTrade: Boolean(canTrade && currentUser),
    currentUser,
    hasUserData,
    checkWalletStatus,
    checkAndApproveWallet,
  };
}

export function useHyperliquidConnectionStatus() {
  const [connectionState] = useConnectionStateAtom();
  const [subscriptionActive] = useSubscriptionActiveAtom();
  const actions = useHyperliquidActions();

  const reconnect = useCallback(() => {
    void actions.current.reconnectSubscriptions();
  }, [actions]);

  return {
    isConnected: connectionState.isConnected,
    isActive: subscriptionActive,
    lastConnected: connectionState.lastConnected,
    reconnectCount: connectionState.reconnectCount,
    reconnect,
  };
}
