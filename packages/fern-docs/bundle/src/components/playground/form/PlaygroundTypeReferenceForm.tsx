"use client";

import { ReactElement, memo, useCallback, useState } from "react";

import { useAtomValue } from "jotai";

import {
  ObjectProperty,
  TypeDefinition,
  TypeShapeOrReference,
  unwrapReference,
} from "@fern-api/fdr-sdk/api-definition";
import { visitDiscriminatedUnion } from "@fern-api/ui-core-utils";
import {
  FernDatetimeInput,
  FernInput,
  FernNumericInput,
  FernSwitch,
  FernTextarea,
} from "@fern-docs/components";
import { cn } from "@fern-docs/components";

import { withErrorBoundary } from "@/components/error-boundary";
import { hasVoiceIdPlaygroundFormAtom } from "@/state/api-explorer-flags";

import { WithLabel } from "../WithLabel";
import { PlaygroundDiscriminatedUnionForm } from "./PlaygroundDescriminatedUnionForm";
import { PlaygroundElevenLabsVoiceIdForm } from "./PlaygroundElevenLabsVoiceIdForm";
import { PlaygroundEnumForm } from "./PlaygroundEnumForm";
import { PlaygroundListForm } from "./PlaygroundListForm";
import { PlaygroundMapForm } from "./PlaygroundMapForm";
import { PlaygroundMicrophoneForm } from "./PlaygroundMicrophoneForm";
import { PlaygroundObjectForm } from "./PlaygroundObjectForm";
import {
  PlaygroundTypeReferenceFormContext,
  usePlaygroundTypeReferenceFormContext,
} from "./PlaygroundTypeReferenceFormContext";
import { PlaygroundUniscriminatedUnionForm } from "./PlaygroundUniscriminatedUnionForm";

interface PlaygroundTypeReferenceFormProps {
  id: string;
  property?: ObjectProperty;
  shape: TypeShapeOrReference;
  onChange: (value: unknown) => void;
  value?: unknown;
  // onFocus?: () => void;
  // onBlur?: () => void;
  onOpenStack?: () => void;
  onCloseStack?: () => void;
  renderAsPanel?: boolean;
  types: Record<string, TypeDefinition>;
  disabled?: boolean;
  defaultValue?: unknown;
  indent?: boolean;
}

const PlaygroundTypeReferenceFormInternal =
  memo<PlaygroundTypeReferenceFormProps>((props) => {
    const hasVoiceIdPlaygroundForm = useAtomValue(hasVoiceIdPlaygroundFormAtom);
    const {
      id,
      property,
      shape,
      onChange,
      value,
      types,
      indent = true,
      defaultValue,
    } = props;
    const { isNullSelected } = usePlaygroundTypeReferenceFormContext();
    const onRemove = useCallback(() => {
      onChange(undefined);
    }, [onChange]);
    return visitDiscriminatedUnion(
      unwrapReference(shape, types).shape
    )._visit<ReactElement<any> | null>({
      object: (object) => (
        <WithLabel
          property={property}
          value={value}
          onChange={onChange}
          onRemove={onRemove}
          types={types}
          isNullSelected={isNullSelected}
        >
          <span className={cn("block w-full", isNullSelected && "hidden")}>
            <PlaygroundObjectForm
              shape={object}
              onChange={onChange}
              value={value}
              indent={indent}
              id={id}
              types={types}
            />
          </span>
        </WithLabel>
      ),
      enum: ({ values }) => (
        <WithLabel
          property={property}
          value={value}
          onChange={onChange}
          onRemove={onRemove}
          types={types}
          isNullSelected={isNullSelected}
        >
          <span className={cn("block w-full", isNullSelected && "invisible")}>
            <PlaygroundEnumForm
              enumValues={values}
              onChange={onChange}
              value={value}
              id={id}
            />
          </span>
        </WithLabel>
      ),
      undiscriminatedUnion: (undiscriminatedUnion) => (
        <WithLabel
          property={property}
          value={value}
          onChange={onChange}
          onRemove={onRemove}
          types={types}
          isNullSelected={isNullSelected}
        >
          <span className={cn("block w-full", isNullSelected && "hidden")}>
            <PlaygroundUniscriminatedUnionForm
              undiscriminatedUnion={undiscriminatedUnion}
              onChange={onChange}
              value={value}
              id={id}
              types={types}
              // TODO: add default value
            />
          </span>
        </WithLabel>
      ),
      discriminatedUnion: (discriminatedUnion) => (
        <WithLabel
          property={property}
          value={value}
          onChange={onChange}
          onRemove={onRemove}
          types={types}
          isNullSelected={isNullSelected}
        >
          <span className={cn("block w-full", isNullSelected && "hidden")}>
            <PlaygroundDiscriminatedUnionForm
              discriminatedUnion={discriminatedUnion}
              onChange={onChange}
              value={value}
              id={id}
              types={types}
              // TODO: add default value
            />
          </span>
        </WithLabel>
      ),
      primitive: (primitive) =>
        visitDiscriminatedUnion(
          primitive.value,
          "type"
        )._visit<ReactElement<any> | null>({
          string: (string) => (
            <WithLabel
              property={property}
              value={value}
              onChange={onChange}
              onRemove={onRemove}
              types={types}
              isNullSelected={isNullSelected}
              htmlFor={id}
            >
              <span
                className={cn("block w-full", isNullSelected && "invisible")}
              >
                {hasVoiceIdPlaygroundForm && property?.key === "voice_id" ? (
                  // TODO: delete this:
                  <PlaygroundElevenLabsVoiceIdForm
                    id={id}
                    className="w-full"
                    value={typeof value === "string" ? value : ""}
                    onValueChange={onChange}
                  />
                ) : property?.key === "user_audio_chunk" || // TODO(naman): remove hardcoding for ElevenLabs once the backend mimeType is plumbed through
                  (primitive.value.type === "base64" &&
                    primitive.value.mimeType?.includes("audio/webm") &&
                    typeof window !== "undefined" &&
                    MediaRecorder.isTypeSupported("audio/webm")) ? (
                  <PlaygroundMicrophoneForm
                    id={id}
                    className="w-full"
                    value={typeof value === "string" ? value : ""}
                    onValueChange={onChange}
                    onAudioData={onChange}
                    placeholder={string.default}
                  />
                ) : (
                  <FernInput
                    id={id}
                    className="w-full"
                    value={typeof value === "string" ? value : ""}
                    onValueChange={onChange}
                    placeholder={string.default}
                    resettable={typeof defaultValue === "string"}
                    maxLength={string.maxLength}
                    minLength={string.minLength}
                    // TODO: add validation UX feedback
                    pattern={string.regex}
                  />
                )}
              </span>
            </WithLabel>
          ),
          boolean: () => {
            const checked = typeof value === "boolean" ? value : undefined;
            return (
              <WithLabel
                property={property}
                value={value}
                onChange={onChange}
                onRemove={onRemove}
                types={types}
                htmlFor={id}
                isNullSelected={isNullSelected}
              >
                <span
                  className={cn("block w-full", isNullSelected && "invisible")}
                >
                  <div className="flex items-center justify-start gap-3">
                    {/* <label className="text-(color:--grayscale-a11) font-mono text-sm leading-none">
                                    {checked == null ? "undefined" : checked ? "true" : "false"}
                                </label> */}
                    <FernSwitch
                      checked={checked}
                      onCheckedChange={onChange}
                      defaultChecked={
                        typeof defaultValue === "boolean"
                          ? defaultValue
                          : undefined
                      }
                      id={id}
                    />
                  </div>
                </span>
              </WithLabel>
            );
          },
          integer: (integer) => (
            <WithLabel
              property={property}
              value={value}
              onChange={onChange}
              onRemove={onRemove}
              types={types}
              htmlFor={id}
              isNullSelected={isNullSelected}
            >
              <span
                className={cn("block w-full", isNullSelected && "invisible")}
              >
                <FernNumericInput
                  id={id}
                  className="w-full"
                  value={typeof value === "number" ? value : undefined}
                  onValueChange={onChange}
                  disallowFloat={true}
                  // resettable={typeof defaultValue === "number"}
                  max={integer.maximum}
                  min={integer.minimum}
                />
              </span>
            </WithLabel>
          ),
          double: (double) => (
            <WithLabel
              property={property}
              value={value}
              onChange={onChange}
              onRemove={onRemove}
              types={types}
              htmlFor={id}
              isNullSelected={isNullSelected}
            >
              <span
                className={cn("block w-full", isNullSelected && "invisible")}
              >
                <FernNumericInput
                  id={id}
                  className="w-full"
                  value={typeof value === "number" ? value : undefined}
                  onValueChange={onChange}
                  // resettable={typeof defaultValue === "number"}
                  max={double.maximum}
                  min={double.minimum}
                />
              </span>
            </WithLabel>
          ),
          long: (long) => (
            <WithLabel
              property={property}
              value={value}
              onChange={onChange}
              onRemove={onRemove}
              types={types}
              htmlFor={id}
              isNullSelected={isNullSelected}
            >
              <span
                className={cn("block w-full", isNullSelected && "invisible")}
              >
                <FernNumericInput
                  id={id}
                  className="w-full"
                  value={typeof value === "number" ? value : undefined}
                  onValueChange={onChange}
                  disallowFloat={true}
                  // resettable={typeof defaultValue === "number"}
                  max={long.maximum}
                  min={long.minimum}
                />
              </span>
            </WithLabel>
          ),
          uint: () => (
            <WithLabel
              property={property}
              value={value}
              onChange={onChange}
              onRemove={onRemove}
              types={types}
              htmlFor={id}
              isNullSelected={isNullSelected}
            >
              <span
                className={cn("block w-full", isNullSelected && "invisible")}
              >
                <FernNumericInput
                  id={id}
                  className="w-full"
                  value={typeof value === "number" ? value : undefined}
                  // resettable={typeof defaultValue === "number"}
                  onValueChange={onChange}
                  disallowFloat={true}
                />
              </span>
            </WithLabel>
          ),
          uint64: () => (
            <WithLabel
              property={property}
              value={value}
              onChange={onChange}
              onRemove={onRemove}
              types={types}
              htmlFor={id}
              isNullSelected={isNullSelected}
            >
              <span
                className={cn("block w-full", isNullSelected && "invisible")}
              >
                <FernNumericInput
                  id={id}
                  className="w-full"
                  value={typeof value === "number" ? value : undefined}
                  // resettable={typeof defaultValue === "number"}
                  onValueChange={onChange}
                  disallowFloat={true}
                />
              </span>
            </WithLabel>
          ),
          datetime: () => (
            <WithLabel
              property={property}
              value={value}
              onChange={onChange}
              onRemove={onRemove}
              types={types}
              htmlFor={id}
              isNullSelected={isNullSelected}
            >
              <span
                className={cn("block w-full", isNullSelected && "invisible")}
              >
                <FernDatetimeInput
                  id={id}
                  className="w-full"
                  placeholder="MM/DD/YYYY HH:MM"
                  value={typeof value === "string" ? value : undefined}
                  resettable={typeof defaultValue === "string"}
                  onValueChange={onChange}
                />
              </span>
            </WithLabel>
          ),
          uuid: () => (
            <WithLabel
              property={property}
              value={value}
              onChange={onChange}
              onRemove={onRemove}
              types={types}
              htmlFor={id}
              isNullSelected={isNullSelected}
            >
              <span
                className={cn("block w-full", isNullSelected && "invisible")}
              >
                <FernInput
                  id={id}
                  className="w-full"
                  value={typeof value === "string" ? value : ""}
                  resettable={typeof defaultValue === "string"}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  onValueChange={onChange}
                />
              </span>
            </WithLabel>
          ),
          base64: () => (
            <WithLabel
              property={property}
              value={value}
              onChange={onChange}
              onRemove={onRemove}
              types={types}
              htmlFor={id}
              isNullSelected={isNullSelected}
            >
              <span
                className={cn("block w-full", isNullSelected && "invisible")}
              >
                <FernTextarea
                  id={id}
                  className="w-full"
                  value={typeof value === "string" ? value : ""}
                  onValueChange={onChange}
                />
              </span>
            </WithLabel>
          ),
          date: () => (
            <WithLabel
              property={property}
              value={value}
              onChange={onChange}
              onRemove={onRemove}
              types={types}
              htmlFor={id}
              isNullSelected={isNullSelected}
            >
              <span
                className={cn("block w-full", isNullSelected && "invisible")}
              >
                <FernInput
                  id={id}
                  type="date"
                  className="w-full"
                  placeholder="MM/DD/YYYY"
                  value={typeof value === "string" ? value : undefined}
                  resettable={typeof defaultValue === "string"}
                  onValueChange={onChange}
                />
              </span>
            </WithLabel>
          ),
          bigInteger: () => (
            <WithLabel
              property={property}
              value={value}
              onChange={onChange}
              onRemove={onRemove}
              types={types}
              htmlFor={id}
              isNullSelected={isNullSelected}
            >
              <span
                className={cn("block w-full", isNullSelected && "invisible")}
              >
                <FernTextarea
                  id={id}
                  className="w-full"
                  value={typeof value === "string" ? value : ""}
                  // resettable={typeof defaultValue === "string"}
                  onValueChange={onChange}
                />
              </span>
            </WithLabel>
          ),
          _other: () => null,
        }),
      list: (list) => (
        <WithLabel
          property={property}
          value={value}
          onChange={onChange}
          onRemove={onRemove}
          types={types}
          htmlFor={id}
          isNullSelected={isNullSelected}
        >
          <span className={cn("block w-full", isNullSelected && "hidden")}>
            <PlaygroundListForm
              itemShape={list.itemShape}
              onChange={onChange}
              value={value}
              id={id}
              types={types}
              // TODO: add default value
            />
          </span>
        </WithLabel>
      ),
      set: (set) => (
        <WithLabel
          property={property}
          value={value}
          onChange={onChange}
          onRemove={onRemove}
          types={types}
          htmlFor={id}
          isNullSelected={isNullSelected}
        >
          <span className={cn("block w-full", isNullSelected && "hidden")}>
            <PlaygroundListForm
              itemShape={set.itemShape}
              onChange={onChange}
              value={value}
              id={id}
              types={types}
              // TODO: add default value
            />
          </span>
        </WithLabel>
      ),
      map: (map) => (
        <WithLabel
          property={property}
          value={value}
          onChange={onChange}
          onRemove={onRemove}
          types={types}
          htmlFor={id}
          isNullSelected={isNullSelected}
        >
          <span className={cn("block w-full", isNullSelected && "hidden")}>
            <PlaygroundMapForm
              id={id}
              keyShape={map.keyShape}
              valueShape={map.valueShape}
              onChange={onChange}
              value={value}
              types={types}
              // TODO: add default value
            />
          </span>
        </WithLabel>
      ),
      literal: (literal) =>
        visitDiscriminatedUnion(literal.value, "type")._visit({
          stringLiteral: (stringLiteral) => (
            <WithLabel
              property={property}
              value={value}
              onChange={onChange}
              onRemove={onRemove}
              types={types}
              htmlFor={id}
              isNullSelected={isNullSelected}
            >
              <span
                className={cn("block w-full", isNullSelected && "invisible")}
              >
                <code>{stringLiteral.value}</code>
              </span>
            </WithLabel>
          ),
          booleanLiteral: (stringLiteral) => (
            <WithLabel
              property={property}
              value={value}
              onChange={onChange}
              onRemove={onRemove}
              types={types}
              htmlFor={id}
              isNullSelected={isNullSelected}
            >
              <span
                className={cn("block w-full", isNullSelected && "invisible")}
              >
                <code>{stringLiteral.value ? "true" : "false"}</code>
              </span>
            </WithLabel>
          ),
          _other: () => null,
        }),
      unknown: () => (
        <WithLabel
          property={property}
          value={value}
          onChange={onChange}
          onRemove={onRemove}
          types={types}
          htmlFor={id}
          isNullSelected={isNullSelected}
        >
          <span className={cn("block w-full", isNullSelected && "hidden")}>
            <FernTextarea
              id={id}
              className="w-full"
              value={typeof value === "string" ? value : ""}
              onValueChange={onChange}
              // TODO: add default value
            />
          </span>
        </WithLabel>
      ),
      _other: () => null,
    });
  });

PlaygroundTypeReferenceFormInternal.displayName =
  "PlaygroundTypeReferenceFormInternal";

export const PlaygroundTypeReferenceFormWithContext = (
  props: PlaygroundTypeReferenceFormProps
) => {
  const [isNullSelected, setIsNullSelected] = useState(false);

  return (
    <PlaygroundTypeReferenceFormContext.Provider
      value={{ isNullSelected, setIsNullSelected }}
    >
      <PlaygroundTypeReferenceFormInternal {...props} />
    </PlaygroundTypeReferenceFormContext.Provider>
  );
};

export const PlaygroundTypeReferenceForm = withErrorBoundary(
  PlaygroundTypeReferenceFormWithContext
);
