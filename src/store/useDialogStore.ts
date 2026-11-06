import { create } from 'zustand';

export type DialogButtonStyle = 'default' | 'cancel' | 'destructive';
export type DialogVariant = 'info' | 'warning' | 'danger' | 'success';

export interface DialogButton {
  text: string;
  style?: DialogButtonStyle;
  onPress?: () => void;
}

export interface DialogState {
  visible: boolean;
  title: string;
  message: string;
  buttons: DialogButton[];
  variant: DialogVariant;
  showDialog: (params: {
    title: string;
    message?: string;
    buttons?: DialogButton[];
    variant?: DialogVariant;
  }) => void;
  hideDialog: () => void;
}

function inferDialogVariant(
  title: string,
  buttons?: DialogButton[],
): DialogVariant {
  if (buttons?.some(b => b.style === 'destructive')) {
    return 'danger';
  }
  const lower = title.toLowerCase();
  if (
    lower.includes('lỗi') ||
    lower.includes('không tìm thấy') ||
    lower.includes('không hỗ trợ') ||
    lower.includes('thất bại')
  ) {
    return 'warning';
  }
  if (lower.includes('đã tải') || lower.includes('thành công')) {
    return 'success';
  }
  return 'info';
}

export const useDialogStore = create<DialogState>(set => ({
  visible: false,
  title: '',
  message: '',
  buttons: [],
  variant: 'info',

  showDialog: ({ title, message = '', buttons, variant }) => {
    const resolvedButtons: DialogButton[] =
      buttons && buttons.length > 0
        ? buttons
        : [{ text: 'Đã hiểu', style: 'default' }];

    set({
      visible: true,
      title,
      message,
      buttons: resolvedButtons,
      variant: variant ?? inferDialogVariant(title, resolvedButtons),
    });
  },

  hideDialog: () => {
    set({ visible: false });
  },
}));

/**
 * Hàm thay thế trực tiếp cho Alert.alert với giao diện Dark Modal đồng bộ CinaStream
 */
export function showAppAlert(
  title: string,
  message?: string,
  buttons?: DialogButton[],
  variant?: DialogVariant,
): void {
  useDialogStore.getState().showDialog({
    title,
    message,
    buttons,
    variant,
  });
}

