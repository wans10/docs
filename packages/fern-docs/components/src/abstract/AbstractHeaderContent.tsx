"use client";

import { CSSProperties } from "react";
import React from "react";

import { useIsDesktop } from "@fern-ui/react-commons";

import { FernButtonGroup } from "../FernButton";
import { cn } from "../cn";
import { MobileMenuButton } from "../header/MobileButtons";
import { ThemeSwitch } from "../header/theme-switch";

export function AbstractHeaderContent({
  logo,
  versionSelect,
  productSelect,
  className,
  style,
  showSearchBar,
  navbarLinks,
  loginButton,
  forceHeader = false,
  searchBar,
}: {
  logo: React.ReactNode;
  versionSelect: React.ReactNode;
  productSelect: React.ReactNode;
  className?: string;
  style?: CSSProperties;
  showSearchBar?: boolean;
  navbarLinks: React.ReactNode;
  loginButton?: React.ReactNode;
  forceHeader?: boolean;
  searchBar: React.ReactNode;
}) {
  const isDesktop = useIsDesktop();
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-stretch gap-4",
        className
      )}
    >
      <div
        className={cn(
          "flex w-full items-center justify-stretch gap-4",
          className
        )}
        style={style}
      >
        <div className="fern-header-logo-container">
          <div className="flex items-center gap-2">
            <div className="flex items-center lg:items-start">{logo}</div>
            <div
              className={cn("items-baseline lg:flex", {
                hidden: !forceHeader,
                flex: forceHeader,
              })}
            >
              {productSelect}
              {versionSelect}
            </div>
          </div>
        </div>

        {(showSearchBar || !isDesktop) && searchBar}

        <FernButtonGroup asChild>
          <nav className="fern-header-navbar-links" aria-label="Navbar links">
            {navbarLinks}
            {loginButton}
            <ThemeSwitch iconOnly variant="ghost" className="ml-2" />
          </nav>
        </FernButtonGroup>

        <div className="fern-header-mobile-menu-button">
          <MobileMenuButton />
        </div>
      </div>
    </div>
  );
}
