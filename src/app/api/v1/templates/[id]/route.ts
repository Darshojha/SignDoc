import { NextResponse, type NextRequest } from "next/server";
import { apiError, internalApiError } from "@/lib/api/errors";
import { requireApiUser } from "@/lib/auth/route";
import { getTemplateById, updateTemplateFields } from "@/lib/templates/db";
import { getTemplateSignedUrl } from "@/lib/templates/storage";
import { isTemplateField, type TemplateField } from "@/lib/templates/types";
import { isUuid } from "@/lib/validation";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET(
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
    const template = await getTemplateById(id, auth.user.id);
    if (!template) {
      return apiError("not_found", "This template does not exist.", null);
    }

    const pdfUrl = await getTemplateSignedUrl(template.storage_path);
    return NextResponse.json({
      template: {
        id: template.id,
        name: template.name,
        page_count: template.page_count,
        field_layout: template.field_layout,
        created_at: template.created_at,
        updated_at: template.updated_at,
        pdf_url: pdfUrl,
      },
    });
  } catch (err) {
    return internalApiError(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!isUuid(id)) {
    return apiError("invalid_request", "Invalid template id.", "id");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_request", "Expected a JSON body.", null);
  }

  const fieldLayout = (body as { field_layout?: unknown } | null)?.field_layout;
  if (Array.isArray(fieldLayout)) {
    if (!fieldLayout.every(isTemplateField)) {
      return apiError(
        "invalid_request",
        "field_layout must be an array of valid field objects.",
        "field_layout",
      );
    }

    try {
      const template = await updateTemplateFields(id, fieldLayout as TemplateField[], auth.user.id);
      if (!template) {
        return apiError("not_found", "This template does not exist.", null);
      }
      return NextResponse.json({ template });
    } catch (err) {
      return internalApiError(err);
    }
  }

  const name = (body as { name?: unknown } | null)?.name;
  if (typeof name === "string") {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return apiError("invalid_request", "Template name cannot be empty.", "name");
    }
    if (trimmed.length > 120) {
      return apiError("invalid_request", "Template name must be 120 characters or fewer.", "name");
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("templates")
      .update({ name: trimmed, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("created_by", auth.user.id)
      .select("id, name, storage_path, page_count, field_layout, created_at, updated_at")
      .maybeSingle();

    if (error) {
      return internalApiError(error);
    }
    if (!data) {
      return apiError("not_found", "This template does not exist.", null);
    }

    return NextResponse.json({ template: data });
  }

  return apiError("invalid_request", "Provide field_layout or name to update.", null);
}

export async function DELETE(
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
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("templates")
      .delete()
      .eq("id", id)
      .eq("created_by", auth.user.id);

    if (error) {
      return internalApiError(error);
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return internalApiError(err);
  }
}