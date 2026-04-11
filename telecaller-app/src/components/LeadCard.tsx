import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Animated,
  Pressable,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Lead } from '../types';
import {
  formatPhoneNumber,
  formatLeadStatus,
  getLeadStatusColor,
} from '../utils/formatters';

interface LeadCardProps {
  lead: Lead;
  onCall: (lead: Lead) => void;
  onPress?: (lead: Lead) => void;
  style?: ViewStyle;
}

const STATUS_ICONS: Record<string, string> = {
  NEW: 'star-four-points',
  CONTACTED: 'phone-check',
  QUALIFIED: 'check-decagram',
  NEGOTIATION: 'handshake',
  CONVERTED: 'trophy',
  LOST: 'close-circle',
};

const AVATAR_GRADIENTS: Array<[string, string]> = [
  ['#6B4EE6', '#A06CD5'],
  ['#5B8DEF', '#4FC3F7'],
  ['#F06292', '#E66B5A'],
  ['#10B981', '#34D399'],
  ['#F59E0B', '#FCD34D'],
  ['#A06CD5', '#F06292'],
];

const pickGradient = (name: string): [string, string] => {
  const sum = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[sum % AVATAR_GRADIENTS.length];
};

const LeadCard: React.FC<LeadCardProps> = ({ lead, onCall, onPress, style }) => {
  const statusColor = getLeadStatusColor(lead.status);
  const statusIcon = STATUS_ICONS[lead.status] || 'account';
  const avatarColors = pickGradient(lead.name);

  const scale = useRef(new Animated.Value(1)).current;
  const animate = (to: number) =>
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      friction: 6,
      tension: 140,
    }).start();

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getTimeAgo = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const m = Math.floor(diffMs / 60000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (m < 60) return `${m}m`;
    if (h < 24) return `${h}h`;
    if (d < 7) return `${d}d`;
    return date.toLocaleDateString();
  };

  return (
    <Pressable
      onPress={() => onPress?.(lead)}
      onPressIn={() => animate(0.98)}
      onPressOut={() => animate(1)}
    >
      <Animated.View style={[styles.container, style, { transform: [{ scale }] }]}>
        {/* Left accent stripe */}
        <View style={[styles.accent, { backgroundColor: statusColor }]} />

        {/* Avatar with gradient */}
        <LinearGradient
          colors={avatarColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>{getInitials(lead.name)}</Text>
        </LinearGradient>

        {/* Lead Info */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {lead.name}
            </Text>
            {lead.lastContactedAt && (
              <View style={styles.timePill}>
                <Icon name="clock-outline" size={10} color="#6B7280" />
                <Text style={styles.timeAgo}>{getTimeAgo(lead.lastContactedAt)}</Text>
              </View>
            )}
          </View>

          <View style={styles.detailsRow}>
            <Icon name="phone-outline" size={12} color="#94A3B8" />
            <Text style={styles.phone}>{formatPhoneNumber(lead.phone)}</Text>
            {lead.company && (
              <>
                <View style={styles.dot} />
                <Icon name="office-building" size={12} color="#94A3B8" />
                <Text style={styles.company} numberOfLines={1}>
                  {lead.company}
                </Text>
              </>
            )}
          </View>

          <View style={styles.bottomRow}>
            <View style={[styles.status, { backgroundColor: statusColor + '18', borderColor: statusColor + '30' }]}>
              <Icon name={statusIcon} size={11} color={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {formatLeadStatus(lead.status)}
              </Text>
            </View>
            {lead.source && (
              <View style={styles.sourceTag}>
                <Icon name="tag-outline" size={10} color="#64748B" />
                <Text style={styles.sourceText} numberOfLines={1}>
                  {lead.source}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Call Button */}
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation?.();
            onCall(lead);
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.callBtn}
          >
            <Icon name="phone" size={20} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 6,
    paddingVertical: 14,
    paddingHorizontal: 14,
    paddingLeft: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    letterSpacing: -0.2,
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
    gap: 3,
  },
  timeAgo: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  phone: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 4,
  },
  company: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    maxWidth: 100,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sourceText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    maxWidth: 70,
  },
  callBtn: {
    width: 46,
    height: 46,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
});

export default LeadCard;
