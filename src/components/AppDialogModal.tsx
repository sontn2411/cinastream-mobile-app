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
        return <Trash2 color="#EF4444" size={iconSize} />;
      case 'warning':
        return <AlertCircle color="#F59E0B" size={iconSize} />;
      case 'success':
        return <CheckCircle2 color="#10B981" size={iconSize} />;
      default:
        return <Info color="#3B82F6" size={iconSize} />;
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
              width: rs(325),
              borderRadius: rs(20),
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
                width: rs(54),
                height: rs(54),
                borderRadius: rs(27),
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
                      borderRadius: rs(12),
                      paddingHorizontal: rs(14),
                      opacity: pressed ? 0.8 : 1,
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
    backgroundColor: 'rgba(6, 7, 11, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dialogCard: {
    maxWidth: '100%',
    backgroundColor: '#151722',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.65,
    shadowRadius: 20,
  },
  iconCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  iconCircleDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  iconCircleWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  iconCircleSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  iconCircleInfo: {
    backgroundColor: 'rgba(59, 130, 246, 0.14)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    color: '#9CA3AF',
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
  },
  actionBtnFlex: {
    flex: 1,
  },
  btnCancel: {
    backgroundColor: '#222534',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  btnDestructive: {
    backgroundColor: '#EF4444',
  },
  btnDefault: {
    backgroundColor: COLORS.primary,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  btnTextCancel: {
    color: '#D1D5DB',
    fontWeight: '600',
  },
});

