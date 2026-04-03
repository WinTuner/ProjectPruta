import { isSupabaseEnabled, supabase } from './supabase';

export interface CustomDeviceType {
  id: string;
  typeCode: string;
  label: string;
  icon: string;
  color: string;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

interface CustomDeviceTypeRow {
  id: string;
  type_code: string;
  label: string;
  icon: string;
  color: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export type CustomDeviceTypeInput = {
  typeCode: string;
  label: string;
  icon: string;
  color?: string;
};

export type CustomDeviceTypeUpdate = {
  label?: string;
  icon?: string;
  color?: string;
};

export function normalizeCustomDeviceTypeCode(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');
}

function mapRow(row: CustomDeviceTypeRow): CustomDeviceType {
  return {
    id: row.id,
    typeCode: row.type_code,
    label: row.label,
    icon: row.icon,
    color: row.color ?? '#6366f1',
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function ensureSupabase(): NonNullable<typeof supabase> {
  if (!isSupabaseEnabled || !supabase) {
    throw new Error('Supabase is not configured');
  }

  return supabase;
}

export async function fetchCustomDeviceTypes(): Promise<CustomDeviceType[]> {
  if (!isSupabaseEnabled || !supabase) return [];

  const result = await (supabase.from('custom_device_types') as any)
    .select('*')
    .eq('is_active', true)
    .order('label', { ascending: true });

  if (result.error) {
    console.warn('[customDeviceTypes] Failed to load custom types:', {
      message: result.error.message,
      code: result.error.code,
    });
    return [];
  }

  return (result.data ?? []).map(mapRow);
}

export async function createCustomDeviceType(input: CustomDeviceTypeInput): Promise<CustomDeviceType> {
  const client = ensureSupabase();
  const payload = {
    type_code: normalizeCustomDeviceTypeCode(input.typeCode),
    label: input.label.trim(),
    icon: input.icon.trim() || '🧩',
    color: input.color?.trim() || '#6366f1',
    is_active: true,
  };

  const result = await (client.from('custom_device_types') as any)
    .insert(payload)
    .select('*')
    .single();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return mapRow(result.data as CustomDeviceTypeRow);
}

export async function updateCustomDeviceType(id: string, updates: CustomDeviceTypeUpdate): Promise<CustomDeviceType> {
  const client = ensureSupabase();
  const payload: Record<string, string> = {};

  if (typeof updates.label === 'string') {
    payload.label = updates.label.trim();
  }
  if (typeof updates.icon === 'string') {
    payload.icon = updates.icon.trim() || '🧩';
  }
  if (typeof updates.color === 'string') {
    payload.color = updates.color.trim() || '#6366f1';
  }

  const result = await (client.from('custom_device_types') as any)
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return mapRow(result.data as CustomDeviceTypeRow);
}

export async function deleteCustomDeviceType(id: string): Promise<void> {
  const client = ensureSupabase();
  const result = await (client.from('custom_device_types') as any)
    .update({ is_active: false })
    .eq('id', id);

  if (result.error) {
    throw new Error(result.error.message);
  }
}
