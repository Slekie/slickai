import React, { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAccountStore } from '../../store/accountStore';
import { useAuthStore } from '../../store/authStore';
import { accountService } from '../../services/accountService';
import { useAuth } from '../../hooks/useAuth';
import { COLORS, FONTS, RADIUS, SPACING } from '../../theme';
import type { ConnectedAccount, SubscriptionMode } from '../../store/accountStore';

interface SettingRowProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  destructive?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({
  icon,
  label,
  value,
  onPress,
  rightElement,
  destructive,
}) => (
  <Pressable
    style={styles.settingRow}
    onPress={onPress}
    disabled={!onPress && !rightElement}
    accessibilityRole={onPress ? 'button' : 'none'}
    accessibilityLabel={label}
    accessibilityHint={onPress && !rightElement ? `Opens ${label}` : undefined}
  >
    <View style={[styles.settingIcon, destructive && styles.settingIconDestructive]}>
      <Ionicons
        name={icon as any}
        size={18}
        color={destructive ? COLORS.error : COLORS.primary}
      />
    </View>
    <Text style={[styles.settingLabel, destructive && styles.settingLabelDestructive]}>
      {label}
    </Text>
    <View style={styles.settingRight}>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      {rightElement}
      {onPress && !rightElement && (
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      )}
    </View>
  </Pressable>
);

interface ModeConfirmModalProps {
  visible: boolean;
  accountBroker: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ModeConfirmModal: React.FC<ModeConfirmModalProps> = ({
  visible, accountBroker, onConfirm, onCancel,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <View style={styles.modalIconContainer}>
          <Ionicons name="warning" size={32} color={COLORS.warning} />
        </View>
        <Text style={styles.modalTitle}>Enable Automated Trading?</Text>
        <Text style={styles.modalBody}>
          Switching <Text style={styles.modalBrokerName}>{accountBroker.toUpperCase()}</Text> to
          Automated Trading means the Slick AI will execute trades automatically on your behalf.
        </Text>
        <View style={styles.warningBox}>
          <Ionicons name="alert-circle" size={16} color={COLORS.warning} />
          <Text style={styles.warningText}>
            {'  '}Your capital is at risk. Automated trades may result in financial loss. Ensure you
            understand the risks before proceeding.
          </Text>
        </View>
        <View style={styles.modalActions}>
          <Pressable style={styles.cancelButton} onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel automated trading switch"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.confirmButton} onPress={onConfirm}
            accessibilityRole="button"
            accessibilityLabel="Confirm enable automated trading"
            accessibilityHint="Confirms you understand the risks and enables automated trading"
          >
            <Text style={styles.confirmButtonText}>I Understand</Text>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>
);

export const SettingsScreen: React.FC = () => {
  const { accounts, setSubscriptionMode } = useAccountStore();
  const { user } = useAuthStore();
  const { logout } = useAuth();

  const [pendingChange, setPendingChange] = useState<{
    accountId: string;
    broker: string;
    targetMode: SubscriptionMode;
  } | null>(null);

  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleToggleMode = useCallback((account: ConnectedAccount) => {
    const targetMode: SubscriptionMode =
      account.subscriptionMode === 'signal_delivery' ? 'automated_trading' : 'signal_delivery';
    if (targetMode === 'automated_trading') {
      setPendingChange({ accountId: account.accountId, broker: account.broker, targetMode });
    } else {
      void applyModeChange(account.accountId, targetMode);
    }
  }, []);

  const applyModeChange = useCallback(async (accountId: string, mode: SubscriptionMode) => {
    try {
      await accountService.setSubscriptionMode(accountId, mode);
      setSubscriptionMode(accountId, mode);
    } catch {
      Alert.alert('Error', 'Failed to update subscription mode');
    }
  }, [setSubscriptionMode]);

  const handleConfirmMode = useCallback(async () => {
    if (!pendingChange) return;
    const { accountId, targetMode } = pendingChange;
    setPendingChange(null);
    await applyModeChange(accountId, targetMode);
  }, [pendingChange, applyModeChange]);

  const handleLogout = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => void logout() },
    ]);
  }, [logout]);

  const initials = user?.email?.charAt(0).toUpperCase() ?? 'U';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.screenTitle}>Settings</Text>

      {/* Profile section */}
      <View style={styles.profileCard}>
        <LinearGradient
          colors={COLORS.gradientBuy}
          style={styles.avatar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </LinearGradient>
        <View style={styles.profileInfo}>
          <Text style={styles.profileEmail}>{user?.email ?? 'Unknown'}</Text>
          <Text style={styles.profileId}>ID: {user?.userId?.substring(0, 8) ?? '—'}</Text>
        </View>
      </View>

      {/* Notifications */}
      <Text style={styles.sectionHeader}>Preferences</Text>
      <View style={styles.settingsCard}>
        <SettingRow
          icon="notifications-outline"
          label="Push Notifications"
          rightElement={
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={notificationsEnabled ? '#FFFFFF' : '#AAAAAA'}
              accessibilityLabel="Push notifications"
              accessibilityState={{ checked: notificationsEnabled }}
            />
          }
        />
        <View style={styles.rowSeparator} />
        <SettingRow
          icon="phone-portrait-outline"
          label="Haptic Feedback"
          rightElement={
            <Switch
              value={hapticEnabled}
              onValueChange={setHapticEnabled}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={hapticEnabled ? '#FFFFFF' : '#AAAAAA'}
              accessibilityLabel="Haptic feedback"
              accessibilityState={{ checked: hapticEnabled }}
            />
          }
        />
        <View style={styles.rowSeparator} />
        <SettingRow
          icon="cash-outline"
          label="Currency"
          value="USD"
        />
      </View>

      {/* Subscription Mode */}
      <Text style={styles.sectionHeader}>Subscription Mode</Text>
      <Text style={styles.sectionDescription}>
        Choose how signals are used for each connected account.
      </Text>

      {accounts.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No connected accounts. Add one in the Accounts tab.
          </Text>
        </View>
      )}

      {accounts.map((account) => {
        const isAutomated = account.subscriptionMode === 'automated_trading';
        return (
          <View key={account.accountId} style={styles.accountCard}>
            <View style={styles.accountTop}>
              <View>
                <Text style={styles.brokerName}>{account.broker.toUpperCase()}</Text>
                <Text style={styles.balanceText}>{account.balance} {account.currency}</Text>
              </View>
              <View style={[styles.modeBadge, isAutomated ? styles.modeBadgeAuto : styles.modeBadgeSignal]}>
                <Ionicons
                  name={isAutomated ? 'hardware-chip-outline' : 'radio-outline'}
                  size={11}
                  color={isAutomated ? COLORS.primary : COLORS.info}
                />
                <Text style={[styles.modeBadgeText, { color: isAutomated ? COLORS.primary : COLORS.info }]}>
                  {' '}{isAutomated ? 'Automated' : 'Signal Delivery'}
                </Text>
              </View>
            </View>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Automated Trading</Text>
                <Text style={styles.toggleDesc}>
                  {isAutomated ? 'AI executes trades automatically' : 'Receive signals, trade manually'}
                </Text>
              </View>
              <Switch
                value={isAutomated}
                onValueChange={() => handleToggleMode(account)}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor={isAutomated ? '#FFFFFF' : '#AAAAAA'}
                accessibilityLabel={`Automated trading for ${account.broker.toUpperCase()}`}
                accessibilityState={{ checked: isAutomated }}
              />
            </View>
          </View>
        );
      })}

      {/* About */}
      <Text style={styles.sectionHeader}>About</Text>
      <View style={styles.settingsCard}>
        <SettingRow icon="information-circle-outline" label="Version" value="1.0.0" />
        <View style={styles.rowSeparator} />
        <SettingRow icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => {}} />
        <View style={styles.rowSeparator} />
        <SettingRow icon="document-text-outline" label="Terms of Service" onPress={() => {}} />
      </View>

      {/* Sign out */}
      <Pressable style={styles.logoutButton} onPress={handleLogout}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        accessibilityHint="Signs you out of your Slick AI account"
      >
        <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
        <Text style={styles.logoutButtonText}> Sign Out</Text>
      </Pressable>

      <ModeConfirmModal
        visible={pendingChange !== null}
        accountBroker={pendingChange?.broker ?? ''}
        onConfirm={handleConfirmMode}
        onCancel={() => setPendingChange(null)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingBottom: 48,
  },
  screenTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes['3xl'],
    fontWeight: FONTS.weights.extrabold,
    paddingHorizontal: SPACING.md,
    paddingTop: 20,
    paddingBottom: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.extrabold,
  },
  profileInfo: {
    flex: 1,
  },
  profileEmail: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
  },
  profileId: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    marginTop: 3,
  },
  sectionHeader: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    letterSpacing: 1.2,
    paddingHorizontal: SPACING.md,
    marginBottom: 8,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  sectionDescription: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: 10,
    lineHeight: 18,
  },
  settingsCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 13,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingIconDestructive: {
    backgroundColor: 'rgba(255,59,92,0.12)',
  },
  settingLabel: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    flex: 1,
  },
  settingLabelDestructive: {
    color: COLORS.error,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingValue: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  rowSeparator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 58,
  },
  emptyCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
  },
  accountCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  accountTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  brokerName: {
    color: COLORS.text,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
  },
  balanceText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
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
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    color: COLORS.text,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.medium,
  },
  toggleDesc: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,59,92,0.4)',
  },
  logoutButtonText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalIconContainer: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalBody: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    lineHeight: 22,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalBrokerName: {
    color: COLORS.text,
    fontWeight: FONTS.weights.bold,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,149,0,0.1)',
    borderRadius: RADIUS.sm,
    padding: 12,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,149,0,0.3)',
    alignItems: 'flex-start',
  },
  warningText: {
    color: COLORS.warning,
    fontSize: FONTS.sizes.sm,
    lineHeight: 18,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: COLORS.warning,
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
  },
});
