import { NextResponse, type NextRequest } from "next/server";
import { PDFDocument } from "pdf-lib";
import { apiError } from "@/lib/api/errors";
import { insertTemplate, listTemplates } from "@/lib/templates/db";
import { deleteTemplateSource, uploadTemplateSource, MAX_TEMPLATE_FILE_BYTES } from "@/lib/templates/storage";

export async function GET() {
  try {
    const templates = await listTemplates();
    return NextResponse.json({ templates });
  } catch (err) {
    return apiError("internal_error", (err as Error).message);
  }
}

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError("invalid_request", "Expected multipart/form-data.", null);
  }

  const name = formData.get("name");
  const file = formData.get("file");

  if (typeof name !== "string" || name.trim().length === 0) {
    return apiError("invalid_request", "A template name is required.", "name");
  }
  if (!(file instanceof File)) {
    return apiError("invalid_request", "A PDF file is required.", "file");
  }
  if (file.type !== "application/pdf") {
    return apiError("unsupported_file_type", "Only PDF files are supported.", "file");
  }
  if (file.size > MAX_TEMPLATE_FILE_BYTES) {
    return apiError(
      "file_too_large",
      `File exceeds the ${MAX_TEMPLATE_FILE_BYTES / (1024 * 1024)}MB limit.`,
      "file",
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  let pageCount: number;
  try {
    const pdfDoc = await PDFDocument.load(bytes);
    pageCount = pdfDoc.getPageCount();
  } catch {
    return apiError("invalid_request", "This file is not a valid PDF.", "file");
  }

  const id = crypto.randomUUID();

  try {
    const storagePath = await uploadTemplateSource(id, bytes);
    try {
      const template = await insertTemplate({
        id,
        name: name.trim(),
        storagePath,
        pageCount,
      });
      return NextResponse.json({ template }, { status: 201 });
    } catch (dbErr) {
      await deleteTemplateSource(id);
      throw dbErr;
    }
  } catch (err) {
    return apiError("internal_error", (err as Error).message);
  }
}
