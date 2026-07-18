import React from "react";
import { ChevronRight } from "lucide-react";

type DashminPageLayoutProps = {
  title: string;
  subtitle?: string;
  breadcrumb?: string[];
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function DashminPageLayout({
  title,
  subtitle,
  breadcrumb = ["Dashboard"],
  icon,
  actions,
  children,
  className = "",
}: DashminPageLayoutProps) {
  const fill = className.includes("lumiera-fill-view");
  return (
    <div className={`dash-page animate-fade-in min-w-0 ${className}`.trim()}>
      <div
        className={`dash-page-hero ${fill ? "dash-page-hero--compact" : ""}`.trim()}
      >
        {breadcrumb.length > 0 && (
          <nav className="dash-breadcrumb" aria-label="Breadcrumb">
            {breadcrumb.map((crumb, i) => (
              <span
                key={`${crumb}-${i}`}
                className="inline-flex items-center gap-1.5"
              >
                {i > 0 && <ChevronRight className="w-3 h-3 opacity-50" />}
                <span
                  className={i === breadcrumb.length - 1 ? "text-white" : ""}
                >
                  {crumb}
                </span>
              </span>
            ))}
          </nav>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && (
              <div
                className={`dash-page-icon shrink-0 ${fill ? "!w-9 !h-9" : ""}`.trim()}
              >
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h1
                className={`dash-page-title ${fill ? "!text-lg sm:!text-xl" : ""}`.trim()}
              >
                {title}
              </h1>
              {subtitle && (
                <p
                  className={`dash-page-subtitle ${fill ? "!text-xs !mt-0.5" : ""}`.trim()}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {actions && (
            <div className="shrink-0 flex flex-wrap gap-2">{actions}</div>
          )}
        </div>
      </div>
      <div className="dash-page-body">{children}</div>
    </div>
  );
}
