import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEnvironment } from '../context/EnvironmentContext';
import { colors, spacing, borderRadius, fontSize, shadows } from '../constants/theme';

const { width } = Dimensions.get('window');

export default function EnvironmentScreen() {
  const { setEnvironment } = useEnvironment();

  const handleSelect = async (env) => {
    await setEnvironment(env);
  };

  return (
    <LinearGradient colors={[colors.background, '#1a1f35']} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoGlow}>
            <MaterialCommunityIcons name="server-network" size={50} color="#fff" />
          </View>
          <Text style={styles.title}>Select Environment</Text>
          <Text style={styles.subtitle}>Choose which server you want to connect to</Text>
        </View>

        <View style={styles.options}>
          <TouchableOpacity 
            style={styles.card} 
            activeOpacity={0.8}
            onPress={() => handleSelect('PROD')}
          >
            <LinearGradient colors={['#6C63FF', '#4F46E5']} style={styles.cardGradient}>
              <MaterialCommunityIcons name="rocket-launch" size={32} color="#fff" />
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>Production</Text>
                <Text style={styles.cardDesc}>Main server for live data entry</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.card} 
            activeOpacity={0.8}
            onPress={() => handleSelect('UAT')}
          >
            <LinearGradient colors={['#06D6A0', '#059669']} style={styles.cardGradient}>
              <MaterialCommunityIcons name="flask-outline" size={32} color="#fff" />
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>UAT / Testing</Text>
                <Text style={styles.cardDesc}>Development server for testing</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>You can change this later in settings</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: spacing.xxl, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: spacing.xxxl },
  logoGlow: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.xl, ...shadows.glow,
  },
  title: { fontSize: fontSize.xxxl, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', marginTop: 8 },
  options: { gap: spacing.lg },
  card: { borderRadius: borderRadius.xl, overflow: 'hidden', ...shadows.card },
  cardGradient: { 
    flexDirection: 'row', alignItems: 'center', padding: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  cardInfo: { flex: 1, marginLeft: spacing.lg },
  cardTitle: { fontSize: fontSize.xl, fontWeight: '700', color: '#fff' },
  cardDesc: { fontSize: fontSize.xs + 1, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  footer: { 
    position: 'absolute', bottom: 40, left: 0, right: 0, 
    textAlign: 'center', color: colors.textMuted, fontSize: fontSize.xs,
    textTransform: 'uppercase', letterSpacing: 1.2
  },
});
