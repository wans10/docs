"use client";

import { ParamValue } from "next/dist/server/request/params";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

import { Copy, ExternalLink } from "lucide-react";

import { FernDropdown } from "@fern-docs/components";

import {
  ClaudeIcon,
  MarkdownIcon,
  OpenAIIcon,
  SparklesIcon,
  TextIcon,
} from "./PageActionsDropdownAssets";

export const CopyPageOption = (): FernDropdown.ValueOption => {
  return {
    type: "value",
    value: "copy-page",
    label: "Copy page",
    helperText: "Copy this page as Markdown for LLMs",
    icon: <Copy className="size-icon" height={24} width={24} />,
  } as FernDropdown.ValueOption;
};

export const ViewAsMarkdownOption = (): FernDropdown.ValueOption => {
  const pathname = usePathname();
  return {
    type: "value",
    value: "view-as-markdown",
    label: "View as Markdown",
    helperText: "View this page as plain text",
    icon: <MarkdownIcon />,
    href: `${pathname}.md`,
    rightElement: <ExternalLink className="size-icon" />,
  } as FernDropdown.ValueOption;
};

export type LLM_OPTIONS = "ChatGPT" | "Claude";

export const LLM_URLS: Record<LLM_OPTIONS, [string, ReactNode]> = {
  ChatGPT: [
    "https://chat.openai.com/?hint=search&q=",
    <OpenAIIcon key="openai-logo" />,
  ],
  Claude: ["https://claude.ai/new?q=", <ClaudeIcon key="claude-logo" />],
};

export const OpenAISearchOption = (): FernDropdown.ValueOption => {
  return {
    type: "value",
    value: "open-ai-search",
    label: "Ask a question",
    helperText: "Chat with an AI assistant",
    icon: <SparklesIcon />,
  } as FernDropdown.ValueOption;
};

export const OpenLLMSTxtOption = (): FernDropdown.ValueOption => {
  return {
    type: "value",
    value: "open-llms-txt",
    label: "LLM?",
    helperText: "Read llms.txt",
    icon: <TextIcon key="llms-txt-logo" />,
    href: `/llms.txt`,
  } as FernDropdown.ValueOption;
};

// this function is unused, because claude/chatgpt can't read llms.txt
// if this changes, can bring this back.
export const OpenWithLLM = ({
  domain,
  slug,
  llm,
}: {
  domain: ParamValue;
  slug: ParamValue;
  llm: LLM_OPTIONS;
}): FernDropdown.ValueOption => {
  const resolveParam = (param: ParamValue): string => {
    if (typeof param === "string") {
      return decodeURIComponent(param);
    } else if (Array.isArray(param)) {
      return decodeURIComponent(param.join("/"));
    } else {
      return "";
    }
  };

  const decodedDomain = resolveParam(domain);
  const decodedSlug = resolveParam(slug);

  const prompt = `Read ${decodedDomain}${decodedSlug}.md so I can ask questions about it.`;

  return {
    type: "value",
    value: `open-${llm.toLowerCase()}`,
    label: `Open in ${llm}`,
    helperText: "Ask questions about this page",
    icon: LLM_URLS[llm][1],
    href: `${LLM_URLS[llm][0]}${encodeURIComponent(prompt)}`,
    rightElement: <ExternalLink className="size-icon" />,
  } as FernDropdown.ValueOption;
};
