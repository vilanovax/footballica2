/** Shared Prisma include for duel rows that feed `toDuelSnapshot`. */
export const duelSnapshotInclude = {
  challenger: {
    include: {
      club: { select: { name: true, avatar: true, colorKey: true } },
    },
  },
  opponent: {
    include: {
      club: { select: { name: true, avatar: true, colorKey: true } },
    },
  },
  rounds: {
    include: { category: true },
    orderBy: { roundNumber: "asc" as const },
  },
} as const;
