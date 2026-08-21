import { useAccountStore } from '../../store/accountStore';

export function useAccountMode(accountId?: string) {
  const { accounts } = useAccountStore();
  const account = accountId
    ? accounts.find((a) => a.accountId === accountId)
    : accounts[0]; // primary account

  const isAutomated = account?.subscriptionMode === 'automated_trading';
  const hasAutomatedAccount = accounts.some(
    (a) => a.subscriptionMode === 'automated_trading'
  );

  return { isAutomated, hasAutomatedAccount, account };
}
