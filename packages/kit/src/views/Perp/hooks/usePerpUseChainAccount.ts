import { useActiveAccount } from '../../../states/jotai/contexts/accountSelector';
import { usePerpsCurrentAccountAtom } from '../../../states/jotai/contexts/hyperliquid/atoms';

export function usePerpUseChainAccount() {
  const [currentAccount] = usePerpsCurrentAccountAtom();
  const { activeAccount } = useActiveAccount({ num: 0 });

  return {
    userAddress: currentAccount?.evmAddress,
    userAccountId: currentAccount?.accountId,
    activeAccountId: activeAccount?.account?.id,
    activeAccountIndexedId: activeAccount?.indexedAccount?.id,
  };
}
