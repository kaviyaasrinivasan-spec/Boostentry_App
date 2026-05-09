import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, fontSize, shadows } from '../constants/theme';
import { fetchDashboardSummary } from '../services/api';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const getLocalDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function DashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [summary, setSummary] = useState({});
  const [recentDocs, setRecentDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quickFilter, setQuickFilter] = useState('today');

  const filters = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: '7 Days', value: 'last7' },
    { label: '30 Days', value: 'last30' },
  ];

  const getDateRange = (filter) => {
    const today = new Date();
    let from = '', to = '';
    switch (filter) {
      case 'today':
        from = to = getLocalDateString(today);
        break;
      case 'yesterday': {
        const y = new Date(today);
        y.setDate(today.getDate() - 1);
        from = to = getLocalDateString(y);
        break;
      }
      case 'last7': {
        const s = new Date(today);
        s.setDate(today.getDate() - 7);
        from = getLocalDateString(s);
        to = getLocalDateString(today);
        break;
      }
      case 'last30': {
        const s = new Date(today);
        s.setDate(today.getDate() - 30);
        from = getLocalDateString(s);
        to = getLocalDateString(today);
        break;
      }
    }
    return { from, to };
  };

  const loadData = useCallback(async (filter = quickFilter) => {
    try {
      const { from, to } = getDateRange(filter);
      const res = await fetchDashboardSummary({ 
        fromDate: from, 
        toDate: to, 
        clientId: user?.isAdmin ? undefined : user?.clientId 
      });
      if (res?.status === 'success') {
        setSummary(res.summary || {});
        setRecentDocs(res.recent || []);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [quickFilter]);

  useEffect(() => { loadData(); }, []);

  const handleFilterChange = (value) => {
    setQuickFilter(value);
    setLoading(true);
    loadData(value);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    if (isNaN(date)) return timestamp;
    return date.toLocaleString('en-IN', {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  };

  const getStatusStyle = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('duplicate')) return { bg: colors.warningBg, text: colors.warning };
    if (s.includes('completed')) return { bg: colors.successBg, text: colors.success };
    if (s.includes('failed')) return { bg: colors.errorBg, text: colors.error };
    if (s.includes('progress')) return { bg: colors.infoBg, text: colors.info };
    return { bg: colors.primaryGlow, text: colors.primary };
  };

  const statCards = [
    { title: 'Total Docs', value: summary.total_docs ?? 0, icon: 'file-document-multiple', gradient: ['#6C63FF', '#8B5CF6'] },
    { title: 'Completed', value: summary.completed ?? 0, icon: 'check-circle', gradient: ['#10B981', '#34D399'] },
    { title: 'Duplicates', value: summary.duplicate ?? summary.duplicates ?? 0, icon: 'content-copy', gradient: ['#F59E0B', '#FBBF24'] },
    { title: 'Review', value: summary.human_review ?? 0, icon: 'eye-check', gradient: ['#8B5CF6', '#A78BFA'] },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome, {user?.branch || 'User'}</Text>
            <Text style={styles.appName}>Boost<Text style={styles.appNameAccent}>Entry</Text></Text>
          </View>
          <TouchableOpacity style={styles.headerIcon} onPress={logout}>
            <LinearGradient colors={['#FF6B6B', '#EE5253']} style={styles.avatarGradient}>
              <MaterialCommunityIcons name="logout" size={22} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Quick Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.value}
              onPress={() => handleFilterChange(f.value)}
              style={[styles.filterChip, quickFilter === f.value && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, quickFilter === f.value && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Stats Cards */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.statsGrid}>
              {statCards.map((card, i) => (
                <LinearGradient
                  key={i}
                  colors={card.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statCard}
                >
                  <View style={styles.statIconBg}>
                    <MaterialCommunityIcons name={card.icon} size={22} color="rgba(255,255,255,0.9)" />
                  </View>
                  <Text style={styles.statValue}>{card.value}</Text>
                  <Text style={styles.statTitle}>{card.title}</Text>
                </LinearGradient>
              ))}
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/upload')}>
                <LinearGradient colors={['#6C63FF', '#4F46E5']} style={styles.actionGradient}>
                  <MaterialCommunityIcons name="camera" size={28} color="#fff" />
                </LinearGradient>
                <Text style={styles.actionText}>Scan Invoice</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/upload')}>
                <LinearGradient colors={['#06D6A0', '#059669']} style={styles.actionGradient}>
                  <MaterialCommunityIcons name="file-upload" size={28} color="#fff" />
                </LinearGradient>
                <Text style={styles.actionText}>Upload File</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/monitoring')}>
                <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.actionGradient}>
                  <MaterialCommunityIcons name="monitor-eye" size={28} color="#fff" />
                </LinearGradient>
                <Text style={styles.actionText}>Monitor</Text>
              </TouchableOpacity>
            </View>

            {/* Recent Uploads */}
            <Text style={styles.sectionTitle}>Recent Uploads</Text>
            {recentDocs.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="file-document-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No recent uploads</Text>
              </View>
            ) : (
              recentDocs.slice(0, 8).map((doc, i) => {
                const statusStyle = getStatusStyle(doc.status);
                return (
                  <View key={i} style={styles.recentCard}>
                    <View style={styles.recentLeft}>
                      <View style={[styles.recentDot, { backgroundColor: statusStyle.text }]} />
                      <View style={styles.recentInfo}>
                        <Text style={styles.recentClient} numberOfLines={1}>{doc.client || 'Unknown'}</Text>
                        <Text style={styles.recentType}>{doc.doc_type || 'Invoice'}</Text>
                      </View>
                    </View>
                    <View style={styles.recentRight}>
                      <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <Text style={[styles.statusText, { color: statusStyle.text }]}>
                          {doc.status || 'Processing'}
                        </Text>
                      </View>
                      <Text style={styles.recentTime}>{formatDateTime(doc.uploaded_on)}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  greeting: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: 2 },
  appName: { fontSize: fontSize.xxxl, fontWeight: '800', color: colors.textPrimary },
  appNameAccent: { color: colors.primary },
  headerIcon: {},
  avatarGradient: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  filterScroll: { marginBottom: spacing.xl },
  filterChip: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full, backgroundColor: colors.surfaceElevated,
    marginRight: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primaryGlow, borderColor: colors.primary },
  filterText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: colors.primary },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: spacing.xxl },
  statCard: {
    width: (width - spacing.lg * 2 - spacing.sm) / 2, padding: spacing.lg,
    borderRadius: borderRadius.xl, marginBottom: spacing.sm, ...shadows.card,
  },
  statIconBg: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm,
  },
  statValue: { fontSize: fontSize.xxl + 4, fontWeight: '800', color: '#fff', marginBottom: 2 },
  statTitle: { fontSize: fontSize.xs + 1, color: 'rgba(255,255,255,0.8)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xxl },
  actionCard: { alignItems: 'center', flex: 1 },
  actionGradient: {
    width: 60, height: 60, borderRadius: borderRadius.lg,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm, ...shadows.card,
  },
  actionText: { fontSize: fontSize.xs + 1, color: colors.textSecondary, fontWeight: '600' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted, marginTop: spacing.md },
  recentCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  recentLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  recentDot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.md },
  recentInfo: { flex: 1 },
  recentClient: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  recentType: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  recentRight: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: spacing.sm + 2, paddingVertical: 3, borderRadius: borderRadius.full },
  statusText: { fontSize: fontSize.xs, fontWeight: '700' },
  recentTime: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4 },
});
