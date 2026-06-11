import React, { forwardRef } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, leftIcon, rightIcon, containerStyle, ...props }, ref) => {
    return (
      <View style={[styles.wrapper, containerStyle]}>
        {label && <Text style={styles.label}>{label}</Text>}
        <View style={[styles.inputRow, !!error && styles.inputError]}>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          <TextInput
            ref={ref}
            style={[styles.input, leftIcon ? styles.inputPaddingLeft : null, rightIcon ? styles.inputPaddingRight : null].filter(Boolean)}
            placeholderTextColor="rgba(255,255,255,0.35)"
            selectionColor="#8b5cf6"
            {...props}
          />
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#182a1e' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d4e8da',
    minHeight: 48,
  },
  inputError: { borderColor: '#ef4444' },
  input: {
    flex: 1,
    color: '#182a1e',
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputPaddingLeft: { paddingLeft: 8 },
  inputPaddingRight: { paddingRight: 8 },
  leftIcon: { paddingLeft: 14 },
  rightIcon: { paddingRight: 14 },
  errorText: { fontSize: 12, color: '#dc2626' },
});
