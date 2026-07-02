import { NextResponse, type NextRequest } from "next/server";
import { apiError } from "@/lib/api/errors";
import { getTemplateById, updateTemplateFields } from "@/lib/templates/db";
import { getTemplateSignedUrl } from "@/lib/templates/storage";
import { isTemplateField, type TemplateField } from "@/lib/templates/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const template = await getTemplateById(id);
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
    return apiError("internal_error", (err as Error).message);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_request", "Expected a JSON body.", null);
  }

  const fieldLayout = (body as { field_layout?: unknown } | null)?.field_layout;
  if (!Array.isArray(fieldLayout) || !fieldLayout.every(isTemplateField)) {
    return apiError(
      "invalid_request",
      "field_layout must be an array of valid field objects.",
      "field_layout",
    );
  }

  try {
    const template = await updateTemplateFields(id, fieldLayout as TemplateField[]);
    if (!template) {
      return apiError("not_found", "This template does not exist.", null);
    }
    return NextResponse.json({ template });
  } catch (err) {
    return apiError("internal_error", (err as Error).message);
  }
}
