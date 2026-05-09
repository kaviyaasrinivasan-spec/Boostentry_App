import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Dimensions, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useEnvironment } from '../context/EnvironmentContext';
import { colors, spacing, borderRadius, fontSize, shadows } from '../constants/theme';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { resetEnvironment } = useEnvironment();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setError('');
    setLoading(true);
    const result = await login(email, password);
    if (!result.success) {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <LinearGradient colors={[colors.background, '#1a1f35']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Logo Area */}
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#6C63FF', '#8B5CF6']}
              style={styles.logoGlow}
            >
              <MaterialCommunityIcons name="robot-happy" size={60} color="#fff" />
            </LinearGradient>
            <Text style={styles.appName}>Boost<Text style={styles.appNameAccent}>Entry</Text></Text>
            <Text style={styles.tagline}>Smart Documentation for Logistics</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.subText}>Sign in to your branch account</Text>

            {error ? (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={18} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="email-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={styles.loginBtnContainer}
              onPress={handleLogin}
              disabled={loading}
            >
              <LinearGradient
                colors={['#6C63FF', '#4F46E5']}
                style={styles.loginBtn}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginBtnText}>Sign In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Authorized personnel only</Text>
            <TouchableOpacity 
              style={styles.changeServerBtn} 
              onPress={resetEnvironment}
            >
              <MaterialCommunityIcons name="server-network" size={16} color={colors.primary} />
              <Text style={styles.changeServerText}>Change Server</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  content: { flex: 1, paddingHorizontal: spacing.xxl, justifyContent: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: spacing.xxxl },
  logoGlow: {
    width: 100, height: 100, borderRadius: 50,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.lg, ...shadows.glow,
  },
  appName: { fontSize: fontSize.display, fontWeight: '800', color: colors.textPrimary },
  appNameAccent: { color: colors.primary },
  tagline: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 4, letterSpacing: 1 },
  form: { backgroundColor: 'rgba(30, 41, 59, 0.5)', padding: spacing.xl, borderRadius: borderRadius.xxl, borderWidth: 1, borderColor: colors.border },
  welcomeText: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  subText: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.xl },
  errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.errorBg, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.lg, gap: 8 },
  errorText: { color: colors.error, fontSize: fontSize.sm, fontWeight: '500' },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: borderRadius.lg, paddingHorizontal: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border, height: 56,
  },
  inputIcon: { marginRight: spacing.md },
  input: { flex: 1, color: colors.textPrimary, fontSize: fontSize.md },
  loginBtnContainer: { marginTop: spacing.md, borderRadius: borderRadius.lg, overflow: 'hidden', ...shadows.glow },
  loginBtn: { height: 56, justifyContent: 'center', alignItems: 'center' },
  loginBtnText: { color: '#fff', fontSize: fontSize.lg, fontWeight: '700' },
  footer: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
  footerText: { color: colors.textMuted, fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: 1.5 },
  changeServerBtn: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: 6 },
  changeServerText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' },
});
