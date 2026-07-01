export type MbtiType =
  | "INTJ"
  | "INTP"
  | "ENTJ"
  | "ENTP"
  | "INFJ"
  | "INFP"
  | "ENFJ"
  | "ENFP"
  | "ISTJ"
  | "ISFJ"
  | "ESTJ"
  | "ESFJ"
  | "ISTP"
  | "ISFP"
  | "ESTP"
  | "ESFP";

export type Relationship =
  | "mirror"
  | "companion"
  | "chronicler"
  | "guardian";

export type OnboardingStage =
  | "meet"
  | "mbti"
  | "tune"
  | "relationship"
  | "permissions"
  | "first-walk"
  | "first-shard"
  | "complete";

export type WalkMode = "real" | "training";
export type AnchorStatus = "locked" | "discovered" | "explored";
export type MbtiFamily = "analyst" | "diplomat" | "sentinel" | "explorer";

export interface MbtiProfile {
  readonly type: MbtiType;
  readonly family: MbtiFamily;
  readonly label: string;
  readonly description: string;
  readonly personaTags: readonly string[];
  readonly poiBias: readonly string[];
  readonly initiative: number;
  readonly expression: number;
  readonly autonomy: number;
  readonly portraitAssetId: string;
  readonly walkAssetId: string;
}

export interface UserProfile {
  id: string;
}

export interface OnboardingState {
  stage: OnboardingStage;
}

export interface AgentProfile {
  name: string;
  mbti: MbtiType;
  relationship: Relationship;
  initiative: number;
  expression: number;
  autonomy: number;
  portraitAssetId: string;
  walkAssetId: string;
}

export interface Wallet {
  memoryShards: number;
}

export interface WalkSession {
  id: string;
  mode: WalkMode;
  steps: number;
  status: "active" | "complete";
  startedAt: string;
  finishedAt?: string;
}

export interface CityAnchor {
  id: string;
  status: AnchorStatus;
}

export interface ShardLedgerEntry {
  id: string;
  change: number;
  reason: "walk" | "agent_action";
  actionId: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  definitionId: string;
  sourceActionId: string;
}

export interface WalkReport {
  id: string;
  walkId: string;
}

export interface GameStateV1 {
  schemaVersion: 1;
  revision: number;
  user: UserProfile;
  onboarding: OnboardingState;
  agent: AgentProfile | null;
  wallet: Wallet;
  walks: WalkSession[];
  anchors: CityAnchor[];
  ledger: ShardLedgerEntry[];
  inventory: InventoryItem[];
  reports: WalkReport[];
  processedActionIds: string[];
}
