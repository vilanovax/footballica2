"use client";

type Props = {
  src: string;
};

/**
 * IMAGE format — logo / kit / stadium above the answer grid.
 * Dark premium frame; contain (not crop) so crests stay readable.
 */
export function ImagePrompt({ src }: Props) {
  return (
    <div className="mt-3">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-b from-[#1a2433] to-[#0d1219] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_24px_rgba(0,0,0,0.35)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.12),_transparent_55%)]"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          className="relative mx-auto max-h-52 w-full select-none object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)]"
        />
      </div>
    </div>
  );
}
