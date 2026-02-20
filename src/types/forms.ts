/**
 * GlobalyOS Forms Module - Type Definitions
 */

// ============= Enums =============

export type FormStatus = 'draft' | 'published' | 'archived';
export type SubmissionStatus = 'new' | 'in_review' | 'resolved' | 'spam';

export type FormFieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'phone'
  | 'dropdown'
  | 'multi_select'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'file'
  | 'formula'
  | 'payment'
  | 'textarea';

export type FormElementType =
  | 'heading'
  | 'subheading'
  | 'paragraph'
  | 'image'
  | 'section'
  | 'divider';

export type FormNodeType = FormFieldType | FormElementType;

// ============= Logic Engine Types =============

export type LogicComparator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'is_empty'
  | 'is_not_empty';

export type LogicActionType = 'show' | 'hide' | 'require' | 'unrequire' | 'set_value';

export interface LogicCondition {
  fieldId: string;
  comparator: LogicComparator;
  value: unknown;
}

export interface LogicAction {
  type: LogicActionType;
  targetFieldId: string;
  value?: unknown;
}

export interface LogicRule {
  id: string;
  conditions: LogicCondition[];
  conditionOperator: 'and' | 'or';
  actions: LogicAction[];
}

// ============= Formula Types =============

export interface FormulaDefinition {
  id: string;
  fieldId: string;
  expression: string;
  format?: 'number' | 'currency' | 'percentage';
  currencyCode?: string;
  decimalPlaces?: number;
}

// ============= Form Node (Canvas Item) =============

export interface FormNodeValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
  maxFileSize?: number; // bytes
  allowedFileTypes?: string[];
}

export interface FormNodeSpacing {
  gap?: number;
  paddingX?: number;
  paddingY?: number;
}

export interface FormNodeProperties {
  label?: string;
  description?: string;
  placeholder?: string;
  defaultValue?: unknown;
  columns?: 1 | 2;
  options?: { label: string; value: string }[];
  imageUrl?: string;
  content?: string; // for heading/paragraph
  level?: 1 | 2 | 3; // for heading
}

export interface FormNode {
  id: string;
  type: FormNodeType;
  properties: FormNodeProperties;
  validation: FormNodeValidation;
  spacing: FormNodeSpacing;
  logicRules: LogicRule[];
  // For section type - children nodes
  children?: FormNode[];
}

// ============= Theme =============

export interface FormTheme {
  backgroundColor?: string;
  formBackgroundColor?: string;
  primaryColor?: string;
  textColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  borderRadius?: number;
  fontFamily?: string;
  customCss?: string;
}

// ============= Settings =============

export interface FormSettings {
  access?: 'public' | 'password';
  passwordHash?: string;
  allowedEmbedDomains?: string[];
  openAt?: string;
  closeAt?: string;
  rateLimitPolicy?: { maxPerIp?: number; windowMinutes?: number };
  recaptchaEnabled?: boolean;
  confirmationMessage?: string;
  redirectUrl?: string;
  honeypotEnabled?: boolean;
}

// ============= Payment =============

export interface FormPaymentConfig {
  enabled: boolean;
  mode: 'fixed' | 'calculated';
  fixedAmount?: number;
  calculatedFieldId?: string;
  currency: string;
}

export interface SubmissionPayment {
  provider: 'stripe';
  sessionId?: string;
  paymentIntentId?: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  amount?: number;
  currency?: string;
}

// ============= Core Entities =============

export interface Form {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  status: FormStatus;
  published_version_id: string | null;
  settings: FormSettings;
  theme: FormTheme;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FormVersion {
  id: string;
  form_id: string;
  organization_id: string;
  version_number: number;
  layout_tree: FormNode[];
  logic_rules: LogicRule[];
  calculations: FormulaDefinition[];
  created_by: string;
  created_at: string;
}

export interface FormSubmission {
  id: string;
  form_id: string;
  form_version_id: string;
  organization_id: string;
  answers: Record<string, unknown>;
  computed: Record<string, unknown>;
  status: SubmissionStatus;
  assignee_user_id: string | null;
  tags: string[];
  notes: Array<{ text: string; author: string; created_at: string }>;
  submitter_meta: {
    ip?: string;
    user_agent?: string;
    referrer?: string;
    utm?: Record<string, string>;
    domain?: string;
  };
  payment: SubmissionPayment | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

export interface FormSubmissionFile {
  id: string;
  submission_id: string;
  organization_id: string;
  field_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
}

export interface FormAuditLog {
  id: string;
  form_id: string;
  organization_id: string;
  user_id: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

// ============= Builder State =============

export interface FormBuilderState {
  form: Form | null;
  layoutTree: FormNode[];
  logicRules: LogicRule[];
  calculations: FormulaDefinition[];
  selectedNodeId: string | null;
  theme: FormTheme;
  settings: FormSettings;
  isDirty: boolean;
  undoStack: FormNode[][];
  redoStack: FormNode[][];
}

export type FormBuilderAction =
  | { type: 'SET_FORM'; payload: Form }
  | { type: 'SET_LAYOUT'; payload: FormNode[] }
  | { type: 'ADD_NODE'; payload: { node: FormNode; index?: number } }
  | { type: 'REMOVE_NODE'; payload: string }
  | { type: 'UPDATE_NODE'; payload: { id: string; updates: Partial<FormNode> } }
  | { type: 'REORDER_NODES'; payload: { activeId: string; overId: string } }
  | { type: 'SELECT_NODE'; payload: string | null }
  | { type: 'SET_THEME'; payload: FormTheme }
  | { type: 'SET_SETTINGS'; payload: FormSettings }
  | { type: 'SET_LOGIC_RULES'; payload: LogicRule[] }
  | { type: 'SET_CALCULATIONS'; payload: FormulaDefinition[] }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'MARK_CLEAN' };

// ============= Field State (from logic evaluation) =============

export interface FieldState {
  visible: boolean;
  required: boolean;
  setValue?: unknown;
}

// ============= Palette Items =============

export interface PaletteItem {
  type: FormNodeType;
  label: string;
  icon: string;
  category: 'basic' | 'field';
  defaultProperties?: Partial<FormNodeProperties>;
  defaultValidation?: Partial<FormNodeValidation>;
}
