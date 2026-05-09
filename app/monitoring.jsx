import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize, shadows } from '../constants/theme';
import { fetchMonitoringData } from '../services/api';
import { useAuth } from '../context/AuthContext';

const getLocalDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function MonitoringScreen() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quickFilter, setQuickFilter] = useState('today');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const timeFilters = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: '7 Days', value: 'last7' },
    { label: '30 Days', value: 'last30' },
    { label: '90 Days', value: 'last90' },
  ];

  const statusFilters = [
    { label: 'All', value: '' },
    { label: 'Completed', value: 'Completed' },
    { label: 'In Progress', value: 'INPROGRESS' },
    { label: 'Duplicate', value: 'Duplicate' },
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
        const s = new Date(today); s.setDate(today.getDate() - 7);
        from = getLocalDateString(s); to = getLocalDateString(today);
        break;
      }
      case 'last30': {
        const s = new Date(today); s.setDate(today.getDate() - 30);
        from = getLocalDateString(s); to = getLocalDateString(today);
        break;
      }
      case 'last90': {
        const s = new Date(today); s.setDate(today.getDate() - 90);
        from = getLocalDateString(s); to = getLocalDateString(today);
        break;
      }
    }
    return { from, to };
  };
  const loadData = useCallback(async (timeFilter = quickFilter, sFilter = statusFilter) => {
    try {
      const { from, to } = getDateRange(timeFilter);
      const data = await fetchMonitoringData({ 
        fromDate: from, 
        toDate: to, 
        status: sFilter || undefined,
        clientId: user?.isAdmin ? undefined : user?.clientId
      });
      const sorted = data.sort((a, b) => new Date(b.uploaded_on) - new Date(a.uploaded_on));
      setDocs(sorted);
    } catch (err) {
      console.error('Monitoring fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [quickFilter, statusFilter]);

  useEffect(() => { loadData(); }, []);

  const handleTimeFilter = (value) => {
    setQuickFilter(value);
    setLoading(true);
    loadData(value, statusFilter);
  };

  const handleStatusFilter = (value) => {
    setStatusFilter(value);
    setLoading(true);
    loadData(quickFilter, value);
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    if (isNaN(date)) return timestamp || '';
    return date.toLocaleString('en-IN', {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  };

  const getStatusConfig = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('duplicate')) return { icon: 'content-copy', color: colors.warning, bg: colors.warningBg, label: 'Duplicate' };
    if (s.includes('completed') || s.includes('success')) return { icon: 'check-circle', color: colors.success, bg: colors.successBg, label: 'Completed' };
    if (s.includes('failed')) return { icon: 'alert-circle', color: colors.error, bg: colors.errorBg, label: 'Failed' };
    if (s.includes('progress') || s.includes('ready')) return { icon: 'clock-outline', color: colors.info, bg: colors.infoBg, label: 'In Progress' };
    if (s.includes('not started')) return { icon: 'clock-outline', color: colors.textMuted, bg: 'rgba(100,116,139,0.12)', label: 'Not Started' };
    return { icon: 'file-document', color: colors.primary, bg: colors.primaryGlow, label: status || 'Unknown' };
  };

  const getInvoiceText = (doc) => {
    if (doc?.invoice_no && String(doc.invoice_no).trim()) return String(doc.invoice_no);
    try {
      const json = typeof doc?.extracted_json === 'string' ? JSON.parse(doc.extracted_json) : doc?.extracted_json;
      const data = json?.final_data || json || {};
      for (const key of Object.keys(data)) {
        const k = key.toLowerCase().replace(/[\s_-]+/g, '');
        if (['invoiceno', 'invoicenumber', 'invoice_no', 'invoice_number'].includes(k)) {
          const v = data[key];
          if (v && String(v).trim()) return String(v).trim();
        }
      }
    } catch {}
    return 'Invoice';
  };

  const totalCount = docs.length;
  const completedCount = docs.filter(d => (d.overall_status || d.data_extraction_status || '').toLowerCase().includes('completed')).length;
  const duplicateCount = docs.filter(d => (d.overall_status || '').toLowerCase().includes('duplicate')).length;

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
          <Text style={styles.headerTitle}>Processing <Text style={styles.headerAccent}>Monitor</Text></Text>
          <Text style={styles.headerSub}>{totalCount} document{totalCount !== 1 ? 's' : ''} found</Text>
        </View>

        {/* Mini Stats */}
        <View style={styles.miniStats}>
          <View style={[styles.miniStat, { borderColor: 'rgba(108,99,255,0.3)' }]}>
            <Text style={[styles.miniStatValue, { color: colors.primary }]}>{totalCount}</Text>
            <Text style={styles.miniStatLabel}>Total</Text>
          </View>
          <View style={[styles.miniStat, { borderColor: 'rgba(16,185,129,0.3)' }]}>
            <Text style={[styles.miniStatValue, { color: colors.success }]}>{completedCount}</Text>
            <Text style={styles.miniStatLabel}>Done</Text>
          </View>
          <View style={[styles.miniStat, { borderColor: 'rgba(251,191,36,0.3)' }]}>
            <Text style={[styles.miniStatValue, { color: colors.warning }]}>{duplicateCount}</Text>
            <Text style={styles.miniStatLabel}>Duplicate</Text>
          </View>
        </View>

        {/* Time Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {timeFilters.map((f) => (
            <TouchableOpacity
              key={f.value}
              onPress={() => handleTimeFilter(f.value)}
              style={[styles.filterChip, quickFilter === f.value && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, quickFilter === f.value && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Status Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {statusFilters.map((f) => (
            <TouchableOpacity
              key={f.value}
              onPress={() => handleStatusFilter(f.value)}
              style={[styles.statusChip, statusFilter === f.value && styles.statusChipActive]}
            >
              <Text style={[styles.statusChipText, statusFilter === f.value && styles.statusChipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Document List */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : docs.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="file-search-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Documents Found</Text>
            <Text style={styles.emptyText}>Try adjusting your filters or pull to refresh</Text>
          </View>
        ) : (
          docs.map((doc, i) => {
            const overallConfig = getStatusConfig(doc.overall_status || doc.data_extraction_status);
            const dataConfig = getStatusConfig(doc.data_extraction_status);
            const erpConfig = getStatusConfig(doc.erp_entry_status);
            const isExpanded = expandedId === (doc.id || doc.doc_id || i);

            return (
              <TouchableOpacity
                key={doc.id || doc.doc_id || i}
                style={styles.docCard}
                onPress={() => setExpandedId(isExpanded ? null : (doc.id || doc.doc_id || i))}
                activeOpacity={0.7}
              >
                {/* Top Row */}
                <View style={styles.docTop}>
                  <View style={styles.docLeft}>
                    <View style={[styles.docIcon, { backgroundColor: overallConfig.bg }]}>
                      <MaterialCommunityIcons name={overallConfig.icon} size={20} color={overallConfig.color} />
                    </View>
                    <View style={styles.docInfo}>
                      <Text style={styles.docInvoice} numberOfLines={1}>{getInvoiceText(doc)}</Text>
                      <Text style={styles.docClient} numberOfLines={1}>{doc.client_name || 'Client'}</Text>
                    </View>
                  </View>
                  <View style={styles.docRight}>
                    <View style={[styles.badge, { backgroundColor: overallConfig.bg }]}>
                      <Text style={[styles.badgeText, { color: overallConfig.color }]}>{overallConfig.label}</Text>
                    </View>
                    <Text style={styles.docTime}>{formatDateTime(doc.uploaded_on)}</Text>
                  </View>
                </View>

                {/* Expanded Details */}
                {isExpanded && (
                  <View style={styles.expandedSection}>
                    <View style={styles.divider} />
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Data Extraction</Text>
                      <View style={[styles.detailBadge, { backgroundColor: dataConfig.bg }]}>
                        <MaterialCommunityIcons name={dataConfig.icon} size={14} color={dataConfig.color} />
                        <Text style={[styles.detailBadgeText, { color: dataConfig.color }]}>{doc.data_extraction_status || 'N/A'}</Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Consignment Entry</Text>
                      <View style={[styles.detailBadge, { backgroundColor: erpConfig.bg }]}>
                        <MaterialCommunityIcons name={erpConfig.icon} size={14} color={erpConfig.color} />
                        <Text style={[styles.detailBadgeText, { color: erpConfig.color }]}>{doc.erp_entry_status || 'N/A'}</Text>
                      </View>
                    </View>
                    {doc.data_extraction_time_consumed && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Extraction Time</Text>
                        <Text style={styles.detailValue}>{doc.data_extraction_time_consumed}m</Text>
                      </View>
                    )}
                    {doc.vehicle_hire_status && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Vehicle Hire</Text>
                        <Text style={styles.detailValue}>{doc.vehicle_hire_status}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Expand indicator */}
                <View style={styles.expandIndicator}>
                  <MaterialCommunityIcons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.textMuted}
                  />
                </View>
              </TouchableOpacity>
            );
          })
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
  header: { marginBottom: spacing.xl },
  headerTitle: { fontSize: fontSize.xxl + 4, fontWeight: '800', color: colors.textPrimary },
  headerAccent: { color: colors.primary },
  headerSub: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 4 },
  miniStats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  miniStat: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.md,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  miniStatValue: { fontSize: fontSize.xl, fontWeight: '800' },
  miniStatLabel: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  filterScroll: { marginBottom: spacing.md },
  filterChip: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, backgroundColor: colors.surface,
    marginRight: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primaryGlow, borderColor: colors.primary },
  filterText: { fontSize: fontSize.xs + 1, color: colors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: colors.primary },
  statusChip: {
    paddingHorizontal: spacing.md + 2, paddingVertical: spacing.sm - 2,
    borderRadius: borderRadius.full, backgroundColor: colors.surfaceElevated,
    marginRight: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  statusChipActive: { backgroundColor: 'rgba(6,214,160,0.12)', borderColor: colors.accent },
  statusChipText: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: '600' },
  statusChipTextActive: { color: colors.accent },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textSecondary, marginTop: spacing.lg },
  emptyText: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.sm },
  docCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.lg, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  docTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  docLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: spacing.md },
  docIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  docInfo: { flex: 1, marginLeft: spacing.md },
  docInvoice: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  docClient: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  docRight: { alignItems: 'flex-end' },
  badge: { paddingHorizontal: spacing.sm + 2, paddingVertical: 3, borderRadius: borderRadius.full },
  badgeText: { fontSize: fontSize.xs - 1, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  docTime: { fontSize: fontSize.xs - 1, color: colors.textMuted, marginTop: 4 },
  expandedSection: { marginTop: spacing.md },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: spacing.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  detailLabel: { fontSize: fontSize.xs + 1, color: colors.textSecondary, fontWeight: '500' },
  detailBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.full, gap: 4 },
  detailBadgeText: { fontSize: fontSize.xs, fontWeight: '600' },
  detailValue: { fontSize: fontSize.xs + 1, color: colors.textPrimary, fontWeight: '600' },
  expandIndicator: { alignItems: 'center', marginTop: spacing.sm },
});
