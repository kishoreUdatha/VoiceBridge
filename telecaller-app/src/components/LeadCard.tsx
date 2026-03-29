import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
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
  NEW: 'account-plus',
  CONTACTED: 'phone-check',
  QUALIFIED: 'check-decagram',
  NEGOTIATION: 'handshake',
  CONVERTED: 'check-circle',
  LOST: 'close-circle',
};

const LeadCard: React.FC<LeadCardProps> = ({ lead, onCall, onPress, style }) => {
  const statusColor = getLeadStatusColor(lead.status);
  const statusIcon = STATUS_ICONS[lead.status] || 'account';

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getTimeAgo = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => onPress?.(lead)}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: statusColor + '20' }]}>
        <Text style={[styles.avatarText, { color: statusColor }]}>
          {getInitials(lead.name)}
        </Text>
      </View>

      {/* Lead Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{lead.name}</Text>
          {lead.lastContactedAt && (
            <Text style={styles.timeAgo}>{getTimeAgo(lead.lastContactedAt)}</Text>
          )}
        </View>
        <View style={styles.detailsRow}>
          <Icon name="phone" size={12} color="#94A3B8" />
          <Text style={styles.phone}>{formatPhoneNumber(lead.phone)}</Text>
          {lead.company && (
            <>
              <Text style={styles.dot}>•</Text>
              <Icon name="office-building" size={12} color="#94A3B8" />
              <Text style={styles.company} numberOfLines={1}>{lead.company}</Text>
            </>
          )}
        </View>
        <View style={styles.bottomRow}>
          <View style={[styles.status, { backgroundColor: statusColor + '15' }]}>
            <Icon name={statusIcon} size={12} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {formatLeadStatus(lead.status)}
            </Text>
          </View>
          {lead.source && (
            <View style={styles.sourceTag}>
              <Icon name="tag-outline" size={10} color="#64748B" />
              <Text style={styles.sourceText}>{lead.source}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Call Button */}
      <TouchableOpacity
        style={styles.callBtn}
        onPress={(e) => {
          e.stopPropagation?.();
          onCall(lead);
        }}
        activeOpacity={0.7}
      >
        <Icon name="phone" size={20} color="#FFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  timeAgo: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 8,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  phone: {
    fontSize: 12,
    color: '#64748B',
  },
  dot: {
    color: '#CBD5E1',
    marginHorizontal: 4,
  },
  company: {
    fontSize: 12,
    color: '#64748B',
    maxWidth: 100,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 3,
  },
  sourceText: {
    fontSize: 10,
    color: '#64748B',
  },
  callBtn: {
    backgroundColor: '#10B981',
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
});

export default LeadCard;
