import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Image, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { colors, spacing, borderRadius, fontSize, shadows } from '../constants/theme';
import { fetchClients, fetchDocFormats, uploadDocument } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function UploadScreen() {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [formats, setFormats] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [pageCount, setPageCount] = useState('1');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [showFormatPicker, setShowFormatPicker] = useState(false);
  const [optionsSlotIndex, setOptionsSlotIndex] = useState(null);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const data = await fetchClients();
      setClients(data);
    } catch (err) {
      console.error('Error loading clients:', err);
    }
  };

  // Dedicated effect for auto-selection to handle async loading of user/clients
  useEffect(() => {
    if (!user?.isAdmin && user?.clientId && clients.length > 0 && !selectedClient) {
      const branchClient = clients.find(c => c.id === user.clientId);
      if (branchClient) {
        handleClientSelect(branchClient);
      }
    }
  }, [user, clients]);

  const handleClientSelect = async (client) => {
    setSelectedClient(client);
    setSelectedFormat(null);
    setShowClientPicker(false);
    try {
      const data = await fetchDocFormats(client.id);
      setFormats(data);
      
      // Auto-select "Invoice" format if it exists
      const invoiceFormat = data.find(f => 
        f.doc_type?.toLowerCase() === 'invoice' || 
        f.name?.toLowerCase().includes('invoice')
      );
      if (invoiceFormat) {
        setSelectedFormat(invoiceFormat);
      } else if (data.length > 0) {
        // Default to first format if no Invoice found
        setSelectedFormat(data[0]);
      }
    } catch (err) {
      console.error('Error loading formats:', err);
    }
  };

  const handleFormatSelect = (format) => {
    setSelectedFormat(format);
    setShowFormatPicker(false);
  };

  const handlePageCountChange = (count) => {
    setPageCount(count);
    setFiles([]);
    setUploadResult(null);
  };

  const captureFromCamera = async (slotIndex) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to capture invoices.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const newFile = { uri: asset.uri, name: `capture_${Date.now()}.jpg`, mimeType: 'image/jpeg', size: asset.fileSize };
      setFiles(prev => {
        const next = [...prev];
        next[slotIndex] = newFile;
        return next;
      });
      setUploadResult(null);
    }
  };

  const pickFromGallery = async (slotIndex) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const newFile = { uri: asset.uri, name: asset.fileName || `photo_${Date.now()}.jpg`, mimeType: asset.mimeType || 'image/jpeg', size: asset.fileSize };
      setFiles(prev => {
        const next = [...prev];
        next[slotIndex] = newFile;
        return next;
      });
      setUploadResult(null);
    }
  };

  const pickDocument = async (slotIndex) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const newFile = { uri: asset.uri, name: asset.name, mimeType: asset.mimeType, size: asset.size };
        setFiles(prev => {
          const next = [...prev];
          next[slotIndex] = newFile;
          return next;
        });
        setUploadResult(null);
      }
    } catch (err) {
      console.error('Document pick error:', err);
    }
  };

  const removeFile = (slotIndex) => {
    setFiles(prev => {
      const next = [...prev];
      next[slotIndex] = undefined;
      return next;
    });
    setUploadResult(null);
  };

  const totalSlots = pageCount === '2' ? 2 : 1;
  const allSlotsFilled = files.filter(Boolean).length >= totalSlots;

  const handleUpload = async () => {
    if (!selectedClient || !selectedFormat) {
      Alert.alert('Missing info', 'Please select a client and document type.');
      return;
    }
    if (!allSlotsFilled) {
      Alert.alert('Missing files', `Please select ${totalSlots} file(s) before uploading.`);
      return;
    }

    setUploading(true);
    setUploadResult(null);
    try {
      const res = await uploadDocument({
        clientId: selectedClient.id,
        docFormatId: selectedFormat.id,
        uploadedBy: 'MOBILE_APP',
        pageCount,
        files: files.filter(Boolean),
      });

      if (res?.status === 'success') {
        const serverData = res?.data;
        const finalName = Array.isArray(serverData) ? serverData?.[0]?.final_name : serverData?.final_name;
        setUploadResult({
          status: 'success',
          message: pageCount === '2' ? '2 pages merged & uploaded!' : 'File uploaded successfully!',
          finalName,
        });
        setFiles([]);
      } else {
        setUploadResult({ status: 'error', message: res?.message || 'Upload failed.' });
      }
    } catch (err) {
      setUploadResult({
        status: 'error',
        message: err?.response?.data?.message || err.message || 'Network error',
      });
    } finally {
      setUploading(false);
    }
  };

  const niceBytes = (n) => {
    if (!n || !Number.isFinite(n)) return '';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
    return `${(Math.round(n / (1024 * 1024) * 10) / 10)} MB`;
  };

  const showFileOptions = (slotIndex) => {
    setOptionsSlotIndex(slotIndex);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Upload <Text style={styles.headerAccent}>Document</Text></Text>
          <Text style={styles.headerSub}>Capture or select invoices for processing</Text>
        </View>

        {/* Client Selector (Only for Admin) */}
        {user?.isAdmin && (
          <>
            <Text style={styles.label}>Select Client</Text>
            <TouchableOpacity style={styles.picker} onPress={() => setShowClientPicker(!showClientPicker)}>
              <MaterialCommunityIcons name="domain" size={20} color={colors.primary} />
              <Text style={[styles.pickerText, !selectedClient && styles.pickerPlaceholder]}>
                {selectedClient?.name || 'Choose Client'}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            {showClientPicker && (
              <View style={styles.dropdownContainer}>
                <ScrollView style={styles.dropdown} nestedScrollEnabled>
                  {clients.map((c) => (
                    <TouchableOpacity key={c.id} style={styles.dropdownItem} onPress={() => handleClientSelect(c)}>
                      <Text style={styles.dropdownText}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}

        {/* Format Selector (Only for Admin or if auto-select fails) */}
        {(user?.isAdmin || !selectedFormat) && (
          <>
            <Text style={styles.label}>Document Type</Text>
            <TouchableOpacity
              style={[styles.picker, !selectedClient && styles.pickerDisabled]}
              onPress={() => selectedClient && setShowFormatPicker(!showFormatPicker)}
              disabled={!selectedClient}
            >
              <MaterialCommunityIcons name="file-document-outline" size={20} color={selectedClient ? colors.primary : colors.textMuted} />
              <Text style={[styles.pickerText, !selectedFormat && styles.pickerPlaceholder]}>
                {selectedFormat?.doc_type || 'Choose Format'}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            {showFormatPicker && (
              <View style={styles.dropdownContainer}>
                <ScrollView style={styles.dropdown} nestedScrollEnabled>
                  {formats.map((f) => (
                    <TouchableOpacity key={f.id} style={styles.dropdownItem} onPress={() => handleFormatSelect(f)}>
                      <Text style={styles.dropdownText}>{f.doc_type}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}

        {/* Branch Info Display (For non-admin users) */}
        {!user?.isAdmin && selectedClient && (
          <View style={styles.branchInfoCard}>
            <View style={styles.branchInfoRow}>
              <MaterialCommunityIcons name="domain" size={18} color={colors.primary} />
              <Text style={styles.branchInfoLabel}>Branch:</Text>
              <Text style={styles.branchInfoValue}>{selectedClient.name}</Text>
            </View>
            <View style={styles.branchInfoRow}>
              <MaterialCommunityIcons name="file-document-outline" size={18} color={colors.accent} />
              <Text style={styles.branchInfoLabel}>Type:</Text>
              <Text style={styles.branchInfoValue}>{selectedFormat?.doc_type || 'Invoice'}</Text>
            </View>
          </View>
        )}

        {/* Page Count */}
        <Text style={styles.label}>Number of Pages</Text>
        <View style={styles.pageToggle}>
          {['1', '2'].map((val) => (
            <TouchableOpacity
              key={val}
              style={[styles.pageOption, pageCount === val && styles.pageOptionActive]}
              onPress={() => handlePageCountChange(val)}
            >
              <Text style={[styles.pageOptionText, pageCount === val && styles.pageOptionTextActive]}>
                {val} Page{val === '2' ? 's' : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tips Card */}
        <LinearGradient colors={['rgba(108,99,255,0.1)', 'rgba(6,214,160,0.05)']} style={styles.tipsCard}>
          <MaterialCommunityIcons name="lightbulb-on" size={22} color={colors.warning} />
          <View style={styles.tipsContent}>
            <Text style={styles.tipsTitle}>Capture Tips</Text>
            <Text style={styles.tipItem}>✓ Hold camera directly above the document</Text>
            <Text style={styles.tipItem}>✓ Ensure good lighting, avoid shadows</Text>
            <Text style={styles.tipItem}>✓ Keep document flat and straight</Text>
            {pageCount === '2' && <Text style={[styles.tipItem, { color: colors.info }]}>ℹ Both files are merged into 1 PDF</Text>}
          </View>
        </LinearGradient>

        {/* File Slots */}
        {Array.from({ length: totalSlots }).map((_, idx) => (
          <View key={idx} style={styles.fileSlot}>
            {files[idx] ? (
              <View style={styles.filePreview}>
                {files[idx].mimeType?.startsWith('image/') ? (
                  <Image source={{ uri: files[idx].uri }} style={styles.previewImage} />
                ) : (
                  <View style={styles.pdfIcon}>
                    <MaterialCommunityIcons name="file-pdf-box" size={48} color={colors.error} />
                  </View>
                )}
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>{files[idx].name}</Text>
                  <Text style={styles.fileSize}>{niceBytes(files[idx].size)}</Text>
                  <TouchableOpacity onPress={() => removeFile(idx)}>
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.addFileBtn} onPress={() => showFileOptions(idx)}>
                <LinearGradient colors={['rgba(108,99,255,0.08)', 'rgba(108,99,255,0.03)']} style={styles.addFileBtnInner}>
                  <MaterialCommunityIcons name="plus-circle-outline" size={40} color={colors.primary} />
                  <Text style={styles.addFileText}>
                    {pageCount === '2' ? `Add Page ${idx + 1}` : 'Tap to add file'}
                  </Text>
                  <Text style={styles.addFileHint}>Camera • Gallery • PDF</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* Upload Result */}
        {uploadResult && (
          <View style={[styles.resultCard, uploadResult.status === 'success' ? styles.resultSuccess : styles.resultError]}>
            <MaterialCommunityIcons
              name={uploadResult.status === 'success' ? 'check-circle' : 'alert-circle'}
              size={22}
              color={uploadResult.status === 'success' ? colors.success : colors.error}
            />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={[styles.resultText, { color: uploadResult.status === 'success' ? colors.success : colors.error }]}>
                {uploadResult.message}
              </Text>
              {uploadResult.finalName && (
                <Text style={styles.resultSub}>Saved: {uploadResult.finalName}</Text>
              )}
            </View>
          </View>
        )}

        {/* Upload Button */}
        <TouchableOpacity
          onPress={handleUpload}
          disabled={uploading || !allSlotsFilled || !selectedClient || !selectedFormat}
          style={{ marginTop: spacing.lg }}
        >
          <LinearGradient
            colors={
              uploading || !allSlotsFilled || !selectedClient || !selectedFormat
                ? [colors.surfaceElevated, colors.surfaceElevated]
                : ['#6C63FF', '#4F46E5']
            }
            style={styles.uploadBtn}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="cloud-upload" size={22} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.uploadBtnText}>
                  {!selectedClient || !selectedFormat ? 'Select Client & Type' : !allSlotsFilled ? 'Add Files First' : pageCount === '2' ? 'Merge & Upload' : 'Upload Document'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
        {/* Source Selection Modal */}
        {optionsSlotIndex !== null && (
          <Modal
            transparent={true}
            animationType="fade"
            visible={true}
            onRequestClose={() => setOptionsSlotIndex(null)}
          >
            <TouchableOpacity 
              style={styles.modalOverlay} 
              activeOpacity={1} 
              onPress={() => setOptionsSlotIndex(null)}
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Source</Text>
                <Text style={styles.modalSub}>Choose how to add your invoice</Text>
                
                <TouchableOpacity style={styles.modalOption} onPress={() => { const idx = optionsSlotIndex; setOptionsSlotIndex(null); captureFromCamera(idx); }}>
                  <MaterialCommunityIcons name="camera" size={24} color={colors.primary} />
                  <Text style={styles.modalOptionText}>Camera</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.modalOption} onPress={() => { const idx = optionsSlotIndex; setOptionsSlotIndex(null); pickFromGallery(idx); }}>
                  <MaterialCommunityIcons name="image" size={24} color={colors.accent} />
                  <Text style={styles.modalOptionText}>Gallery</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.modalOption} onPress={() => { const idx = optionsSlotIndex; setOptionsSlotIndex(null); pickDocument(idx); }}>
                  <MaterialCommunityIcons name="file-document" size={24} color={colors.info} />
                  <Text style={styles.modalOptionText}>Document</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.modalCancel} onPress={() => setOptionsSlotIndex(null)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: 60 },
  header: { marginBottom: spacing.xxl },
  headerTitle: { fontSize: fontSize.xxl + 4, fontWeight: '800', color: colors.textPrimary },
  headerAccent: { color: colors.primary },
  headerSub: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 4 },
  label: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textSecondary, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8 },
  picker: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  pickerDisabled: { opacity: 0.5 },
  pickerText: { flex: 1, marginLeft: spacing.md, fontSize: fontSize.md, color: colors.textPrimary, fontWeight: '500' },
  pickerPlaceholder: { color: colors.textMuted },
  dropdownContainer: { marginTop: -spacing.md, marginBottom: spacing.lg },
  dropdown: {
    backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.lg,
    maxHeight: 200, borderWidth: 1, borderColor: colors.border,
  },
  dropdownItem: { padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  dropdownText: { fontSize: fontSize.md, color: colors.textPrimary },
  pageToggle: { flexDirection: 'row', marginBottom: spacing.xl, gap: spacing.sm },
  pageOption: {
    flex: 1, paddingVertical: spacing.md + 2, borderRadius: borderRadius.lg,
    backgroundColor: colors.surface, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  pageOptionActive: { backgroundColor: colors.primaryGlow, borderColor: colors.primary },
  pageOptionText: { fontSize: fontSize.md, fontWeight: '600', color: colors.textSecondary },
  pageOptionTextActive: { color: colors.primary },
  tipsCard: {
    flexDirection: 'row', padding: spacing.lg, borderRadius: borderRadius.lg,
    marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.border,
  },
  tipsContent: { flex: 1, marginLeft: spacing.md },
  tipsTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  tipItem: { fontSize: fontSize.xs + 1, color: colors.textSecondary, lineHeight: 20 },
  fileSlot: { marginBottom: spacing.md },
  filePreview: {
    flexDirection: 'row', backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  previewImage: { width: 70, height: 90, borderRadius: borderRadius.sm, backgroundColor: colors.surfaceElevated },
  pdfIcon: { width: 70, height: 90, borderRadius: borderRadius.sm, backgroundColor: colors.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
  fileInfo: { flex: 1, marginLeft: spacing.md },
  fileName: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary },
  fileSize: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  removeText: { fontSize: fontSize.xs, color: colors.error, fontWeight: '600', marginTop: spacing.sm },
  addFileBtn: { borderRadius: borderRadius.lg, overflow: 'hidden' },
  addFileBtnInner: {
    padding: spacing.xxl, alignItems: 'center', justifyContent: 'center',
    borderRadius: borderRadius.lg, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
  },
  addFileText: { fontSize: fontSize.md, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.sm },
  addFileHint: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4 },
  resultCard: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.lg,
    borderRadius: borderRadius.lg, marginTop: spacing.md, borderWidth: 1,
  },
  resultSuccess: { backgroundColor: colors.successBg, borderColor: 'rgba(16,185,129,0.3)' },
  resultError: { backgroundColor: colors.errorBg, borderColor: 'rgba(239,68,68,0.3)' },
  resultText: { fontSize: fontSize.sm, fontWeight: '600' },
  resultSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  uploadBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: spacing.lg + 2, borderRadius: borderRadius.lg, ...shadows.glow,
  },
  uploadBtnText: { fontSize: fontSize.md, fontWeight: '700', color: '#fff' },
  branchInfoCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.lg, marginBottom: spacing.xl,
    borderWidth: 1, borderColor: colors.border,
    flexDirection: 'row', justifyContent: 'space-around',
  },
  branchInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  branchInfoLabel: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: '600' },
  branchInfoValue: { fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.surfaceElevated, width: '85%', borderRadius: borderRadius.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  modalTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary, marginBottom: 4, textAlign: 'center' },
  modalSub: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.xl, textAlign: 'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, backgroundColor: colors.surface, borderRadius: borderRadius.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  modalOptionText: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary, marginLeft: spacing.md },
  modalCancel: { marginTop: spacing.md, paddingVertical: spacing.sm, alignItems: 'center' },
  modalCancelText: { fontSize: fontSize.md, fontWeight: '600', color: colors.textMuted },
});
