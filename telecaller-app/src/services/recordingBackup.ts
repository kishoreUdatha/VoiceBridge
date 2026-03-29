/**
 * Recording Backup Service
 * Backs up call recordings locally before upload to prevent data loss
 */

import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKUP_DIR = `${RNFS.DocumentDirectoryPath}/recording_backups`;
const BACKUP_INDEX_KEY = '@voicebridge:recording_backups';
const MAX_BACKUP_AGE_DAYS = 7;

export interface BackupEntry {
  callId: string;
  originalPath: string;
  backupPath: string;
  timestamp: number;
  uploaded: boolean;
  fileSize?: number;
}

class RecordingBackupService {
  private initialized: boolean = false;

  /**
   * Initialize backup directory
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const exists = await RNFS.exists(BACKUP_DIR);
      if (!exists) {
        await RNFS.mkdir(BACKUP_DIR);
        console.log('[RecordingBackup] Created backup directory:', BACKUP_DIR);
      }
      this.initialized = true;
    } catch (error) {
      console.error('[RecordingBackup] Failed to initialize:', error);
    }
  }

  /**
   * Backup a recording file before upload
   */
  async backup(callId: string, originalPath: string): Promise<string | null> {
    await this.init();

    try {
      // Check if original file exists
      const exists = await RNFS.exists(originalPath);
      if (!exists) {
        console.warn('[RecordingBackup] Original file does not exist:', originalPath);
        return null;
      }

      // Get file stats
      const stats = await RNFS.stat(originalPath);
      const fileSize = parseInt(stats.size, 10);

      // Skip if file is too small (likely empty/corrupted)
      if (fileSize < 1000) {
        console.warn('[RecordingBackup] File too small, skipping backup:', fileSize);
        return null;
      }

      // Generate backup path
      const timestamp = Date.now();
      const extension = originalPath.split('.').pop() || 'm4a';
      const backupPath = `${BACKUP_DIR}/call_${callId}_${timestamp}.${extension}`;

      // Copy file to backup location
      await RNFS.copyFile(originalPath, backupPath);
      console.log('[RecordingBackup] File backed up:', backupPath);

      // Store in index
      const backups = await this.getBackups();
      backups.push({
        callId,
        originalPath,
        backupPath,
        timestamp,
        uploaded: false,
        fileSize,
      });
      await AsyncStorage.setItem(BACKUP_INDEX_KEY, JSON.stringify(backups));

      return backupPath;
    } catch (error) {
      console.error('[RecordingBackup] Failed to backup:', error);
      return null;
    }
  }

  /**
   * Mark a backup as uploaded
   */
  async markUploaded(callId: string): Promise<void> {
    try {
      const backups = await this.getBackups();
      const index = backups.findIndex(b => b.callId === callId);

      if (index >= 0) {
        backups[index].uploaded = true;
        await AsyncStorage.setItem(BACKUP_INDEX_KEY, JSON.stringify(backups));
        console.log('[RecordingBackup] Marked as uploaded:', callId);
      }
    } catch (error) {
      console.error('[RecordingBackup] Failed to mark uploaded:', error);
    }
  }

  /**
   * Get pending (not uploaded) backups
   */
  async getPendingBackups(): Promise<BackupEntry[]> {
    const backups = await this.getBackups();
    const pending: BackupEntry[] = [];

    for (const backup of backups) {
      if (!backup.uploaded) {
        // Verify file still exists
        const exists = await RNFS.exists(backup.backupPath);
        if (exists) {
          pending.push(backup);
        }
      }
    }

    return pending;
  }

  /**
   * Get backup for a specific call
   */
  async getBackupForCall(callId: string): Promise<BackupEntry | null> {
    const backups = await this.getBackups();
    const backup = backups.find(b => b.callId === callId);

    if (backup) {
      // Verify file exists
      const exists = await RNFS.exists(backup.backupPath);
      if (exists) {
        return backup;
      }
    }

    return null;
  }

  /**
   * Cleanup old uploaded backups
   */
  async cleanup(): Promise<{ deleted: number; kept: number }> {
    const backups = await this.getBackups();
    const maxAge = MAX_BACKUP_AGE_DAYS * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const toKeep: BackupEntry[] = [];
    let deleted = 0;

    for (const backup of backups) {
      const age = now - backup.timestamp;
      const isOld = age > maxAge;

      // Delete if uploaded AND old
      if (backup.uploaded && isOld) {
        try {
          const exists = await RNFS.exists(backup.backupPath);
          if (exists) {
            await RNFS.unlink(backup.backupPath);
          }
          deleted++;
          console.log('[RecordingBackup] Deleted old backup:', backup.backupPath);
        } catch (error) {
          console.error('[RecordingBackup] Failed to delete:', error);
          toKeep.push(backup); // Keep in index if delete failed
        }
      } else {
        toKeep.push(backup);
      }
    }

    await AsyncStorage.setItem(BACKUP_INDEX_KEY, JSON.stringify(toKeep));

    console.log('[RecordingBackup] Cleanup complete:', { deleted, kept: toKeep.length });
    return { deleted, kept: toKeep.length };
  }

  /**
   * Delete a specific backup
   */
  async deleteBackup(callId: string): Promise<boolean> {
    try {
      const backups = await this.getBackups();
      const index = backups.findIndex(b => b.callId === callId);

      if (index >= 0) {
        const backup = backups[index];

        // Delete file
        const exists = await RNFS.exists(backup.backupPath);
        if (exists) {
          await RNFS.unlink(backup.backupPath);
        }

        // Remove from index
        backups.splice(index, 1);
        await AsyncStorage.setItem(BACKUP_INDEX_KEY, JSON.stringify(backups));

        console.log('[RecordingBackup] Backup deleted:', callId);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[RecordingBackup] Failed to delete backup:', error);
      return false;
    }
  }

  /**
   * Get all backups from storage
   */
  async getBackups(): Promise<BackupEntry[]> {
    try {
      const json = await AsyncStorage.getItem(BACKUP_INDEX_KEY);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('[RecordingBackup] Failed to get backups:', error);
      return [];
    }
  }

  /**
   * Get backup statistics
   */
  async getStats(): Promise<{
    total: number;
    pending: number;
    uploaded: number;
    totalSize: number;
  }> {
    const backups = await this.getBackups();
    const pending = backups.filter(b => !b.uploaded);
    const uploaded = backups.filter(b => b.uploaded);
    const totalSize = backups.reduce((sum, b) => sum + (b.fileSize || 0), 0);

    return {
      total: backups.length,
      pending: pending.length,
      uploaded: uploaded.length,
      totalSize,
    };
  }

  /**
   * Clear all backups (use with caution)
   */
  async clearAll(): Promise<void> {
    try {
      const backups = await this.getBackups();

      for (const backup of backups) {
        try {
          const exists = await RNFS.exists(backup.backupPath);
          if (exists) {
            await RNFS.unlink(backup.backupPath);
          }
        } catch (e) {
          // Ignore individual delete errors
        }
      }

      await AsyncStorage.removeItem(BACKUP_INDEX_KEY);
      console.log('[RecordingBackup] All backups cleared');
    } catch (error) {
      console.error('[RecordingBackup] Failed to clear all:', error);
    }
  }
}

// Export singleton instance
export const recordingBackupService = new RecordingBackupService();

export default recordingBackupService;
