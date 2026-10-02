import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CardsGallery from "@/components/atlas/dev/CardsGallery";

export const metadata: Metadata = {
  title: "Atlas71 · card gallery",
  robots: { index: false, follow: false },
};

/** Dev-only fixture gallery: 404 in production builds. */
export default function CardsGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <CardsGallery />;
}
