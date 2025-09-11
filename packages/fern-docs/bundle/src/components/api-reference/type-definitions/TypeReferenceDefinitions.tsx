import React from "react";

import { UnreachableCaseError } from "ts-essentials";

import * as ApiDefinition from "@fern-api/fdr-sdk/api-definition";
import { visitDiscriminatedUnion } from "@fern-api/ui-core-utils";

import { InternalTypeDefinition } from "./InternalTypeDefinition";
import { TypeDefinitionPathPart } from "./TypeDefinitionContext";
import { TypeDefinitionSlot } from "./TypeDefinitionSlotsClient";

// HACHACK: this is a hack to render inlined enums above the description
export function hasInlineEnum(
  shape: ApiDefinition.TypeShapeOrReference,
  types: Record<ApiDefinition.TypeId, ApiDefinition.TypeDefinition>
): boolean {
  const unwrapped = ApiDefinition.unwrapReference(shape, types);
  return visitDiscriminatedUnion(unwrapped.shape)._visit<boolean>({
    object: () => false,
    enum: (value) => value.values.length < 6,
    undiscriminatedUnion: () => false,
    discriminatedUnion: () => false,
    list: (value) => hasInlineEnum(value.itemShape, types),
    set: (value) => hasInlineEnum(value.itemShape, types),
    map: (map) =>
      hasInlineEnum(map.keyShape, types) ||
      hasInlineEnum(map.valueShape, types),
    primitive: () => false,
    literal: () => true,
    unknown: () => false,
    _other: () => false,
  });
}

export function hasInternalTypeReference(
  shape: ApiDefinition.TypeShapeOrReference,
  types: Record<ApiDefinition.TypeId, ApiDefinition.TypeDefinition>
): boolean {
  const unwrapped = ApiDefinition.unwrapReference(shape, types);
  return visitDiscriminatedUnion(unwrapped.shape)._visit<boolean>({
    object: () => true,
    enum: () => true,
    undiscriminatedUnion: () => true,
    discriminatedUnion: () => true,
    list: () => true,
    set: () => true,
    map: (map) =>
      hasInternalTypeReference(map.keyShape, types) ||
      hasInternalTypeReference(map.valueShape, types),
    primitive: () => false,
    literal: () => true,
    unknown: () => false,
    _other: () => false,
  });
}

export type PropertyLocation = "request" | "response";

export const TypeReferenceDefinitions = React.memo(
  function TypeReferenceDefinitions({
    shape,
    types,
    location,
    additionalProperties,
  }: {
    shape: ApiDefinition.TypeShapeOrReference;
    types: Record<ApiDefinition.TypeId, ApiDefinition.TypeDefinition>;
    location?: PropertyLocation;
    additionalProperties?: ApiDefinition.ObjectProperty[];
  }) {
    switch (shape.type) {
      case "id":
        if (additionalProperties) {
          const newTypeShape = types[shape.id]?.shape;
          if (newTypeShape && newTypeShape.type === "object") {
            const updatedShape = {
              ...newTypeShape,
              properties: [
                ...(additionalProperties ?? []),
                ...(newTypeShape.properties ?? []),
              ],
            };
            return (
              <TypeReferenceDefinitions
                shape={updatedShape}
                types={types}
                location={location}
              />
            );
          }
        }
        return <TypeDefinitionSlot id={shape.id} location={location} />;
      case "object":
      case "enum":
      case "primitive":
      case "undiscriminatedUnion":
      case "discriminatedUnion":
        return (
          <InternalTypeDefinition
            shape={shape}
            types={types}
            location={location}
            additionalProperties={additionalProperties}
          />
        );
      case "list":
      case "set":
        return (
          <TypeDefinitionPathPart part={{ type: "listItem" }}>
            <TypeReferenceDefinitions
              shape={shape.itemShape}
              types={types}
              location={location}
              additionalProperties={additionalProperties}
            />
          </TypeDefinitionPathPart>
        );
      case "map":
        return (
          <TypeDefinitionPathPart part={{ type: "objectProperty" }}>
            <TypeReferenceDefinitions
              shape={shape.keyShape}
              types={types}
              location={location}
              additionalProperties={additionalProperties}
            />
            <TypeReferenceDefinitions
              shape={shape.valueShape}
              types={types}
              location={location}
              additionalProperties={additionalProperties}
            />
          </TypeDefinitionPathPart>
        );
      case "literal":
      case "unknown":
        return null;
      case "alias": {
        return (
          <TypeReferenceDefinitions
            shape={shape.value}
            types={types}
            location={location}
            additionalProperties={additionalProperties}
          />
        );
      }
      case "optional":
      case "nullable": {
        return (
          <TypeReferenceDefinitions
            shape={shape.shape}
            types={types}
            location={location}
            additionalProperties={additionalProperties}
          />
        );
      }
      default:
        throw new UnreachableCaseError(shape);
    }
  }
);
