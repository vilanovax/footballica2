"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Toast host for the admin CMS. Hard-coded to the light "slate" look (admin is
 * always light) so we avoid pulling in next-themes just for a theme signal.
 */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="bottom-right"
      richColors
      closeButton
      {...props}
    />
  );
}
