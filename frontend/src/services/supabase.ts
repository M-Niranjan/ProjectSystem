import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tagvzahkddnblvjbsedx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhZ3Z6YWhrZGRuYmx2amJzZWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5OTk1NjEsImV4cCI6MjEwMDU3NTU2MX0.66cSogJVd0qlEODMcWPFMuA77stXP1coJgq2Qx_NyGI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Upload avatar image to Supabase Storage bucket 'avatars'
 */
export async function uploadAvatarToSupabase(file: File, userId: string | number): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop();
    const filePath = `avatars/user_${userId}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.warn('Supabase storage upload error:', uploadError);
      return null;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
  } catch (err) {
    console.error('Supabase avatar upload failed:', err);
    return null;
  }
}

/**
 * Upload document attachment to Supabase Storage bucket 'attachments'
 */
export async function uploadAttachmentToSupabase(file: File, folder: string = 'general'): Promise<{ name: string; url: string; size: string } | null> {
  try {
    const filePath = `${folder}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.warn('Supabase attachment upload error:', uploadError);
      return null;
    }

    const { data } = supabase.storage.from('attachments').getPublicUrl(filePath);
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1) + ' MB';

    return {
      name: file.name,
      url: data.publicUrl,
      size: sizeInMB
    };
  } catch (err) {
    console.error('Supabase attachment upload failed:', err);
    return null;
  }
}
