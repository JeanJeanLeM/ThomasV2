import { DirectSupabaseService } from './DirectSupabaseService';
import { mediaService, AttachedPhoto } from './MediaService';
import { LocationResult, locationService } from './LocationService';

export type ActionAttachmentRecordType = 'task' | 'observation';
export type ActionAttachmentType = 'image' | 'location';

export interface ActionAttachment {
  id: string;
  farm_id: number;
  created_by: string;
  record_type: ActionAttachmentRecordType;
  task_id?: string | null;
  observation_id?: string | null;
  source_chat_message_id?: string | null;
  source_attachment_id?: string | null;
  attachment_type: ActionAttachmentType;
  bucket?: string | null;
  storage_path?: string | null;
  public_url?: string | null;
  file_name?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  width?: number | null;
  height?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  altitude?: number | null;
  address?: string | null;
  maps_url?: string | null;
  metadata?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LinkableAction {
  action_type?: string;
  id?: string;
  record_id?: string;
  extracted_data?: {
    record_id?: string | number;
    [key: string]: any;
  };
}

type ChatLikeAttachment = {
  id?: string;
  type?: string;
  name?: string;
  uri?: string;
  uploadedUri?: string;
  uploaded?: boolean;
  size?: number;
  data?: any;
};

type AttachmentInsert = Record<string, any> & {
  farm_id: number;
  created_by: string;
  record_type: ActionAttachmentRecordType;
  attachment_type: ActionAttachmentType;
};

function isTaskAction(actionType?: string): boolean {
  return ['task_done', 'task_planned', 'harvest'].includes(actionType || '');
}

function isObservationAction(actionType?: string): boolean {
  return actionType === 'observation';
}

function getRecordIdFromAction(action: LinkableAction): string | null {
  const recordId = action.record_id ?? action.extracted_data?.record_id;
  return recordId == null ? null : String(recordId);
}

function normalizeRecordType(action: LinkableAction): ActionAttachmentRecordType | null {
  if (isObservationAction(action.action_type)) return 'observation';
  if (isTaskAction(action.action_type)) return 'task';
  return null;
}

function locationDataFromAttachment(attachment: ChatLikeAttachment): LocationResult | null {
  const data = attachment.data || {};
  const latitude = Number(data.latitude);
  const longitude = Number(data.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const location: LocationResult = {
    latitude,
    longitude,
    accuracy: Number.isFinite(Number(data.accuracy)) ? Number(data.accuracy) : 0,
    timestamp: typeof data.timestamp === 'number' ? data.timestamp : Date.now(),
  };
  if (Number.isFinite(Number(data.altitude))) {
    location.altitude = Number(data.altitude);
  }
  if (typeof data.address === 'string' || attachment.name) {
    location.address = typeof data.address === 'string' ? data.address : attachment.name;
  }
  return location;
}

function imageStoragePathFromUrl(url?: string | null): string | null {
  if (!url) return null;
  const marker = '/storage/v1/object/public/photos/';
  const index = url.indexOf(marker);
  if (index >= 0) return decodeURIComponent(url.slice(index + marker.length));
  return null;
}

export class ActionAttachmentService {
  static async linkChatAttachmentsToRecords(params: {
    farmId: number;
    userId: string;
    chatMessageId: string;
    attachments: ChatLikeAttachment[];
    actions: LinkableAction[];
  }): Promise<void> {
    const actionableRecords = params.actions
      .map((action) => ({
        recordType: normalizeRecordType(action),
        recordId: getRecordIdFromAction(action),
      }))
      .filter((item): item is { recordType: ActionAttachmentRecordType; recordId: string } =>
        !!item.recordType && !!item.recordId
      );

    if (actionableRecords.length === 0 || params.attachments.length === 0) return;

    const usableAttachments = params.attachments.filter((attachment) =>
      attachment.type === 'image' || attachment.type === 'location'
    );
    if (usableAttachments.length === 0) return;

    for (const record of actionableRecords) {
      for (const attachment of usableAttachments) {
        const insertData = this.mapChatAttachmentToInsert({
          attachment,
          farmId: params.farmId,
          userId: params.userId,
          recordType: record.recordType,
          recordId: record.recordId,
          chatMessageId: params.chatMessageId,
        });

        if (!insertData) continue;
        await this.insertIfMissing(insertData);
      }
    }
  }

  static async getForTask(taskId: string): Promise<ActionAttachment[]> {
    return this.getForRecord('task', taskId);
  }

  static async getForObservation(observationId: string): Promise<ActionAttachment[]> {
    return this.getForRecord('observation', observationId);
  }

  static async getCountsForTasks(taskIds: string[]): Promise<Record<string, { imageCount: number; hasLocation: boolean }>> {
    return this.getCountsForRecordIds('task', taskIds);
  }

  static async getCountsForObservations(observationIds: string[]): Promise<Record<string, { imageCount: number; hasLocation: boolean }>> {
    return this.getCountsForRecordIds('observation', observationIds);
  }

  static async addImagesToRecord(params: {
    recordType: ActionAttachmentRecordType;
    recordId: string;
    farmId: number;
    userId: string;
    photos: AttachedPhoto[];
  }): Promise<ActionAttachment[]> {
    const uploadedPhotos = await mediaService.uploadAttachedPhotos(
      params.photos,
      params.farmId,
      params.recordType === 'task' ? 'tasks' : 'observations'
    );

    const created: ActionAttachment[] = [];
    for (const photo of uploadedPhotos) {
      if (!photo.uploadUrl || !photo.uploadPath) continue;
      const inserted = await this.insertAttachment({
        farm_id: params.farmId,
        created_by: params.userId,
        record_type: params.recordType,
        task_id: params.recordType === 'task' ? params.recordId : null,
        observation_id: params.recordType === 'observation' ? params.recordId : null,
        attachment_type: 'image',
        bucket: 'photos',
        storage_path: photo.uploadPath,
        public_url: photo.uploadUrl,
        file_name: photo.fileName,
        mime_type: photo.mimeType,
        file_size: photo.fileSize,
        width: photo.width,
        height: photo.height,
        metadata: {
          source: 'manual_form',
          original_photo_id: photo.id,
        },
      });
      if (inserted) created.push(inserted);
    }
    return created;
  }

  static async addLocationToRecord(params: {
    recordType: ActionAttachmentRecordType;
    recordId: string;
    farmId: number;
    userId: string;
    location: LocationResult;
  }): Promise<ActionAttachment | null> {
    return this.insertAttachment({
      farm_id: params.farmId,
      created_by: params.userId,
      record_type: params.recordType,
      task_id: params.recordType === 'task' ? params.recordId : null,
      observation_id: params.recordType === 'observation' ? params.recordId : null,
      attachment_type: 'location',
      latitude: params.location.latitude,
      longitude: params.location.longitude,
      accuracy: params.location.accuracy,
      altitude: params.location.altitude,
      address: params.location.address,
      maps_url: locationService.generateMapsUrl(params.location.latitude, params.location.longitude),
      metadata: {
        source: 'manual_form',
        timestamp: params.location.timestamp,
      },
    });
  }

  static async softDeleteAttachment(attachmentId: string): Promise<void> {
    const { error } = await DirectSupabaseService.directUpdate(
      'action_attachments',
      {
        is_active: false,
        updated_at: new Date().toISOString(),
      },
      [{ column: 'id', value: attachmentId }]
    );
    if (error) throw new Error(error.message || 'Erreur suppression pièce jointe');
  }

  private static async getForRecord(
    recordType: ActionAttachmentRecordType,
    recordId: string
  ): Promise<ActionAttachment[]> {
    const whereColumn = recordType === 'task' ? 'task_id' : 'observation_id';
    const { data, error } = await DirectSupabaseService.directSelect(
      'action_attachments',
      '*',
      [
        { column: whereColumn, value: recordId },
        { column: 'is_active', value: true },
      ]
    );

    if (error) {
      console.warn('⚠️ [ACTION-ATTACHMENTS] Unable to load attachments:', error);
      return [];
    }
    return Array.isArray(data) ? data : [];
  }

  private static async getCountsForRecordIds(
    recordType: ActionAttachmentRecordType,
    recordIds: string[]
  ): Promise<Record<string, { imageCount: number; hasLocation: boolean }>> {
    const uniqueIds = Array.from(new Set(recordIds.filter(Boolean)));
    if (uniqueIds.length === 0) return {};

    const whereColumn = recordType === 'task' ? 'task_id' : 'observation_id';
    const { data, error } = await DirectSupabaseService.directSelect(
      'action_attachments',
      `${whereColumn},attachment_type`,
      [
        { column: whereColumn, value: `(${uniqueIds.join(',')})`, operator: 'in' },
        { column: 'is_active', value: true },
      ]
    );

    if (error || !Array.isArray(data)) return {};

    return data.reduce((acc, row) => {
      const id = row[whereColumn];
      if (!id) return acc;
      if (!acc[id]) acc[id] = { imageCount: 0, hasLocation: false };
      if (row.attachment_type === 'image') acc[id].imageCount += 1;
      if (row.attachment_type === 'location') acc[id].hasLocation = true;
      return acc;
    }, {} as Record<string, { imageCount: number; hasLocation: boolean }>);
  }

  private static mapChatAttachmentToInsert(params: {
    attachment: ChatLikeAttachment;
    farmId: number;
    userId: string;
    recordType: ActionAttachmentRecordType;
    recordId: string;
    chatMessageId: string;
  }): AttachmentInsert | null {
    const base = {
      farm_id: params.farmId,
      created_by: params.userId,
      record_type: params.recordType,
      task_id: params.recordType === 'task' ? params.recordId : null,
      observation_id: params.recordType === 'observation' ? params.recordId : null,
      source_chat_message_id: params.chatMessageId,
      source_attachment_id: params.attachment.id || null,
    };

    if (params.attachment.type === 'image') {
      const publicUrl = params.attachment.uploadedUri || params.attachment.uri;
      const storagePath =
        params.attachment.data?.uploadPath ||
        params.attachment.data?.filePath ||
        imageStoragePathFromUrl(params.attachment.uploadedUri);

      if (!publicUrl || !storagePath) return null;

      return {
        ...base,
        attachment_type: 'image',
        bucket: 'photos',
        storage_path: storagePath,
        public_url: publicUrl,
        file_name: params.attachment.name || params.attachment.data?.fileName || 'Photo',
        mime_type: params.attachment.data?.mimeType || 'image/jpeg',
        file_size: params.attachment.size || params.attachment.data?.fileSize || null,
        width: params.attachment.data?.width || null,
        height: params.attachment.data?.height || null,
        metadata: {
          source: 'chat_message',
          uploaded: params.attachment.uploaded === true,
        },
      };
    }

    if (params.attachment.type === 'location') {
      const location = locationDataFromAttachment(params.attachment);
      if (!location) return null;
      return {
        ...base,
        attachment_type: 'location',
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        altitude: location.altitude,
        address: location.address || params.attachment.name,
        maps_url: locationService.generateMapsUrl(location.latitude, location.longitude),
        metadata: {
          source: 'chat_message',
          timestamp: location.timestamp,
        },
      };
    }

    return null;
  }

  private static async insertIfMissing(data: AttachmentInsert): Promise<ActionAttachment | null> {
    if (data['source_chat_message_id'] && data['source_attachment_id']) {
      const recordColumn = data.record_type === 'task' ? 'task_id' : 'observation_id';
      const recordId = data.record_type === 'task' ? data['task_id'] : data['observation_id'];
      const existing = await DirectSupabaseService.directSelect(
        'action_attachments',
        'id',
        [
          { column: 'source_chat_message_id', value: data['source_chat_message_id'] },
          { column: 'source_attachment_id', value: data['source_attachment_id'] },
          { column: 'record_type', value: data.record_type },
          { column: recordColumn, value: recordId },
          { column: 'attachment_type', value: data.attachment_type },
        ],
        true
      );

      if (existing.data?.id) return null;
    }

    return this.insertAttachment(data);
  }

  private static async insertAttachment(data: AttachmentInsert): Promise<ActionAttachment | null> {
    const { data: inserted, error } = await DirectSupabaseService.directInsert('action_attachments', data);
    if (error) {
      console.warn('⚠️ [ACTION-ATTACHMENTS] Insert failed:', error);
      return null;
    }
    return inserted as ActionAttachment;
  }
}
