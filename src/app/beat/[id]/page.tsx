import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Site from "@/components/site/Site";
import { PROFILE } from "@/data/profile";
import { TRACKS } from "@/data/tracks";

// One page per beat, all built at deploy time. Any other id is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return TRACKS.map((t) => ({ id: t.id }));
}

type Props = { params: Promise<{ id: string }> };

function findTrack(id: string) {
  return TRACKS.find((t) => t.id === id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const track = findTrack(id);
  if (!track) return {};
  const title = `${track.title} — ${PROFILE.artistName}`;
  const description = [`A beat by ${PROFILE.artistName}`, track.key, track.bpm ? `${track.bpm} bpm` : ""]
    .filter(Boolean)
    .join(" · ");
  const path = `/beat/${track.id}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    // openGraph and twitter replace the root layout's objects wholesale
    // (shallow merge), so everything the card needs is repeated here.
    // images are left out on purpose: ./opengraph-image.tsx fills them in.
    openGraph: { title, description, url: path, siteName: PROFILE.artistName, type: "music.song" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function BeatPage({ params }: Props) {
  const { id } = await params;
  if (!findTrack(id)) notFound();
  return <Site initialTrackId={id} />;
}
