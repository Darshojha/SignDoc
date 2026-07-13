export const FIELD_TYPES = [
  "signature",
  "initials",
  "date",
  "text",
  "checkbox",
  "dropdown",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  signature: "Signature",
  initials: "Initials",
  date: "Date",
  text: "Text",
  checkbox: "Checkbox",
  dropdown: "Dropdown",
};

// x/y/width/height are percentages (0-100) of page width/height, anchored
// top-left, so field placement survives different render resolutions.
export type TemplateField = {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  field_type: FieldType;
  assigned_role: string;
  is_required?: boolean;
  dropdown_options?: string[];
};

export type Template = {
  id: string;
  name: string;
  page_count: number;
  field_layout: TemplateField[];
  created_at: string;
  updated_at: string;
};

export function isFieldType(value: unknown): value is FieldType {
  return typeof value === "string" && (FIELD_TYPES as readonly string[]).includes(value);
}

export function isTemplateField(value: unknown): value is TemplateField {
  if (!value || typeof value !== "object") return false;
  const f = value as Record<string, unknown>;
  if (f.is_required !== undefined && typeof f.is_required !== "boolean") return false;
  if (
    f.dropdown_options !== undefined &&
    (!Array.isArray(f.dropdown_options) ||
      !f.dropdown_options.every((option) => typeof option === "string"))
  ) {
    return false;
  }
  return (
    typeof f.id === "string" &&
    typeof f.page === "number" &&
    typeof f.x === "number" &&
    typeof f.y === "number" &&
    typeof f.width === "number" &&
    typeof f.height === "number" &&
    isFieldType(f.field_type) &&
    typeof f.assigned_role === "string" &&
    f.x >= 0 &&
    f.x <= 100 &&
    f.y >= 0 &&
    f.y <= 100 &&
    f.width > 0 &&
    f.width <= 100 &&
    f.height > 0 &&
    f.height <= 100
  );
}
