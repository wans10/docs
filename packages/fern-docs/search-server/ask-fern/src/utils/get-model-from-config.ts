import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createCohere } from "@ai-sdk/cohere";
import { LanguageModelV1 } from "ai";
import { wrapAISDKModel } from "braintrust";

import {
  anthropicApiKey,
  cohereApiKey,
} from "@fern-api/docs-server/env-variables";

type ModelId = string;

type ModelConfig = {
  modelId: string;
  region: string;
};

const DEFAULT_MODEL_ID = "claude-3.5";
const DEFAULT_MODEL_CONFIG: ModelConfig = {
  modelId: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
  region: "us-west-2",
};

const modelMap: Record<ModelId, ModelConfig> = {
  "claude-3.5": {
    modelId: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
    region: "us-west-2",
  },
  "claude-3.7": {
    modelId: "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
    region: "us-east-1",
  },
};

export function getModelConfig(model: ModelId): ModelConfig {
  const modelConfig = modelMap[model];
  if (modelConfig == null) {
    return DEFAULT_MODEL_CONFIG;
  }
  return modelConfig;
}

export function getLanguageModel(model: string | undefined): LanguageModelV1 {
  if (model === "command-a" || model === "command-r-plus") {
    // TODO: remove command-r-plus once fern generate change is resolved
    const cohere = createCohere({ apiKey: cohereApiKey() });
    return wrapAISDKModel(cohere("command-a-03-2025"));
  }

  if (model === "claude-4") {
    const anthropic = createAnthropic({ apiKey: anthropicApiKey() });
    return wrapAISDKModel(anthropic("claude-4-sonnet-20250514"));
  }

  const modelConfig = getModelConfig(model ?? DEFAULT_MODEL_ID);
  const bedrock = createAmazonBedrock({
    region: modelConfig.region,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });

  return wrapAISDKModel(bedrock(modelConfig.modelId));
}
