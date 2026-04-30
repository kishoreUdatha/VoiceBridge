import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { RootStackParamList, Lead, Call, LeadStatus } from '../types';
import { useAppSelector, useAppDispatch } from '../store';
import { fetchLeadById, updateLeadStatus } from '../store/slices/leadsSlice';
import { fetchCallHistory } from '../store/slices/callsSlice';
import leadDetailsApi, { LeadNote, LeadTask, FollowUp, LeadActivity, CallLog } from '../api/leadDetails';
import stagesApi, { LeadStage } from '../api/stages';
import { getDisplayName, getNameInitials } from '../utils/formatters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'LeadDetail'>;
type TabId = 'overview' | 'calls' | 'notes' | 'tasks' | 'followups' | 'timeline';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const STATUS_COLORS: Record<LeadStatus, string> = {
  NEW: '#3B82F6',
  CONTACTED: '#F59E0B',
  QUALIFIED: '#8B5CF6',
  NEGOTIATION: '#EC4899',
  CONVERTED: '#10B981',
  LOST: '#EF4444',
};

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', icon: 'account-details' },
  { id: 'calls', label: 'Calls', icon: 'phone' },
  { id: 'notes', label: 'Notes', icon: 'note-text' },
  { id: 'tasks', label: 'Tasks', icon: 'checkbox-marked-circle' },
  { id: 'followups', label: 'Follow-ups', icon: 'calendar-clock' },
  { id: 'timeline', label: 'Activity', icon: 'history' },
];

const LeadDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { leadId } = route.params;
  const dispatch = useAppDispatch();
  const { selectedLead, isLoading, error } = useAppSelector((state) => state.leads);
  const { calls } = useAppSelector((state) => state.calls);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Stages from API
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [progressStages, setProgressStages] = useState<LeadStage[]>([]);
  const [loadingStages, setLoadingStages] = useState(true);
  const [selectedStageId, setSelectedStageId] = useState<string>('');

  // Tab data states
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [tasks, setTasks] = useState<LeadTask[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loadingTab, setLoadingTab] = useState(false);

  // Form states
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Task modal state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [addingTask, setAddingTask] = useState(false);

  // Follow-up modal state
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpDate, setFollowUpDate] = useState(new Date());
  const [followUpMessage, setFollowUpMessage] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');
  const [addingFollowUp, setAddingFollowUp] = useState(false);

  const loadLeadData = useCallback(async () => {
    try {
      await Promise.all([
        dispatch(fetchLeadById(leadId)),
        dispatch(fetchCallHistory({ leadId })),
      ]);
    } catch (error) {
      console.error('[LeadDetail] Error loading lead:', error);
    }
  }, [dispatch, leadId]);

  // Load tab-specific data
  const loadTabData = useCallback(async (tab: TabId) => {
    if (!leadId) return;
    setLoadingTab(true);
    try {
      switch (tab) {
        case 'notes':
          const notesData = await leadDetailsApi.getNotes(leadId);
          setNotes(notesData);
          break;
        case 'tasks':
          const tasksData = await leadDetailsApi.getTasks(leadId);
          setTasks(tasksData);
          break;
        case 'followups':
          const followUpsData = await leadDetailsApi.getFollowUps(leadId);
          setFollowUps(followUpsData);
          break;
        case 'timeline':
          const activitiesData = await leadDetailsApi.getActivities(leadId, 50);
          setActivities(activitiesData);
          break;
        case 'calls':
          const callsData = await leadDetailsApi.getCallLogs(leadId);
          setCallLogs(callsData);
          break;
      }
    } catch (error) {
      console.log('[LeadDetail] Error loading tab data:', error);
    } finally {
      setLoadingTab(false);
    }
  }, [leadId]);

  // Load stages from API on mount
  useEffect(() => {
    const loadStages = async () => {
      try {
        setLoadingStages(true);
        const { progressStages: pStages, lostStage } = await stagesApi.getJourneyStages();
        setProgressStages(pStages);
        const allStages = [...pStages];
        if (lostStage) allStages.push(lostStage);
        setStages(allStages);
        console.log('[LeadDetail] Loaded stages:', pStages.map(s => ({ id: s.id, name: s.name })));
      } catch (error) {
        console.error('[LeadDetail] Error loading stages:', error);
      } finally {
        setLoadingStages(false);
      }
    };
    loadStages();
  }, []);

  // Refresh data when screen gains focus (e.g., navigating back from EditLead)
  useFocusEffect(
    useCallback(() => {
      console.log('[LeadDetail] Screen focused, refreshing lead data');
      loadLeadData();
    }, [loadLeadData])
  );

  // Set selected stage when lead data loads (use pipelineStageId for unified system - same as web)
  useEffect(() => {
    if (selectedLead) {
      const lead = selectedLead as any;
      console.log('[LeadDetail] Lead loaded, pipelineStageId:', lead.pipelineStageId, 'stageId:', lead.stageId);
      // Prefer pipelineStageId (unified system used by web), fallback to stageId (legacy)
      if (lead.pipelineStageId) {
        setSelectedStageId(lead.pipelineStageId);
        console.log('[LeadDetail] Set selectedStageId from pipelineStageId:', lead.pipelineStageId);
      } else if (lead.stageId) {
        setSelectedStageId(lead.stageId);
        console.log('[LeadDetail] Set selectedStageId from stageId:', lead.stageId);
      } else if (lead.stage?.id) {
        setSelectedStageId(lead.stage.id);
        console.log('[LeadDetail] Set selectedStageId from stage.id:', lead.stage.id);
      }
    }
  }, [selectedLead]);

  // Load tab data when tab changes
  useEffect(() => {
    if (activeTab !== 'overview') {
      loadTabData(activeTab);
    }
  }, [activeTab, loadTabData]);

  // Handlers
  const handleAddNote = async () => {
    if (!newNote.trim() || !leadId) return;
    setAddingNote(true);
    try {
      const note = await leadDetailsApi.createNote(leadId, { content: newNote.trim() });
      setNotes(prev => [note, ...prev]);
      setNewNote('');
    } catch (error) {
      Alert.alert('Error', 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleAddTask = async () => {
    if (!taskTitle.trim() || !leadId) return;
    setAddingTask(true);
    try {
      const task = await leadDetailsApi.createTask(leadId, {
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
        priority: taskPriority,
      });
      setTasks(prev => [task, ...prev]);
      setTaskTitle('');
      setTaskDescription('');
      setShowTaskModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to create task');
    } finally {
      setAddingTask(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await leadDetailsApi.updateTask(leadId, taskId, { status: 'COMPLETED' });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'COMPLETED' } : t));
    } catch (error) {
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const handleAddFollowUp = async () => {
    if (!leadId) return;
    setAddingFollowUp(true);
    try {
      const followUp = await leadDetailsApi.createFollowUp(leadId, {
        scheduledAt: followUpDate.toISOString(),
        message: followUpMessage.trim() || undefined,
      });
      setFollowUps(prev => [followUp, ...prev]);
      setFollowUpMessage('');
      setShowFollowUpModal(false);
      Alert.alert('Success', 'Follow-up scheduled successfully');
    } catch (error: any) {
      // Show the actual error message from the backend
      const errorMessage = error.response?.data?.message || 'Failed to schedule follow-up';
      Alert.alert('Error', errorMessage);
      console.log('[LeadDetail] Follow-up error:', error.response?.data || error.message);
    } finally {
      setAddingFollowUp(false);
    }
  };

  const handleCompleteFollowUp = async (followUpId: string) => {
    try {
      await leadDetailsApi.updateFollowUp(leadId, followUpId, { status: 'COMPLETED' });
      setFollowUps(prev => prev.map(f => f.id === followUpId ? { ...f, status: 'COMPLETED' } : f));
    } catch (error) {
      Alert.alert('Error', 'Failed to update follow-up');
    }
  };

  const handleStageChange = async (stageId: string) => {
    if (selectedLead) {
      const previousStageId = selectedStageId;
      try {
        console.log('[LeadDetail] Changing stage from', previousStageId, 'to', stageId);
        setSelectedStageId(stageId);
        setShowStatusPicker(false);

        const result = await stagesApi.updateLeadStage(leadId, stageId);
        console.log('[LeadDetail] Stage update result:', result);

        // Reload lead data to confirm the change
        await loadLeadData();

        Alert.alert('Success', 'Stage updated successfully');
      } catch (error: any) {
        console.error('[LeadDetail] Stage update failed:', error);
        // Revert to previous stage on error
        setSelectedStageId(previousStageId);
        Alert.alert('Error', error.response?.data?.message || 'Failed to update lead stage');
      }
    }
  };

  const handleCall = () => {
    if (selectedLead) {
      navigation.navigate('Call', { lead: selectedLead });
    }
  };

  const handleWhatsApp = () => {
    if (selectedLead?.phone) {
      const phone = selectedLead.phone.replace(/\D/g, '');
      Linking.openURL(`whatsapp://send?phone=${phone}`);
    }
  };

  const handleSMS = () => {
    if (selectedLead?.phone) {
      Linking.openURL(`sms:${selectedLead.phone}`);
    }
  };

  const handleEmail = () => {
    if (selectedLead?.email) {
      Linking.openURL(`mailto:${selectedLead.email}`);
    }
  };

  const handleEdit = () => {
    navigation.navigate('EditLead', { leadId });
  };

  // Helper functions
  const getCurrentStage = () => {
    if (selectedStageId) {
      return stages.find(s => s.id === selectedStageId);
    }
    return selectedLead?.stage || null;
  };

  const getCurrentStageName = () => {
    const stage = getCurrentStage();
    return stage?.name || selectedLead?.status || 'Unknown';
  };

  const getCurrentStageColor = () => {
    const stage = getCurrentStage();
    if (stage?.color) return stage.color;
    return STATUS_COLORS[selectedLead?.status || 'NEW'] || '#6B7280';
  };

  const getCurrentStageIndex = () => {
    // First try using selectedStageId
    if (selectedStageId && progressStages.length > 0) {
      const index = progressStages.findIndex(s => s.id === selectedStageId);
      if (index >= 0) {
        console.log('[LeadDetail] Stage index from selectedStageId:', index + 1);
        return index + 1;
      }
    }
    // Then try using selectedLead.stageId directly
    if (selectedLead?.stageId && progressStages.length > 0) {
      const index = progressStages.findIndex(s => s.id === selectedLead.stageId);
      if (index >= 0) {
        console.log('[LeadDetail] Stage index from selectedLead.stageId:', index + 1);
        return index + 1;
      }
    }
    // Then try using selectedLead.stage.id
    if (selectedLead?.stage?.id && progressStages.length > 0) {
      const index = progressStages.findIndex(s => s.id === selectedLead.stage!.id);
      if (index >= 0) {
        console.log('[LeadDetail] Stage index from selectedLead.stage.id:', index + 1);
        return index + 1;
      }
    }
    // Try matching by name
    if (selectedLead?.stage?.name && progressStages.length > 0) {
      const index = progressStages.findIndex(s => s.name.toLowerCase() === selectedLead.stage!.name.toLowerCase());
      if (index >= 0) {
        console.log('[LeadDetail] Stage index from stage name:', index + 1);
        return index + 1;
      }
    }
    console.log('[LeadDetail] No stage match found, returning 0');
    return 0;
  };

  const getInitials = () => {
    const name = selectedLead?.name || '';
    const parts = name.split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase() || '??';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return '#EF4444';
      case 'HIGH': return '#F59E0B';
      case 'MEDIUM': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'CALL': return '#10B981';
      case 'NOTE': return '#3B82F6';
      case 'TASK': return '#8B5CF6';
      case 'STATUS_CHANGE': return '#F59E0B';
      default: return '#6366F1';
    }
  };

  const leadCalls = calls.filter((call) => call.leadId === leadId);

  if (isLoading && !selectedLead) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!selectedLead) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="account-off" size={64} color="#9CA3AF" />
        <Text style={styles.errorText}>{error || 'Lead not found'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadLeadData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render tab content
  const renderTabContent = () => {
    if (loadingTab) {
      return (
        <View style={styles.loadingTab}>
          <ActivityIndicator size="small" color="#4F46E5" />
        </View>
      );
    }

    switch (activeTab) {
      case 'overview':
        return (
          <View style={styles.overviewContent}>
            {/* Quick Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Icon name="phone" size={20} color="#10B981" />
                <Text style={styles.statValue}>{callLogs.length || leadCalls.length}</Text>
                <Text style={styles.statLabel}>Calls</Text>
              </View>
              <View style={styles.statCard}>
                <Icon name="note-text" size={20} color="#3B82F6" />
                <Text style={styles.statValue}>{notes.length}</Text>
                <Text style={styles.statLabel}>Notes</Text>
              </View>
              <View style={styles.statCard}>
                <Icon name="checkbox-marked" size={20} color="#8B5CF6" />
                <Text style={styles.statValue}>{tasks.filter(t => t.status !== 'COMPLETED').length}</Text>
                <Text style={styles.statLabel}>Tasks</Text>
              </View>
              <View style={styles.statCard}>
                <Icon name="calendar-clock" size={20} color="#F59E0B" />
                <Text style={styles.statValue}>{followUps.filter(f => f.status === 'UPCOMING').length}</Text>
                <Text style={styles.statLabel}>Follow-ups</Text>
              </View>
            </View>

            {/* Contact Card */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              <View style={styles.contactGrid}>
                <TouchableOpacity style={styles.contactItem} onPress={() => Linking.openURL(`tel:${selectedLead.phone}`)}>
                  <View style={[styles.contactIcon, { backgroundColor: '#ECFDF5' }]}>
                    <Icon name="phone" size={18} color="#10B981" />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactLabel}>Phone</Text>
                    <Text style={styles.contactValue}>{selectedLead.phone}</Text>
                  </View>
                  <Icon name="chevron-right" size={18} color="#D1D5DB" />
                </TouchableOpacity>

                {selectedLead.email && (
                  <TouchableOpacity style={styles.contactItem} onPress={handleEmail}>
                    <View style={[styles.contactIcon, { backgroundColor: '#EFF6FF' }]}>
                      <Icon name="email" size={18} color="#3B82F6" />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactLabel}>Email</Text>
                      <Text style={styles.contactValue} numberOfLines={1}>{selectedLead.email}</Text>
                    </View>
                    <Icon name="chevron-right" size={18} color="#D1D5DB" />
                  </TouchableOpacity>
                )}

                {selectedLead.company && (
                  <View style={styles.contactItem}>
                    <View style={[styles.contactIcon, { backgroundColor: '#F5F3FF' }]}>
                      <Icon name="domain" size={18} color="#8B5CF6" />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactLabel}>Company</Text>
                      <Text style={styles.contactValue}>{selectedLead.company}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.contactItem}>
                  <View style={[styles.contactIcon, { backgroundColor: '#FEF3C7' }]}>
                    <Icon name="tag" size={18} color="#F59E0B" />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactLabel}>Source</Text>
                    <Text style={styles.contactValue}>{selectedLead.source || 'Unknown'}</Text>
                  </View>
                </View>

                <View style={styles.contactItem}>
                  <View style={[styles.contactIcon, { backgroundColor: '#E0E7FF' }]}>
                    <Icon name="calendar" size={18} color="#6366F1" />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactLabel}>Created</Text>
                    <Text style={styles.contactValue}>{formatDate(selectedLead.createdAt)}</Text>
                  </View>
                </View>
              </View>
            </View>

            {selectedLead.notes && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Notes</Text>
                <Text style={styles.leadNotes}>{selectedLead.notes}</Text>
              </View>
            )}
          </View>
        );

      case 'calls':
        return (
          <View style={styles.tabContentInner}>
            {(callLogs.length > 0 || leadCalls.length > 0) ? (
              (callLogs.length > 0 ? callLogs : leadCalls).map((call: any) => (
                <View key={call.id} style={styles.callCard}>
                  <View style={[styles.callIconWrap, { backgroundColor: call.status === 'COMPLETED' ? '#ECFDF5' : '#FEF2F2' }]}>
                    <Icon
                      name={call.direction === 'OUTBOUND' ? 'phone-outgoing' : 'phone-incoming'}
                      size={20}
                      color={call.status === 'COMPLETED' ? '#10B981' : '#EF4444'}
                    />
                  </View>
                  <View style={styles.callContent}>
                    <Text style={styles.callStatus}>{call.direction || 'Outbound'} Call</Text>
                    <Text style={styles.callTime}>{formatDateTime(call.createdAt)}</Text>
                  </View>
                  <View style={styles.callMeta}>
                    {call.duration ? (
                      <Text style={styles.callDuration}>
                        {Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}
                      </Text>
                    ) : (
                      <View style={[styles.callStatusBadge, { backgroundColor: call.status === 'COMPLETED' ? '#ECFDF5' : '#FEF2F2' }]}>
                        <Text style={[styles.callStatusText, { color: call.status === 'COMPLETED' ? '#059669' : '#DC2626' }]}>
                          {call.status}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Icon name="phone-off" size={32} color="#9CA3AF" />
                </View>
                <Text style={styles.emptyTitle}>No calls yet</Text>
                <Text style={styles.emptySubtext}>Make your first call to this lead</Text>
                <TouchableOpacity style={styles.emptyButton} onPress={handleCall}>
                  <Icon name="phone" size={18} color="#FFFFFF" />
                  <Text style={styles.emptyButtonText}>Call Now</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      case 'notes':
        return (
          <View style={styles.tabContentInner}>
            <View style={styles.addNoteBox}>
              <TextInput
                style={styles.noteInput}
                placeholder="Write a note..."
                placeholderTextColor="#9CA3AF"
                value={newNote}
                onChangeText={setNewNote}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendNoteBtn, (!newNote.trim() || addingNote) && styles.sendNoteBtnDisabled]}
                disabled={!newNote.trim() || addingNote}
                onPress={handleAddNote}
              >
                {addingNote ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Icon name="send" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            {notes.length > 0 ? (
              notes.map((note) => (
                <View key={note.id} style={styles.noteCard}>
                  <View style={styles.noteHeader}>
                    <View style={styles.noteAvatar}>
                      <Text style={styles.noteAvatarText}>
                        {getNameInitials(note.user?.firstName, note.user?.lastName)}
                      </Text>
                    </View>
                    <View style={styles.noteInfo}>
                      <Text style={styles.noteAuthor}>
                        {note.user ? getDisplayName(note.user.firstName, note.user.lastName) : 'You'}
                      </Text>
                      <Text style={styles.noteTime}>{formatDateTime(note.createdAt)}</Text>
                    </View>
                    {note.isPinned && <Icon name="pin" size={16} color="#F59E0B" />}
                  </View>
                  <Text style={styles.noteText}>{note.content}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Icon name="note-text-outline" size={32} color="#9CA3AF" />
                </View>
                <Text style={styles.emptyTitle}>No notes yet</Text>
                <Text style={styles.emptySubtext}>Add notes to track important details</Text>
              </View>
            )}
          </View>
        );

      case 'tasks':
        return (
          <View style={styles.tabContentInner}>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowTaskModal(true)}>
              <Icon name="plus" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Task</Text>
            </TouchableOpacity>

            {tasks.length > 0 ? (
              tasks.map((task) => (
                <View key={task.id} style={styles.taskCard}>
                  <TouchableOpacity
                    style={[styles.taskCheck, task.status === 'COMPLETED' && styles.taskCheckDone]}
                    onPress={() => task.status !== 'COMPLETED' && handleCompleteTask(task.id)}
                  >
                    {task.status === 'COMPLETED' && <Icon name="check" size={14} color="#FFFFFF" />}
                  </TouchableOpacity>
                  <View style={styles.taskContent}>
                    <Text style={[styles.taskTitle, task.status === 'COMPLETED' && styles.taskTitleDone]}>
                      {task.title}
                    </Text>
                    {task.description && (
                      <Text style={styles.taskDesc} numberOfLines={1}>{task.description}</Text>
                    )}
                    <View style={styles.taskFooter}>
                      <View style={[styles.priorityTag, { backgroundColor: getPriorityColor(task.priority) + '20' }]}>
                        <Text style={[styles.priorityTagText, { color: getPriorityColor(task.priority) }]}>
                          {task.priority}
                        </Text>
                      </View>
                      {task.dueDate && (
                        <Text style={styles.taskDue}>
                          <Icon name="calendar" size={12} color="#9CA3AF" /> {formatDate(task.dueDate)}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Icon name="checkbox-marked-circle-outline" size={32} color="#9CA3AF" />
                </View>
                <Text style={styles.emptyTitle}>No tasks</Text>
                <Text style={styles.emptySubtext}>Create tasks to track your to-dos</Text>
              </View>
            )}
          </View>
        );

      case 'followups':
        return (
          <View style={styles.tabContentInner}>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowFollowUpModal(true)}>
              <Icon name="plus" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Schedule Follow-up</Text>
            </TouchableOpacity>

            {followUps.length > 0 ? (
              followUps.map((fu) => (
                <View key={fu.id} style={styles.followUpCard}>
                  <View style={[styles.followUpIcon, fu.status === 'COMPLETED' ? styles.fuIconDone : styles.fuIconPending]}>
                    <Icon name={fu.status === 'COMPLETED' ? 'check' : 'calendar-clock'} size={18} color="#FFFFFF" />
                  </View>
                  <View style={styles.followUpContent}>
                    <Text style={styles.followUpDate}>{formatDateTime(fu.scheduledAt)}</Text>
                    {fu.message && <Text style={styles.followUpMsg} numberOfLines={2}>{fu.message}</Text>}
                    <View style={[styles.followUpBadge, { backgroundColor: fu.status === 'COMPLETED' ? '#ECFDF5' : '#FEF3C7' }]}>
                      <Text style={[styles.followUpBadgeText, { color: fu.status === 'COMPLETED' ? '#059669' : '#D97706' }]}>
                        {fu.status}
                      </Text>
                    </View>
                  </View>
                  {fu.status !== 'COMPLETED' && (
                    <TouchableOpacity style={styles.completeBtn} onPress={() => handleCompleteFollowUp(fu.id)}>
                      <Icon name="check-circle" size={24} color="#10B981" />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Icon name="calendar-clock" size={32} color="#9CA3AF" />
                </View>
                <Text style={styles.emptyTitle}>No follow-ups</Text>
                <Text style={styles.emptySubtext}>Schedule follow-ups to stay connected</Text>
              </View>
            )}
          </View>
        );

      case 'timeline':
        return (
          <View style={styles.tabContentInner}>
            {activities.length > 0 ? (
              <View style={styles.timeline}>
                {activities.map((activity, index) => (
                  <View key={activity.id} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineDot, { backgroundColor: getActivityColor(activity.type) }]} />
                      {index < activities.length - 1 && <View style={styles.timelineLine} />}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineTitle}>{activity.title}</Text>
                      {activity.description && (
                        <Text style={styles.timelineDesc} numberOfLines={2}>{activity.description}</Text>
                      )}
                      <Text style={styles.timelineTime}>{formatDateTime(activity.createdAt)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.timeline}>
                <View style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, { backgroundColor: '#6366F1' }]} />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Lead Created</Text>
                    <Text style={styles.timelineTime}>{formatDateTime(selectedLead.createdAt)}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <LinearGradient colors={[getCurrentStageColor(), getCurrentStageColor() + 'CC']} style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </LinearGradient>
            <View style={styles.headerInfo}>
              <Text style={styles.leadName} numberOfLines={1}>{selectedLead.name}</Text>
              <View style={styles.headerMeta}>
                <Text style={styles.leadPhone}>{selectedLead.phone}</Text>
                {selectedLead.company && (
                  <>
                    <Text style={styles.headerDot}>•</Text>
                    <Text style={styles.leadCompany} numberOfLines={1}>{selectedLead.company}</Text>
                  </>
                )}
              </View>
            </View>
            <TouchableOpacity style={styles.editIconBtn} onPress={handleEdit}>
              <Icon name="pencil" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Stage Badge */}
          <TouchableOpacity
            style={[styles.stageBadge, { backgroundColor: getCurrentStageColor() + '15', borderColor: getCurrentStageColor() }]}
            onPress={() => setShowStatusPicker(true)}
          >
            <View style={[styles.stageDot, { backgroundColor: getCurrentStageColor() }]} />
            <Text style={[styles.stageText, { color: getCurrentStageColor() }]}>{getCurrentStageName()}</Text>
            <Icon name="chevron-down" size={16} color={getCurrentStageColor()} />
          </TouchableOpacity>

          {/* Journey Progress */}
          {progressStages.length > 0 && (
            <View style={styles.journeySection}>
              <View style={styles.journeyHeader}>
                <Icon name="trending-up" size={16} color="#6B7280" />
                <Text style={styles.journeyTitle}>Journey Progress</Text>
                <Text style={styles.journeyCount}>
                  {getCurrentStageIndex()} of {progressStages.length}
                </Text>
              </View>
              <View style={styles.journeyBar}>
                <View
                  style={[
                    styles.journeyProgress,
                    {
                      width: `${(getCurrentStageIndex() / progressStages.length) * 100}%`,
                      backgroundColor: getCurrentStageColor()
                    }
                  ]}
                />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.journeyStages}>
                {progressStages.map((stage, index) => {
                  const isActive = stage.id === selectedStageId;
                  const isPast = index < getCurrentStageIndex() - 1;
                  return (
                    <View key={stage.id} style={styles.journeyStage}>
                      <View style={[
                        styles.journeyDot,
                        isPast && styles.journeyDotPast,
                        isActive && { backgroundColor: stage.color || '#4F46E5' }
                      ]}>
                        {isPast && <Icon name="check" size={10} color="#FFFFFF" />}
                        {!isPast && !isActive && <Text style={styles.journeyDotNum}>{index + 1}</Text>}
                      </View>
                      <Text style={[styles.journeyStageName, isActive && { color: stage.color || '#4F46E5', fontWeight: '600' }]} numberOfLines={1}>
                        {stage.name}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction} onPress={handleCall}>
              <LinearGradient colors={['#10B981', '#059669']} style={styles.quickActionIcon}>
                <Icon name="phone" size={22} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.quickActionLabel}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAction} onPress={handleWhatsApp}>
              <LinearGradient colors={['#25D366', '#128C7E']} style={styles.quickActionIcon}>
                <Icon name="whatsapp" size={22} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.quickActionLabel}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAction} onPress={handleSMS}>
              <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.quickActionIcon}>
                <Icon name="message-text" size={22} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.quickActionLabel}>SMS</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAction} onPress={handleEmail} disabled={!selectedLead.email}>
              <LinearGradient
                colors={selectedLead.email ? ['#F59E0B', '#D97706'] : ['#D1D5DB', '#9CA3AF']}
                style={styles.quickActionIcon}
              >
                <Icon name="email" size={22} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.quickActionLabel, !selectedLead.email && { color: '#9CA3AF' }]}>Email</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsCard}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsInner}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              let count = 0;
              if (tab.id === 'calls') count = callLogs.length || leadCalls.length;
              if (tab.id === 'tasks') count = tasks.filter(t => t.status !== 'COMPLETED').length;
              if (tab.id === 'followups') count = followUps.filter(f => f.status === 'UPCOMING').length;

              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tabItem, isActive && styles.tabItemActive]}
                  onPress={() => setActiveTab(tab.id)}
                >
                  <Icon name={tab.icon} size={18} color={isActive ? '#4F46E5' : '#9CA3AF'} />
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
                  {count > 0 && (
                    <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                      <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>{count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {renderTabContent()}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Call Button */}
      <TouchableOpacity style={styles.fab} onPress={handleCall}>
        <LinearGradient colors={['#10B981', '#059669']} style={styles.fabGradient}>
          <Icon name="phone" size={26} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Stage Picker Modal */}
      <Modal visible={showStatusPicker} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowStatusPicker(false)}>
          <View style={styles.stageModal}>
            <Text style={styles.stageModalTitle}>Select Stage</Text>
            <ScrollView style={styles.stageList} showsVerticalScrollIndicator={false}>
              {stages.map((stage) => {
                const isSelected = selectedStageId === stage.id;
                const isLost = (stage.journeyOrder || 0) < 0;
                return (
                  <TouchableOpacity
                    key={stage.id}
                    style={[styles.stageOption, isSelected && styles.stageOptionActive, isLost && styles.stageOptionLost]}
                    onPress={() => handleStageChange(stage.id)}
                  >
                    <View style={[styles.stageOptionDot, { backgroundColor: stage.color || '#6B7280' }]} />
                    <Text style={[styles.stageOptionText, isSelected && styles.stageOptionTextActive, isLost && { color: '#DC2626' }]}>
                      {stage.name}
                    </Text>
                    {isSelected && <Icon name="check" size={20} color="#4F46E5" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Task Modal */}
      <Modal visible={showTaskModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.formModal}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>New Task</Text>
              <TouchableOpacity onPress={() => setShowTaskModal(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.formInput}
              placeholder="Task title"
              placeholderTextColor="#9CA3AF"
              value={taskTitle}
              onChangeText={setTaskTitle}
            />
            <TextInput
              style={[styles.formInput, styles.formTextArea]}
              placeholder="Description (optional)"
              placeholderTextColor="#9CA3AF"
              value={taskDescription}
              onChangeText={setTaskDescription}
              multiline
            />
            <Text style={styles.formLabel}>Priority</Text>
            <View style={styles.priorityRow}>
              {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.priorityBtn, taskPriority === p && { backgroundColor: getPriorityColor(p) }]}
                  onPress={() => setTaskPriority(p)}
                >
                  <Text style={[styles.priorityBtnText, taskPriority === p && { color: '#FFFFFF' }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.formSubmit, (!taskTitle.trim() || addingTask) && styles.formSubmitDisabled]}
              onPress={handleAddTask}
              disabled={!taskTitle.trim() || addingTask}
            >
              {addingTask ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.formSubmitText}>Create Task</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Follow-up Modal */}
      <Modal visible={showFollowUpModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.formModal}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Schedule Follow-up</Text>
              <TouchableOpacity onPress={() => setShowFollowUpModal(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.formLabel}>Date & Time</Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity style={styles.dateTimeButton} onPress={() => { setDatePickerMode('date'); setShowDatePicker(true); }}>
                <Icon name="calendar" size={18} color="#6B7280" />
                <Text style={styles.dateTimeText}>
                  {followUpDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateTimeButton} onPress={() => { setDatePickerMode('time'); setShowDatePicker(true); }}>
                <Icon name="clock-outline" size={18} color="#6B7280" />
                <Text style={styles.dateTimeText}>
                  {followUpDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            </View>
            {showDatePicker && (
              <DateTimePicker
                value={followUpDate}
                mode={datePickerMode}
                display="default"
                minimumDate={datePickerMode === 'date' ? new Date() : undefined}
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (event.type === 'dismissed') return;
                  if (date) {
                    if (datePickerMode === 'date') {
                      // Keep the time from current followUpDate, but update the date
                      const newDate = new Date(date);
                      newDate.setHours(followUpDate.getHours(), followUpDate.getMinutes());
                      setFollowUpDate(newDate);
                    } else {
                      // Keep the date but update the time
                      const newDate = new Date(followUpDate);
                      newDate.setHours(date.getHours(), date.getMinutes());
                      setFollowUpDate(newDate);
                    }
                  }
                }}
              />
            )}
            <TextInput
              style={[styles.formInput, styles.formTextArea]}
              placeholder="Message/notes (optional)"
              placeholderTextColor="#9CA3AF"
              value={followUpMessage}
              onChangeText={setFollowUpMessage}
              multiline
            />
            <TouchableOpacity
              style={[styles.formSubmit, addingFollowUp && styles.formSubmitDisabled]}
              onPress={handleAddFollowUp}
              disabled={addingFollowUp}
            >
              {addingFollowUp ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.formSubmitText}>Schedule</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F3F4F6',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Header Card
  headerCard: {
    backgroundColor: '#FFFFFF',
    margin: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  leadName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  leadPhone: {
    fontSize: 13,
    color: '#6B7280',
  },
  headerDot: {
    marginHorizontal: 6,
    color: '#D1D5DB',
  },
  leadCompany: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  editIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Stage Badge
  stageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    marginTop: 12,
    gap: 6,
  },
  stageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stageText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Journey Progress
  journeySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  journeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  journeyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 6,
    flex: 1,
  },
  journeyCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  journeyBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  journeyProgress: {
    height: '100%',
    borderRadius: 3,
  },
  journeyStages: {
    marginTop: 12,
  },
  journeyStage: {
    alignItems: 'center',
    marginRight: 20,
    width: 60,
  },
  journeyDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  journeyDotPast: {
    backgroundColor: '#10B981',
  },
  journeyDotNum: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  journeyStageName: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 6,
    fontWeight: '500',
  },
  // Tabs
  tabsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  tabsInner: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginHorizontal: 2,
    gap: 6,
  },
  tabItemActive: {
    backgroundColor: '#EEF2FF',
  },
  tabLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: '#C7D2FE',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
  },
  tabBadgeTextActive: {
    color: '#4F46E5',
  },
  // Tab Content
  tabContent: {
    marginHorizontal: 12,
    marginTop: 12,
  },
  overviewContent: {},
  tabContentInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingTab: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  // Section Card
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  contactGrid: {},
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  leadNotes: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  // Calls
  callCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  callIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callContent: {
    flex: 1,
    marginLeft: 12,
  },
  callStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  callTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  callMeta: {
    alignItems: 'flex-end',
  },
  callDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  callStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  callStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Notes
  addNoteBox: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 8,
    marginBottom: 16,
    gap: 8,
  },
  noteInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    maxHeight: 80,
    paddingHorizontal: 8,
  },
  sendNoteBtn: {
    backgroundColor: '#4F46E5',
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendNoteBtnDisabled: {
    backgroundColor: '#C7D2FE',
  },
  noteCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  noteInfo: {
    flex: 1,
    marginLeft: 8,
  },
  noteAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  noteTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  noteText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  // Tasks
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  taskCard: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  taskCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskCheckDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  taskDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  priorityTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  taskDue: {
    fontSize: 11,
    color: '#6B7280',
  },
  // Follow-ups
  followUpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  followUpIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fuIconDone: {
    backgroundColor: '#10B981',
  },
  fuIconPending: {
    backgroundColor: '#F59E0B',
  },
  followUpContent: {
    flex: 1,
    marginLeft: 12,
  },
  followUpDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  followUpMsg: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  followUpBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  followUpBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  completeBtn: {
    padding: 8,
  },
  // Timeline
  timeline: {
    paddingLeft: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 60,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 16,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  timelineDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  timelineTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
    gap: 6,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stageModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '85%',
    maxHeight: '70%',
  },
  stageModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 8,
  },
  stageList: {
    maxHeight: 350,
  },
  stageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 12,
  },
  stageOptionActive: {
    backgroundColor: '#EEF2FF',
  },
  stageOptionLost: {
    backgroundColor: '#FEF2F2',
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#FECACA',
  },
  stageOptionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stageOptionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  stageOptionTextActive: {
    fontWeight: '600',
    color: '#4F46E5',
  },
  // Form Modal
  formModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  formInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: '#111827',
    marginBottom: 12,
  },
  formTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 4,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  priorityBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 14,
    gap: 10,
    marginBottom: 12,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  dateTimeText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#111827',
  },
  formSubmit: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  formSubmitDisabled: {
    backgroundColor: '#C7D2FE',
  },
  formSubmitText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default LeadDetailScreen;
