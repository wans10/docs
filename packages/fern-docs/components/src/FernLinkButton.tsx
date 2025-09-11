"use client";

import Link from "next/link";
import {
  ComponentProps,
  PropsWithChildren,
  createElement,
  forwardRef,
} from "react";

import {
  ButtonContent,
  FernButtonSharedProps,
  getButtonClassName,
} from "./FernButton";
import { Button } from "./FernButtonV2";
import { FernLink } from "./FernLink";

interface FernLinkButtonProps
  extends ComponentProps<typeof Link>,
    PropsWithChildren<FernButtonSharedProps> {}

export const FernLinkButton = forwardRef<
  HTMLAnchorElement,
  FernLinkButtonProps
>(function FernAnchorButton(props, ref) {
  const {
    icon,
    disabled = false,
    rightIcon,
    className,
    text,
    children,
    variant,
    size,
    mono,
    intent,
    active,
    full,
    rounded,
    disableAutomaticTooltip,
    ...linkProps
  } = props;
  return (
    <FernLink
      ref={ref}
      tabIndex={0}
      aria-disabled={disabled}
      aria-selected={active}
      data-state={active ? "on" : "off"}
      data-selected={active}
      {...linkProps}
      className={getButtonClassName(props)}
      onClick={
        props.onClick != null
          ? (e) => {
              if (disabled) {
                e.preventDefault();
                e.stopPropagation();
              } else {
                props.onClick?.(e);
              }
            }
          : undefined
      }
      href={String(props.href)}
    >
      {createElement(ButtonContent, { ...props, className: "" })}
    </FernLink>
  );
});

export const ButtonLink = forwardRef<
  HTMLAnchorElement,
  ComponentProps<typeof Link> & ComponentProps<typeof Button>
>((props, ref) => {
  return (
    <Button {...props} asChild>
      <FernLink ref={ref} {...props} href={String(props.href)} />
    </Button>
  );
});

ButtonLink.displayName = "ButtonLink";
