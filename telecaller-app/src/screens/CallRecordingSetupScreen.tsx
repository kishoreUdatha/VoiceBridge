import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  NativeModules,
  Linking,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Detects the device manufacturer/brand and returns brand-specific instructions
 * for enabling the system call recorder. Recording capture is then handled by
 * the existing CallRecordingModule.findSystemCallRecording() scraper.
 */

type SupportLevel = 'supported' | 'partial' | 'unsupported';

interface BrandGuide {
  brand: string;
  level: SupportLevel;
  steps: string[];
  notes?: string;
}

const detectBrand = (manufacturer: string, brand: string): BrandGuide => {
  const m = (manufacturer || '').toLowerCase();
  const b = (brand || '').toLowerCase();
  const k = `${m} ${b}`;

  if (k.includes('xiaomi') || k.includes('redmi') || k.includes('poco')) {
    return {
      brand: 'Xiaomi / Redmi / Poco (MIUI / HyperOS)',
      level: 'supported',
      steps: [
        'Open the system Phone (Mi Dialer) app',
        'Tap the ⋮ menu (top right) → Settings',
        'Tap "Call recording"',
        'Turn on "Record calls automatically"',
        'Choose "All calls" (or pick specific contacts)',
      ],
      notes:
        'If the Call Recording option is missing, change your Mi region to India: Settings → Additional settings → Region → India, then reopen the Phone app.',
    };
  }
  if (k.includes('vivo') || k.includes('iqoo')) {
    return {
      brand: 'Vivo / iQOO (Funtouch / OriginOS)',
      level: 'supported',
      steps: [
        'Open the system Phone app',
        'Tap ⋮ menu → Settings → Call settings',
        'Tap "Call recording"',
        'Turn on "Auto record calls" → choose "All calls"',
      ],
    };
  }
  if (k.includes('oppo')) {
    return {
      brand: 'Oppo (ColorOS)',
      level: 'supported',
      steps: [
        'Open the system Phone app',
        'Tap ⋮ menu → Settings',
        'Tap "Call recording"',
        'Turn on "Auto record all calls"',
      ],
    };
  }
  if (k.includes('realme')) {
    return {
      brand: 'Realme (Realme UI)',
      level: 'supported',
      steps: [
        'Open the system Phone app',
        'Tap ⋮ menu → Settings → Call recording',
        'Turn on "Auto record all calls"',
      ],
    };
  }
  if (k.includes('oneplus')) {
    return {
      brand: 'OnePlus (OxygenOS / ColorOS)',
      level: 'partial',
      steps: [
        'Open the system Phone app',
        'Tap ⋮ menu → Settings → Call recording',
        'Turn on "Auto record calls"',
      ],
      notes:
        'OnePlus Global ROMs (8/9/10 series) may not have call recording. Newer 11/12/13 series have it restored. If the option is missing, your model does not support it.',
    };
  }
  if (k.includes('honor')) {
    return {
      brand: 'Honor (Magic OS)',
      level: 'supported',
      steps: [
        'Open the system Phone app',
        'Tap ⋮ menu → Settings → Record calls',
        'Turn on "Auto record"',
      ],
    };
  }
  if (k.includes('huawei')) {
    return {
      brand: 'Huawei (EMUI / HarmonyOS)',
      level: 'partial',
      steps: [
        'Open the system Phone app',
        'Tap ⋮ menu → Settings → Record calls',
        'Turn on "Auto record"',
      ],
      notes:
        'Newer Huawei devices (HarmonyOS 3+) may have call recording removed in some regions.',
    };
  }
  if (k.includes('samsung')) {
    return {
      brand: 'Samsung (One UI)',
      level: 'partial',
      steps: [
        'Open the Samsung Phone app',
        'Tap ⋮ menu → Settings',
        'Tap "Record calls"',
        'Turn on "Auto record calls" → choose "All calls"',
      ],
      notes:
        'Samsung removes call recording in EU, US, UK, Canada, and Australia. If the option is missing, your region prevents it. The only fix is changing the device CSC region code (advanced/risky), or using a supported brand.',
    };
  }
  if (k.includes('nothing')) {
    return {
      brand: 'Nothing Phone (Nothing OS)',
      level: 'partial',
      steps: [
        'Open the Nothing Phone app',
        'Tap ⋮ menu → Settings → Call recording',
        'Turn on "Auto record calls"',
      ],
      notes: 'Available only on Nothing OS 2.5+ in India.',
    };
  }
  if (k.includes('tecno') || k.includes('infinix') || k.includes('itel')) {
    return {
      brand: `${manufacturer} (HiOS / XOS)`,
      level: 'partial',
      steps: [
        'Open the system Phone app',
        'Tap ⋮ menu → Settings → Call recording',
        'Turn on "Auto record"',
      ],
      notes:
        'Support varies by model and firmware. If the option is not visible, your model does not include it.',
    };
  }
  if (
    k.includes('google') ||
    k.includes('pixel') ||
    k.includes('motorola') ||
    k.includes('moto') ||
    k.includes('nokia') ||
    k.includes('hmd') ||
    k.includes('sony') ||
    k.includes('asus') ||
    k.includes('fairphone')
  ) {
    return {
      brand: manufacturer || 'Stock Android',
      level: 'unsupported',
      steps: [],
      notes:
        'This device does not ship with a built-in call recorder. Google removed the call recording API from Android 9, and your manufacturer did not add their own. Automatic call recording is not possible on this phone.',
    };
  }

  // Unknown brand — best guess: try the standard path
  return {
    brand: manufacturer || 'Unknown device',
    level: 'partial',
    steps: [
      'Open the system Phone app',
      'Tap the ⋮ menu (or settings icon)',
      'Look for "Call recording", "Record calls", or "Call settings"',
      'Turn on "Auto record" / "Record all calls"',
    ],
    notes:
      'We could not auto-detect your manufacturer. If the Phone app has no call-recording option, your device does not support it.',
  };
};

const CallRecordingSetupScreen: React.FC = () => {
  const [info, setInfo] = useState<{
    manufacturer: string;
    brand: string;
    model: string;
    sdk: number;
  } | null>(null);
  const [hasStorageAccess, setHasStorageAccess] = useState<boolean>(false);
  const [guide, setGuide] = useState<BrandGuide | null>(null);

  const refresh = useCallback(async () => {
    try {
      const dev: any = NativeModules.PlatformConstants
        ? await NativeModules.PlatformConstants?.getConstants?.()
        : null;
      const manufacturer =
        dev?.Manufacturer || (Platform.constants as any)?.Manufacturer || '';
      const brand = dev?.Brand || (Platform.constants as any)?.Brand || '';
      const model = dev?.Model || (Platform.constants as any)?.Model || '';
      const sdk = Platform.Version as number;

      const detected = { manufacturer, brand, model, sdk };
      setInfo(detected);
      setGuide(detectBrand(manufacturer, brand));
    } catch (e) {
      setGuide(detectBrand('', ''));
    }

    try {
      if (NativeModules.StoragePermission) {
        const ok = await NativeModules.StoragePermission.hasAllFilesAccess();
        setHasStorageAccess(!!ok);
      }
    } catch {
      setHasStorageAccess(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const requestStorage = useCallback(async () => {
    try {
      if (NativeModules.StoragePermission) {
        await NativeModules.StoragePermission.requestAllFilesAccess();
        Alert.alert(
          'Grant All Files Access',
          'Toggle "Allow access to all files" for this app, then return here.',
          [{ text: 'OK', onPress: refresh }]
        );
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to open storage settings');
    }
  }, [refresh]);

  const openSystemPhoneApp = useCallback(async () => {
    try {
      // Try to open the default dialer's settings via TelecomManager intent
      await Linking.openSettings();
    } catch {
      Alert.alert(
        'Open Phone App',
        'Please open your system Phone (Dialer) app manually and follow the steps below.'
      );
    }
  }, []);

  if (!guide) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Detecting your device...</Text>
      </View>
    );
  }

  const levelColors: Record<SupportLevel, string> = {
    supported: '#10B981',
    partial: '#F59E0B',
    unsupported: '#EF4444',
  };
  const levelLabels: Record<SupportLevel, string> = {
    supported: 'Supported',
    partial: 'Partially supported',
    unsupported: 'Not supported',
  };
  const levelIcons: Record<SupportLevel, string> = {
    supported: 'check-circle',
    partial: 'alert-circle',
    unsupported: 'close-circle',
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Icon name="record-rec" size={32} color="#3B82F6" />
        <Text style={styles.title}>Automatic Call Recording</Text>
        <Text style={styles.subtitle}>
          One-time setup to enable auto-recording for every outgoing call.
        </Text>
      </View>

      {/* Device card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Your device</Text>
        <Text style={styles.deviceName}>
          {info?.manufacturer} {info?.model}
        </Text>
        <View style={styles.statusRow}>
          <Icon
            name={levelIcons[guide.level]}
            size={20}
            color={levelColors[guide.level]}
          />
          <Text
            style={[styles.statusText, { color: levelColors[guide.level] }]}
          >
            {levelLabels[guide.level]} · {guide.brand}
          </Text>
        </View>
      </View>

      {/* Storage permission card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>1. Storage access</Text>
        <Text style={styles.cardBody}>
          The app needs "All files access" to read recordings saved by your
          phone's built-in recorder.
        </Text>
        <View style={styles.statusRow}>
          <Icon
            name={hasStorageAccess ? 'check-circle' : 'close-circle'}
            size={20}
            color={hasStorageAccess ? '#10B981' : '#EF4444'}
          />
          <Text
            style={[
              styles.statusText,
              { color: hasStorageAccess ? '#10B981' : '#EF4444' },
            ]}
          >
            {hasStorageAccess ? 'Granted' : 'Not granted'}
          </Text>
        </View>
        {!hasStorageAccess && (
          <TouchableOpacity style={styles.primaryButton} onPress={requestStorage}>
            <Text style={styles.primaryButtonText}>Grant All Files Access</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Instructions card */}
      {guide.level !== 'unsupported' ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>2. Enable auto-record in your Phone app</Text>
          {guide.steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
          {guide.notes ? (
            <View style={styles.noteBox}>
              <Icon name="information" size={16} color="#3B82F6" />
              <Text style={styles.noteText}>{guide.notes}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={openSystemPhoneApp}
          >
            <Text style={styles.secondaryButtonText}>Open System Settings</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.card, styles.unsupportedCard]}>
          <Icon name="alert-octagon" size={28} color="#EF4444" />
          <Text style={styles.unsupportedTitle}>
            Automatic recording is not possible on this device
          </Text>
          <Text style={styles.unsupportedBody}>{guide.notes}</Text>
          <Text style={styles.unsupportedHint}>
            Recommended supported brands: Xiaomi/Redmi, Vivo/iQOO, Oppo, Realme,
            Honor. For your current device, you can still place calls and log
            outcomes — just without an audio recording.
          </Text>
        </View>
      )}

      {/* How it works */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>How it works</Text>
        <Text style={styles.cardBody}>
          Once auto-record is enabled in your Phone app, every call you make is
          recorded by the system in the background. When the call ends, this
          app automatically picks up the new recording, uploads it, and runs
          AI transcription + analysis. No buttons to press, no speakerphone.
        </Text>
      </View>

      <TouchableOpacity style={styles.refreshLink} onPress={refresh}>
        <Icon name="refresh" size={16} color="#3B82F6" />
        <Text style={styles.refreshLinkText}>Re-check status</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 32 },
  loadingText: { textAlign: 'center', marginTop: 40, color: '#6B7280' },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  unsupportedCard: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 19,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusText: { fontSize: 13, fontWeight: '500' },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { fontSize: 12, fontWeight: '600', color: '#3B82F6' },
  stepText: { flex: 1, fontSize: 14, color: '#1F2937', lineHeight: 20 },
  noteBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  noteText: { flex: 1, fontSize: 12, color: '#1E40AF', lineHeight: 17 },
  primaryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: { color: '#1F2937', fontSize: 14, fontWeight: '600' },
  unsupportedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991B1B',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  unsupportedBody: {
    fontSize: 13,
    color: '#7F1D1D',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 8,
  },
  unsupportedHint: {
    fontSize: 12,
    color: '#991B1B',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
  },
  refreshLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 12,
  },
  refreshLinkText: { color: '#3B82F6', fontSize: 14, fontWeight: '500' },
});

export default CallRecordingSetupScreen;
