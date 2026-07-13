import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { Template, TemplateField } from "@/lib/templates/types";

type TemplateRow = {
  id: string;
  name: string;
  storage_path: string;
  page_count: number;
  field_layout: TemplateField[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function toTemplate(row: TemplateRow): Template {
  return {
    id: row.id,
    name: row.name,
    page_count: row.page_count,
    field_layout: row.field_layout ?? [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listTemplates(ownerId: string): Promise<Template[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("templates")
    .select("id, name, storage_path, page_count, field_layout, created_at, updated_at")
    .eq("created_by", ownerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list templates: ${error.message}`);
  }

  return ((data ?? []) as TemplateRow[]).map(toTemplate);
}

export async function insertTemplate(params: {
  id: string;
  name: string;
  storagePath: string;
  pageCount: number;
  ownerId: string;
}): Promise<Template> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("templates")
    .insert({
      id: params.id,
      created_by: params.ownerId,
      name: params.name,
      storage_path: params.storagePath,
      page_count: params.pageCount,
      field_layout: [],
    })
    .select("id, name, storage_path, page_count, field_layout, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new Error(`Failed to save template: ${error?.message ?? "unknown error"}`);
  }

  return toTemplate(data as TemplateRow);
}

export async function getTemplateById(
  id: string,
  ownerId: string,
): Promise<(Template & { storage_path: string }) | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("templates")
    .select("id, name, storage_path, page_count, field_layout, created_at, updated_at")
    .eq("id", id)
    .eq("created_by", ownerId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load template: ${error.message}`);
  }
  if (!data) return null;

  const row = data as TemplateRow;
  return { ...toTemplate(row), storage_path: row.storage_path };
}

export async function updateTemplateFields(
  id: string,
  fieldLayout: TemplateField[],
  ownerId: string,
): Promise<Template | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("templates")
    .update({ field_layout: fieldLayout, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("created_by", ownerId)
    .select("id, name, storage_path, page_count, field_layout, created_at, updated_at")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update template fields: ${error.message}`);
  }
  if (!data) return null;

  return toTemplate(data as TemplateRow);
}
