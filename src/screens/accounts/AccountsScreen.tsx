import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAccountStore } from '../../store/accountStore';
import { accountService } from '../../services/accountService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../../theme';
import type { ConnectedAccount } from '../../store/accountStore';
import type { SupportedBroker, ConnectAccountPayload, DerivAccount } from '../../services/accountService';

const BROKERS: { label: string; value: SupportedBroker; icon: string }[] = [
  { label: 'Deriv', value: 'deriv', icon: 'trending-up' },
  { label: 'MetaTrader 5', value: 'mt5', icon: 'bar-chart' },
  { label: 'Oanda', value: 'oanda', icon: 'stats-chart' },
];

function statusColor(status: ConnectedAccount['status']): string {
  switch (status) {
    case 'active': return COLORS.active;
    case 'error': return COLORS.error;
    case 'circuit_breaker_active': return COLORS.warning;
    default: return COLORS.inactive;
  }
}

function statusLabel(status: ConnectedAccount['status']): string {
  switch (status) {
    case 'active': return 'Active';
    case 'inactive': return 'Inactive';
    case 'error': return 'Error';
    case 'circuit_breaker_active': return 'Circuit Breaker';
    default: return status;
  }
}

function modeLabel(mode: ConnectedAccount['subscriptionMode']): string {
  return mode === 'signal_delivery' ? 'Signal Delivery' : 'Automated Trading';
}

interface AccountCardProps {
  item: ConnectedAccount;
  index: number;
  onDelete: (account: ConnectedAccount) => void;
}

const AccountCard: React.FC<AccountCardProps> = ({ item, index, onDelete }) => {
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(20);

  useEffect(() => {
    fadeAnim.value = withDelay(index * 100, withTiming(1, { duration: 400 }));
    slideAnim.value = withDelay(index * 100, withSpring(0, { damping: 14 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }],
  }));

  const isAutomated = item.subscriptionMode === 'automated_trading';
  const color = statusColor(item.status);

  return (
    <Animated.View style={[styles.accountCard, animStyle]}>
      <LinearGradient
        colors={[COLORS.bgCardElevated, COLORS.bgCard]}
        style={styles.accountCardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {/* Status bar */}
        <View style={[styles.statusBar, { backgroundColor: color }]} />

        <View style={styles.accountContent}>
          <View style={styles.accountHeader}>
            <View>
              <Text style={styles.brokerName}>{item.broker.toUpperCase()}</Text>
              <Text style={styles.balanceText}>
                {item.balance} {item.currency}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <View style={[styles.statusBadge, { borderColor: color, backgroundColor: `${color}22` }]}>
                <View style={[styles.statusDot, { backgroundColor: color }]} />
                <Text style={[styles.statusLabel, { color }]}>{statusLabel(item.status)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.modeBadgeRow}>
            <View style={[styles.modeBadge, isAutomated ? styles.modeBadgeAuto : styles.modeBadgeSignal]}>
              <Ionicons
                name={isAutomated ? 'hardware-chip-outline' : 'radio-outline'}
                size={12}
                color={isAutomated ? COLORS.primary : COLORS.info}
              />
              <Text style={[styles.modeBadgeText, { color: isAutomated ? COLORS.primary : COLORS.info }]}>
                {' '}{modeLabel(item.subscriptionMode)}
              </Text>
            </View>
          </View>

          <Pressable
            style={styles.deleteButton}
            onPress={() => onDelete(item)}
            accessibilityRole="button"
            accessibilityLabel={`Disconnect ${item.broker.toUpperCase()} account`}
            accessibilityHint="Disconnects this broker account and stops all signals and trades"
          >
            <Ionicons name="unlink-outline" size={14} color={COLORS.error} />
            <Text style={styles.deleteButtonText}> Disconnect</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

export const AccountsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { accounts, setAccounts, addAccount, removeAccount, isLoading, setLoading, setError, error } =
    useAccountStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<SupportedBroker>('deriv');

  // Step 1 — credentials
  const [pat, setPat] = useState('');
  const [mt5Login, setMt5Login] = useState('');
  const [mt5Password, setMt5Password] = useState('');
  const [mt5Server, setMt5Server] = useState('');

  // Step 2 — Deriv account picker
  const [derivAccounts, setDerivAccounts] = useState<DerivAccount[]>([]);
  const [selectedDerivAccountId, setSelectedDerivAccountId] = useState<string | null>(null);
  const [step, setStep] = useState<'credentials' | 'pick-account'>('credentials');

  const [connectError, setConnectError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFetchingAccounts, setIsFetchingAccounts] = useState(false);

  const resetModal = () => {
    setStep('credentials');
    setPat('');
    setMt5Login('');
    setMt5Password('');
    setMt5Server('');
    setDerivAccounts([]);
    setSelectedDerivAccountId(null);
    setConnectError(null);
    setIsConnecting(false);
    setIsFetchingAccounts(false);
  };

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await accountService.getAccounts();
      setAccounts(data);
    } catch {
      setError('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, [setAccounts, setError, setLoading]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  // Step 1 → Step 2: fetch Deriv accounts for the entered PAT
  const handleFetchDerivAccounts = useCallback(async () => {
    setConnectError(null);
    if (!pat.trim()) {
      setConnectError('API Token is required');
      return;
    }
    setIsFetchingAccounts(true);
    try {
      const fetched = await accountService.listDerivAccounts(pat.trim());
      if (fetched.length === 0) {
        setConnectError('No Options trading accounts found. Create one at app.deriv.com first.');
        return;
      }
      setDerivAccounts(fetched);
      // Auto-select first active real account
      const real = fetched.find(a => a.accountType === 'real' && a.status === 'active');
      setSelectedDerivAccountId(real?.accountId ?? fetched[0]?.accountId ?? null);
      setStep('pick-account');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setConnectError(err.message);
      } else {
        setConnectError('Failed to fetch accounts. Check your API token.');
      }
    } finally {
      setIsFetchingAccounts(false);
    }
  }, [pat]);

  // Final connect: send credentials + chosen derivAccountId to backend
  const handleConnect = useCallback(async () => {
    setConnectError(null);
    setIsConnecting(true);
    try {
      let payload: ConnectAccountPayload;

      if (selectedBroker === 'deriv') {
        if (!selectedDerivAccountId) {
          setConnectError('Please select a trading account');
          setIsConnecting(false);
          return;
        }
        payload = {
          broker: 'deriv',
          credentials: {
            login:          pat.trim(),
            password:       '',
            derivAccountId: selectedDerivAccountId,
          },
        };
      } else {
        if (!mt5Login.trim() || !mt5Password.trim()) {
          setConnectError('Login and password are required');
          setIsConnecting(false);
          return;
        }
        payload = {
          broker: selectedBroker,
          credentials: {
            login:    mt5Login.trim(),
            password: mt5Password.trim(),
            server:   mt5Server.trim(),
          },
        };
      }

      const account = await accountService.connectAccount(payload);
      addAccount(account);
      setModalVisible(false);
      resetModal();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setConnectError(err.message);
      } else {
        setConnectError('Failed to connect account');
      }
    } finally {
      setIsConnecting(false);
    }
  }, [selectedBroker, pat, selectedDerivAccountId, mt5Login, mt5Password, mt5Server, addAccount]);

  const handleDelete = useCallback(
    (account: ConnectedAccount) => {
      Alert.alert(
        'Disconnect Account',
        `Disconnect ${account.broker.toUpperCase()} account? This stops all signals and trades.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disconnect',
            style: 'destructive',
            onPress: async () => {
              try {
                await accountService.disconnectAccount(account.accountId);
                removeAccount(account.accountId);
              } catch {
                Alert.alert('Error', 'Failed to disconnect account');
              }
            },
          },
        ]
      );
    },
    [removeAccount]
  );

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.screenTitle}>Accounts</Text>
        <Pressable style={styles.addButton} onPress={() => { resetModal(); setModalVisible(true); }}
          accessibilityRole="button"
          accessibilityLabel="Connect broker account"
          accessibilityHint="Opens the broker account connection form"
        >
          <LinearGradient colors={COLORS.gradientBuy} style={styles.addButtonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Connect</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {error && !isLoading && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!isLoading && accounts.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="wallet-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No Connected Accounts</Text>
          <Text style={styles.emptySubtitle}>
            Connect a broker account to start receiving signals and trading.
          </Text>
        </View>
      )}

      <FlatList
        data={accounts}
        keyExtractor={(item) => item.accountId}
        renderItem={({ item, index }) => (
          <AccountCard item={item} index={index} onDelete={handleDelete} />
        )}
        contentContainerStyle={styles.listContent}
        onRefresh={loadAccounts}
        refreshing={isLoading}
      />

      {/* Connect Account Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => { setModalVisible(false); resetModal(); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />

            {/* Step indicator for Deriv */}
            {selectedBroker === 'deriv' && (
              <View style={styles.stepRow}>
                <View style={[styles.stepDot, step === 'credentials' && styles.stepDotActive]} />
                <View style={styles.stepLine} />
                <View style={[styles.stepDot, step === 'pick-account' && styles.stepDotActive]} />
              </View>
            )}

            <Text style={styles.modalTitle}>
              {step === 'pick-account' ? 'Select Trading Account' : 'Connect Broker'}
            </Text>

            {connectError && (
              <View style={styles.connectError}>
                <Ionicons name="alert-circle" size={15} color={COLORS.error} />
                <Text style={styles.connectErrorText}> {connectError}</Text>
              </View>
            )}

            {/* ── Step 1: Credentials ── */}
            {step === 'credentials' && (
              <>
                <Text style={styles.inputLabel}>Select Broker</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.brokerSelector}>
                  {BROKERS.map((b) => (
                    <Pressable
                      key={b.value}
                      style={[styles.brokerOption, selectedBroker === b.value && styles.brokerOptionSelected]}
                      onPress={() => { setSelectedBroker(b.value); setConnectError(null); }}
                      accessibilityRole="tab"
                      accessibilityLabel={`Select ${b.label} broker`}
                      accessibilityState={{ selected: selectedBroker === b.value }}
                    >
                      <Ionicons
                        name={b.icon as any}
                        size={16}
                        color={selectedBroker === b.value ? COLORS.primary : COLORS.textSecondary}
                      />
                      <Text style={[styles.brokerOptionText, selectedBroker === b.value && styles.brokerOptionTextSelected]}>
                        {' '}{b.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                {selectedBroker === 'deriv' ? (
                  <>
                    <Text style={styles.inputLabel}>Deriv API Token (PAT)</Text>
                    <TextInput
                      style={styles.input}
                      value={pat}
                      onChangeText={setPat}
                      placeholder="Paste your Deriv API token here"
                      placeholderTextColor={COLORS.textMuted}
                      autoCapitalize="none"
                      secureTextEntry
                      accessibilityLabel="Deriv API token"
                    />
                    <Text style={styles.hintText}>
                      Get your token at app.deriv.com → Account Settings → API Token.{'\n'}
                      Enable Read + Trade scopes.
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.inputLabel}>Login Number</Text>
                    <TextInput
                      style={styles.input}
                      value={mt5Login}
                      onChangeText={setMt5Login}
                      placeholder="e.g. 12345678"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="numeric"
                      accessibilityLabel="MT5 login number"
                    />
                    <Text style={styles.inputLabel}>Password</Text>
                    <TextInput
                      style={styles.input}
                      value={mt5Password}
                      onChangeText={setMt5Password}
                      placeholder="Trading account password"
                      placeholderTextColor={COLORS.textMuted}
                      secureTextEntry
                      accessibilityLabel="MT5 account password"
                    />
                    <Text style={styles.inputLabel}>Server</Text>
                    <TextInput
                      style={styles.input}
                      value={mt5Server}
                      onChangeText={setMt5Server}
                      placeholder="e.g. Deriv-Server"
                      placeholderTextColor={COLORS.textMuted}
                      autoCapitalize="none"
                      accessibilityLabel="MT5 server address"
                    />
                  </>
                )}

                <View style={styles.modalActions}>
                  <Pressable
                    style={styles.cancelButton}
                    onPress={() => { setModalVisible(false); resetModal(); }}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel"
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.connectButton, isFetchingAccounts && styles.buttonDisabled]}
                    onPress={selectedBroker === 'deriv' ? handleFetchDerivAccounts : handleConnect}
                    disabled={isFetchingAccounts || isConnecting}
                    accessibilityRole="button"
                    accessibilityLabel={selectedBroker === 'deriv' ? 'Next step' : 'Connect account'}
                    accessibilityState={{ disabled: isFetchingAccounts || isConnecting }}
                  >
                    {isFetchingAccounts || isConnecting ? (
                      <ActivityIndicator color="#FFFFFF" style={{ paddingVertical: 14 }} />
                    ) : (
                      <LinearGradient colors={COLORS.gradientBuy} style={styles.connectGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                        <Text style={styles.connectButtonText}>
                          {selectedBroker === 'deriv' ? 'Next →' : 'Connect'}
                        </Text>
                      </LinearGradient>
                    )}
                  </Pressable>
                </View>
              </>
            )}

            {/* ── Step 2: Deriv account picker ── */}
            {step === 'pick-account' && (
              <>
                <Text style={styles.hintText}>
                  Select the account you want Slick AI to trade on:
                </Text>
                {derivAccounts.map((acct) => {
                  const isSelected = acct.accountId === selectedDerivAccountId;
                  const isReal = acct.accountType === 'real';
                  return (
                    <Pressable
                      key={acct.accountId}
                      style={[styles.accountOption, isSelected && styles.accountOptionSelected]}
                      onPress={() => setSelectedDerivAccountId(acct.accountId)}
                      accessibilityRole="button"
                      accessibilityLabel={`${isReal ? 'Live' : 'Demo'} account ${acct.accountId}, balance ${acct.balance} ${acct.currency}`}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <View style={styles.accountOptionLeft}>
                        <View style={[styles.accountTypeBadge, isReal ? styles.accountTypeBadgeReal : styles.accountTypeBadgeDemo]}>
                          <Text style={styles.accountTypeBadgeText}>{isReal ? 'LIVE' : 'DEMO'}</Text>
                        </View>
                        <View style={{ marginLeft: 10 }}>
                          <Text style={styles.accountOptionId}>{acct.accountId}</Text>
                          <Text style={styles.accountOptionBalance}>{acct.balance} {acct.currency}</Text>
                        </View>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />}
                    </Pressable>
                  );
                })}

                <View style={styles.modalActions}>
                  <Pressable
                    style={styles.cancelButton}
                    onPress={() => { setStep('credentials'); setConnectError(null); }}
                    accessibilityRole="button"
                    accessibilityLabel="Back to credentials"
                  >
                    <Text style={styles.cancelButtonText}>← Back</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.connectButton, isConnecting && styles.buttonDisabled]}
                    onPress={handleConnect}
                    disabled={isConnecting}
                    accessibilityRole="button"
                    accessibilityLabel="Connect account"
                    accessibilityState={{ disabled: isConnecting }}
                  >
                    {isConnecting ? (
                      <ActivityIndicator color="#FFFFFF" style={{ paddingVertical: 14 }} />
                    ) : (
                      <LinearGradient colors={COLORS.gradientBuy} style={styles.connectGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                        <Text style={styles.connectButtonText}>Connect</Text>
                      </LinearGradient>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: 12,
    paddingBottom: 12,
  },
  screenTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes['3xl'],
    fontWeight: FONTS.weights.extrabold,
  },
  addButton: {
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    marginLeft: 4,
  },
  errorBanner: {
    backgroundColor: 'rgba(255,59,92,0.1)',
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    paddingBottom: 20,
  },
  accountCard: {
    marginHorizontal: SPACING.md,
    marginVertical: 6,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  accountCardGradient: {
    flexDirection: 'row',
  },
  statusBar: {
    width: 4,
  },
  accountContent: {
    flex: 1,
    padding: SPACING.md,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  brokerName: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
  },
  balanceText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
  },
  modeBadgeRow: {
    marginBottom: 12,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  modeBadgeAuto: {
    backgroundColor: COLORS.primaryLight,
  },
  modeBadgeSignal: {
    backgroundColor: 'rgba(10,132,255,0.12)',
  },
  modeBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,59,92,0.4)',
    alignSelf: 'flex-start',
  },
  deleteButtonText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes['2xl'],
    fontWeight: FONTS.weights.bold,
    marginBottom: SPACING.md,
  },
  connectError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,59,92,0.12)',
    borderRadius: RADIUS.sm,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  connectErrorText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.sm,
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginBottom: 6,
    marginTop: 12,
    fontWeight: FONTS.weights.medium,
  },
  input: {
    backgroundColor: COLORS.bgCardElevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  brokerSelector: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  brokerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
    backgroundColor: COLORS.bgCardElevated,
  },
  brokerOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  brokerOptionText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
  },
  brokerOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: FONTS.weights.bold,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.medium,
  },
  connectButton: {
    flex: 1,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  connectGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
  },
  buttonDisabled: {
    opacity: 0.6,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  // Step indicator
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.border,
  },
  stepDotActive: {
    backgroundColor: COLORS.primary,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: 6,
  },
  hintText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    marginTop: 6,
    marginBottom: 4,
    lineHeight: 16,
  },
  // Deriv account picker
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCardElevated,
    padding: 14,
    marginTop: 10,
  },
  accountOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  accountOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountTypeBadge: {
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  accountTypeBadgeReal: {
    backgroundColor: 'rgba(0,200,81,0.18)',
  },
  accountTypeBadgeDemo: {
    backgroundColor: 'rgba(10,132,255,0.14)',
  },
  accountTypeBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  accountOptionId: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
  },
  accountOptionBalance: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
});
