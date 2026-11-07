import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { RotateCcw } from 'lucide-react-native';
import { COLORS } from '../constants/colors';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (__DEV__) {
      console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <View style={styles.kaomojiCard}>
              <Text style={styles.kaomoji}>(｡•́︿•̀｡)</Text>
            </View>

            <Text style={styles.title}>Ôi, có chút trục trặc nhỏ rồi</Text>
            <Text style={styles.message}>
              Ứng dụng vừa vấp phải một lỗi bất ngờ. Bạn bấm nút bên dưới để
              làm mới lại rạp phim nhé!
            </Text>

            {__DEV__ && this.state.error?.message ? (
              <View style={styles.devBox}>
                <Text style={styles.devErrorText} numberOfLines={4}>
                  {this.state.error.message}
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={this.handleReset}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.retryButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Thử lại"
            >
              <RotateCcw color="#FFFFFF" size={18} />
              <Text style={styles.retryText}>Làm mới ngay</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    maxWidth: 400,
  },
  kaomojiCard: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderBottomWidth: 5,
    borderBottomColor: COLORS.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  kaomoji: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.ink,
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: COLORS.inkSoft,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  devBox: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 24,
    width: '100%',
  },
  devErrorText: {
    color: COLORS.danger,
    fontSize: 12,
    fontFamily: 'Courier',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderBottomWidth: 4,
    borderBottomColor: COLORS.primaryDark,
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: 22,
  },
  retryButtonPressed: {
    transform: [{ translateY: 2 }],
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
