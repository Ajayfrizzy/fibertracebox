import type { ScenarioDefinition, ScenarioName } from "@/lib/types/domain";

export const scenarios: ScenarioDefinition[] = [
  {
    name: "successful-payment",
    label: "Successful payment",
    description: "Baseline CKB transfer with route discovery, fee quote, HTLC lock, settlement, and receipt.",
    defaultAmount: 125,
    defaultAsset: "CKB"
  },
  {
    name: "route-not-found",
    label: "Route not found",
    fingerprint: "ROUTE_NOT_FOUND",
    description: "No viable path exists between sender and receiver within current topology.",
    defaultAmount: 250,
    defaultAsset: "CKB"
  },
  {
    name: "route-capacity",
    label: "Route capacity insufficient",
    fingerprint: "ROUTE_CAPACITY_INSUFFICIENT",
    description: "A path exists, but available outbound capacity cannot carry the payment amount.",
    defaultAmount: 500,
    defaultAsset: "CKB"
  },
  {
    name: "peer-offline",
    label: "Peer offline",
    fingerprint: "PEER_OFFLINE",
    description: "The route depends on a peer that cannot be reached during payment execution.",
    defaultAmount: 140,
    defaultAsset: "CKB"
  },
  {
    name: "channel-inactive",
    label: "Channel inactive",
    fingerprint: "CHANNEL_INACTIVE",
    description: "A required channel is announced but unavailable for forwarding.",
    defaultAmount: 180,
    defaultAsset: "CKB"
  },
  {
    name: "asset-unsupported",
    label: "Asset unsupported",
    fingerprint: "ASSET_UNSUPPORTED",
    description: "The receiver or route does not support the requested asset.",
    defaultAmount: 80,
    defaultAsset: "USDI"
  },
  {
    name: "fee-limit-too-low",
    label: "Fee limit too low",
    fingerprint: "FEE_LIMIT_TOO_LOW",
    description: "The available route requires a higher fee ceiling than the request allows.",
    defaultAmount: 210,
    defaultAsset: "CKB"
  },
  {
    name: "payment-timeout",
    label: "Payment timeout",
    fingerprint: "PAYMENT_TIMEOUT",
    description: "The payment exceeds the allowed execution window before final settlement.",
    defaultAmount: 320,
    defaultAsset: "CKB"
  },
  {
    name: "liquidity-imbalance",
    label: "Liquidity imbalance",
    fingerprint: "LIQUIDITY_IMBALANCE",
    description: "Channels are live, but liquidity sits on the wrong side for this direction.",
    defaultAmount: 360,
    defaultAsset: "CKB"
  },
  {
    name: "retry-path-unavailable",
    label: "Retry path unavailable",
    fingerprint: "RETRY_PATH_UNAVAILABLE",
    description: "The first path failed and no policy-compliant retry path was available.",
    defaultAmount: 240,
    defaultAsset: "CKB"
  }
];

export const scenarioAliases: Record<string, ScenarioName> = {
  success: "successful-payment",
  successful: "successful-payment",
  "successful-payment": "successful-payment",
  "route-not-found": "route-not-found",
  route: "route-not-found",
  "route-capacity": "route-capacity",
  "route-capacity-insufficient": "route-capacity",
  capacity: "route-capacity",
  "peer-offline": "peer-offline",
  peer: "peer-offline",
  offline: "peer-offline",
  "channel-inactive": "channel-inactive",
  channel: "channel-inactive",
  "asset-unsupported": "asset-unsupported",
  asset: "asset-unsupported",
  "fee-limit-too-low": "fee-limit-too-low",
  fee: "fee-limit-too-low",
  timeout: "payment-timeout",
  "payment-timeout": "payment-timeout",
  "liquidity-imbalance": "liquidity-imbalance",
  liquidity: "liquidity-imbalance",
  "retry-path-unavailable": "retry-path-unavailable",
  retry: "retry-path-unavailable"
};

export function resolveScenarioName(value: string | undefined): ScenarioName {
  if (!value) {
    return "successful-payment";
  }

  const scenario = scenarioAliases[value];
  if (!scenario) {
    throw new Error(`Unknown scenario "${value}"`);
  }

  return scenario;
}

export function getScenario(name: ScenarioName): ScenarioDefinition {
  const scenario = scenarios.find((candidate) => candidate.name === name);
  if (!scenario) {
    throw new Error(`Unknown scenario "${name}"`);
  }

  return scenario;
}
