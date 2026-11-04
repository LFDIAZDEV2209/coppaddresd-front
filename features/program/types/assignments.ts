export type AssignmentState = "proposed" | "pending-narrative" | "applied" | "edited" | "dismissed" | "fallback";

export interface AssignmentItem {
  recommendationId: string;
  patientId: string;
  patientName: string;
  patientDocument: string | null;
  daysWaiting: number;
  primaryCondition?: string | null;
  primaryConditionSource?: string | null;
  maxSeverity: number;
  state: AssignmentState;
  createdAt: string;
}

export interface AssignmentPage {
  items: AssignmentItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AssignmentCondition {
  code: string;
  name?: string;
  active: boolean;
  value?: string | number;
  unit?: string;
  sourceRef?: string;
  source_ref?: string;
  severity?: string | null;
  criteria?: unknown;
}

export interface AssignmentProfile {
  patient?: { name?: string; sex?: string; age?: number };
  tests?: { code: string; name?: string; score?: number; maximum?: number; qualifier?: string; severity?: string }[];
  conditions?: AssignmentCondition[];
  results?: { testCode: string; code: string; type: string; value: number; severity?: string | null; qualifier?: string | null; maximum?: number | null }[];
  biometrics?: { questionCode: string; value: number; unit?: string; valid?: boolean }[];
  facts?: Record<string, unknown>;
}

export interface AssignmentProposal {
  appliedContent?: AppliedAssignment["appliedContent"];
  nutritionPlanName?: string | null;
  routineName?: string | null;
  nutritionPlan?: { id: string; name: string } | null;
  routine?: { id: string; name: string } | null;
  matchedRules?: { ruleId?: string; ruleCode?: string; conditionCode?: string; reason: string; sourceRef?: string; source_ref?: string; appliesNutrition?: boolean; appliesRoutine?: boolean; criteria?: { sourceRef?: string; safety?: { sourceRef?: string } } }[];
}

export interface AssignmentDetail extends AssignmentItem {
  enrollment: { id: string; status: string; currentWeekNumber: number; startLocalDate: string; timezone: string };
  profileSnapshot: AssignmentProfile;
  proposal: AssignmentProposal;
  narrative?: { es?: string | null; en?: string | null };
  narrativePending: boolean;
  appliedAt?: string | null;
  updatedAt?: string | null;
}

export interface AppliedAssignment {
  state: AssignmentState;
  startLocalDate: string;
  currentWeekNumber?: number;
  enrollment?: AssignmentDetail["enrollment"];
  appliedContent?: {
    nutritionPlan?: { name?: string } | null;
    routine?: { name?: string } | null;
    templateDefaults?: boolean;
    tasksSnapshot?: unknown;
  };
}
