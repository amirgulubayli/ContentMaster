import type {
  ConnectorCertification,
  FeatureKey,
  OpenClawAction,
  Platform
} from "@content-empire/shared";

export type ConnectorExecutionResult = {
  ok: boolean;
  platform: Platform;
  authMode: "api_auth" | "session_auth" | "hybrid_auth";
  message: string;
  usedSessionRunner: boolean;
  feature?: FeatureKey;
};

export type ConnectorContext = {
  accountId: string;
  platform: Platform;
  handle: string;
};

export interface PlatformConnector {
  platform: Platform;
  connect(context: ConnectorContext): Promise<ConnectorExecutionResult>;
  certify(context: ConnectorContext): Promise<ConnectorCertification>;
  execute(context: ConnectorContext, action: OpenClawAction): Promise<ConnectorExecutionResult>;
}
