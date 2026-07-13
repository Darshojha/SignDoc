import { NextRequest, NextResponse } from "next/server";
import { apiError, internalApiError } from "@/lib/api/errors";
import { requireApiUser } from "@/lib/auth/route";
import { getTemplateById } from "@/lib/templates/db";
import { deleteTemplateSource, uploadTemplateSource, MAX_TEMPLATE_FILE_BYTES } from "@/lib/templates/storage";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!isUuid(id)) {
    return apiError("invalid_request", "Invalid template id.", "id");
  }

  try {
    const source = await getTemplateById(id, auth.user.id);
    if (!source) {
      return apiError("not_found", "This template does not exist.", null);
    }

    const supabase = createSupabaseAdminClient();
    const newId = crypto.randomUUID();

    const { data: storage, error: downloadError } = await supabase.storage
      .from("templates")
      .download(source.storage_path);

    if (downloadError || !storage) {
      throw new Error(downloadError?.message ?? "Failed to download template source.");
    }

    const bytes = new Uint8Array(await storage.arrayBuffer());
    const newStoragePath = `${newId}/source.pdf`;

    await uploadTemplateSource(newId, bytes);

    const { data: template, error: insertError } = await supabase
      .from("templates")
      .insert({
        id: newId,
        created_by: auth.user.id,
        name: `${source.name} (copy)`,
        storage_path: newStoragePath,
        page_count: source.page_count,
        field_layout: source.field_layout ?? [],
      })
      .select("id, name, storage_path, page_count, field_layout, created_at, updated_at")
      .single();

    if (insertError || !template) {
      await deleteTemplateSource(newId);
      throw new Error(insertError?.message ?? "Failed to duplicate template.");
    }

    return NextResponse.json({ template }, { status: 201 });
  } catch (err) {
    return internalApiError(err);
  }
}