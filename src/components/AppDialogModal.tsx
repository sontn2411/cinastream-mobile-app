import React, { memo, useCallback } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AlertCircle,
  CheckCircle2,
  Info,
  Trash2,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { DialogButton, useDialogStore } from '../store/useDialogStore';
import { useResponsive } from '../utils/responsive';

export const AppDialogModal = memo(function AppDialogModalComponent() {
  const { rs } = useResponsive();
  const visible = useDialogStore(state => state.visible);
  const title = useDialogStore(state => state.title);
  const message = useDialogStore(state => state.message);
  const buttons = useDialogStore(state => state.buttons);
  const variant = useDialogStore(state => state.variant);
  const hideDialog = useDialogStore(state => state.hideDialog);

  const handleBackdropPress = useCallback(() => {
    const cancelBtn = buttons.find(b => b.style === 'cancel');
    if (cancelBtn) {
      hideDialog();
      cancelBtn.onPress?.();
    } else if (buttons.length === 1) {
      hideDialog();
      buttons[0].onPress?.();
    }
  }, [buttons, hideDialog]);

  const handleButtonPress = useCallback(
    (btn: DialogButton) => {
      hideDialog();
      if (btn.onPress) {
        setTimeout(() => {
          btn.onPress?.();
        }, 60);
      }
    },
    [hideDialog],
  );

  if (!visible) {
    return null;
  }

  const isStacked = buttons.length > 2;

  const renderIcon = () => {
    const iconSize = rs(26);
    switch (variant) {
      case 'danger':
        return <Trash2 color={COLORS.danger} size={iconSize} />;
      case 'warning':
        return <AlertCircle color={COLORS.warning} size={iconSize} />;
      case 'success':
        return <CheckCircle2 color={COLORS.success} size={iconSize} />;
      default:
        return <Info color={COLORS.primary} size={iconSize} />;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleBackdropPress}
    >
      <Pressable style={styles.backdrop} onPress={handleBackdropPress}>
        <Pressable
          onPress={e => e.stopPropagation()}
          style={[
            styles.dialogCard,
            {
              width: rs(328),
              borderRadius: rs(26),
              paddingHorizontal: rs(20),
              paddingTop: rs(22),
              paddingBottom: rs(18),
            },
          ]}
        >
          {/* Icon Badge */}
          <View
            style={[
              styles.iconCircle,
              variant === 'danger' && styles.iconCircleDanger,
              variant === 'warning' && styles.iconCircleWarning,
              variant === 'success' && styles.iconCircleSuccess,
              variant === 'info' && styles.iconCircleInfo,
              {
                width: rs(56),
                height: rs(56),
                borderRadius: rs(28),
                marginBottom: rs(14),
              },
            ]}
          >
            {renderIcon()}
          </View>

          {/* Title */}
          <Text style={[styles.title, { fontSize: rs(17) }]}>{title}</Text>

          {/* Message */}
          {message ? (
            <Text
              style={[
                styles.message,
                {
                  fontSize: rs(13),
                  lineHeight: rs(19),
                  marginTop: rs(8),
                },
              ]}
            >
              {message}
            </Text>
          ) : null}

          {/* Action Buttons */}
          <View
            style={[
              isStacked ? styles.buttonStack : styles.buttonRow,
              {
                marginTop: rs(20),
                gap: rs(10),
              },
            ]}
          >
            {buttons.map((btn, index) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';

              return (
                <Pressable
                  key={`${btn.text}-${index}`}
                  onPress={() => handleButtonPress(btn)}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    !isStacked && styles.actionBtnFlex,
                    isCancel && styles.btnCancel,
                    isDestructive && styles.btnDestructive,
                    !isCancel && !isDestructive && styles.btnDefault,
                    {
                      height: rs(44),
                      borderRadius: rs(16),
                      paddingHorizontal: rs(14),
                      transform: [{ translateY: pressed ? 2 : 0 }],
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.btnText,
                      isCancel && styles.btnTextCancel,
                      { fontSize: rs(14) },
                    ]}
                  >
                    {btn.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(74, 46, 53, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dialogCard: {
    maxWidth: '100%',
    backgroundColor: COLORS.background,
    borderWidth: 2.5,
    borderColor: COLORS.border,
    borderBottomWidth: 6,
    borderBottomColor: COLORS.borderStrong,
    alignItems: 'center',
    elevation: 16,
    shadowColor: '#E8839B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  iconCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  iconCircleDanger: {
    backgroundColor: COLORS.dangerSoft,
    borderColor: COLORS.border,
  },
  iconCircleWarning: {
    backgroundColor: COLORS.warningSoft,
    borderColor: '#FFD670',
  },
  iconCircleSuccess: {
    backgroundColor: COLORS.successSoft,
    borderColor: '#A9EFE6',
  },
  iconCircleInfo: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.border,
  },
  title: {
    color: COLORS.ink,
    fontWeight: '900',
    textAlign: 'center',
  },
  message: {
    color: COLORS.inkSoft,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonStack: {
    width: '100%',
    flexDirection: 'column',
  },
  actionBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderBottomWidth: 3.5,
  },
  actionBtnFlex: {
    flex: 1,
  },
  btnCancel: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderBottomColor: COLORS.borderStrong,
  },
  btnDestructive: {
    backgroundColor: COLORS.danger,
    borderColor: COLORS.danger,
    borderBottomColor: COLORS.dangerDark,
  },
  btnDefault: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    borderBottomColor: COLORS.primaryDark,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  btnTextCancel: {
    color: COLORS.ink,
    fontWeight: '800',
  },
});
