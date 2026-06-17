/**
 * Camada de acesso a dados (Firestore) + hooks do React Query.
 *
 * Modelo:
 *   users/{uid}                          perfil
 *   users/{uid}/memberships/{groupId}    índice dos grupos do usuário (para listar)
 *   groups/{groupId}                     grupo (nome, dono, código, memberCount)
 *   groups/{groupId}/members/{uid}       membro (pontos denormalizados p/ ranking)
 *   groups/{groupId}/bets/{uid_matchId}  palpite
 *   matches/{matchId}                    partidas
 */
import {
  collection, doc, getDoc, getDocs, query, orderBy,
  where, writeBatch, setDoc, serverTimestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import {
  useQuery, useMutation, useQueryClient,
} from "@tanstack/react-query";
import { db, fns } from "./firebase";
import type { Group, Match, Member, Bet, GroupSummary, Score, TournamentState } from "./types";

/* ------------------------------------------------------------------ */
/* Grupos                                                              */
/* ------------------------------------------------------------------ */

function makeInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem caracteres ambíguos
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function createGroup(
  uid: string,
  displayName: string,
  name: string
): Promise<string> {
  const groupRef = doc(collection(db, "groups"));
  const code = makeInviteCode();
  const batch = writeBatch(db);

  batch.set(groupRef, {
    name,
    ownerId: uid,
    inviteCode: code,
    memberCount: 1,
    createdAt: serverTimestamp(),
  });
  batch.set(doc(db, "groups", groupRef.id, "members", uid), {
    displayName,
    role: "owner",
    totalPoints: 0,
    exactCount: 0,
    correctCount: 0,
    joinedAt: serverTimestamp(),
  });
  batch.set(doc(db, "users", uid, "memberships", groupRef.id), {
    name,
    role: "owner",
    joinedAt: serverTimestamp(),
  });

  await batch.commit();
  return groupRef.id;
}

export function useMyGroups(uid: string | undefined) {
  return useQuery<GroupSummary[]>({
    queryKey: ["groups", uid],
    enabled: !!uid,
    queryFn: async () => {
      const memberships = await getDocs(
        query(collection(db, "users", uid!, "memberships"), orderBy("joinedAt", "desc"))
      );
      const summaries = await Promise.all(
        memberships.docs.map(async (m) => {
          const gid = m.id;
          const [groupSnap, memberSnap] = await Promise.all([
            getDoc(doc(db, "groups", gid)),
            getDoc(doc(db, "groups", gid, "members", uid!)),
          ]);
          if (!groupSnap.exists()) return null;
          const g = groupSnap.data();
          return {
            id: gid,
            name: g.name as string,
            role: (m.data().role as "owner" | "member") ?? "member",
            totalPoints: (memberSnap.data()?.totalPoints as number) ?? 0,
            memberCount: (g.memberCount as number) ?? 1,
          } satisfies GroupSummary;
        })
      );
      return summaries.filter((x): x is GroupSummary => x !== null);
    },
  });
}

export function useGroup(groupId: string | undefined) {
  return useQuery<Group | null>({
    queryKey: ["group", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const snap = await getDoc(doc(db, "groups", groupId!));
      if (!snap.exists()) return null;
      return { id: snap.id, ...(snap.data() as Omit<Group, "id">) };
    },
  });
}

export function useMembers(groupId: string | undefined) {
  return useQuery<Member[]>({
    queryKey: ["members", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db, "groups", groupId!, "members"), orderBy("totalPoints", "desc"))
      );
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Member, "id">) }));
    },
  });
}

export function useJoinGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inviteCode: string) => {
      const fn = httpsCallable<{ inviteCode: string }, { groupId: string; name: string }>(
        fns, "joinGroup"
      );
      const res = await fn({ inviteCode: inviteCode.trim().toUpperCase() });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useLeaveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
      const fn = httpsCallable<{ groupId: string }, { ok: boolean }>(fns, "leaveGroup");
      const res = await fn({ groupId });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, displayName, name }: { uid: string; displayName: string; name: string }) =>
      createGroup(uid, displayName, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

/* ------------------------------------------------------------------ */
/* Partidas                                                            */
/* ------------------------------------------------------------------ */

export function useMatches() {
  return useQuery<Match[]>({
    queryKey: ["matches"],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "matches"), orderBy("kickoff", "asc")));
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Match, "id">) }));
    },
  });
}

/** Estado do mata-mata do grupo (seeds, grupos sorteados, fase). */
export function useTournament(groupId: string | undefined) {
  return useQuery<TournamentState | null>({
    queryKey: ["tournament", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const snap = await getDoc(doc(db, "groups", groupId!, "tournament", "state"));
      return snap.exists() ? (snap.data() as TournamentState) : null;
    },
  });
}

export function useMatch(matchId: string | undefined) {
  return useQuery<Match | null>({
    queryKey: ["match", matchId],
    enabled: !!matchId,
    queryFn: async () => {
      const snap = await getDoc(doc(db, "matches", matchId!));
      if (!snap.exists()) return null;
      return { id: snap.id, ...(snap.data() as Omit<Match, "id">) };
    },
  });
}

/* ------------------------------------------------------------------ */
/* Palpites                                                            */
/* ------------------------------------------------------------------ */

/** Mapa matchId -> palpite do usuário no grupo. */
export function useMyBets(groupId: string | undefined, uid: string | undefined) {
  return useQuery<Record<string, Bet>>({
    queryKey: ["myBets", groupId, uid],
    enabled: !!groupId && !!uid,
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db, "groups", groupId!, "bets"), where("userId", "==", uid!))
      );
      const map: Record<string, Bet> = {};
      snap.docs.forEach((d) => {
        const b = { id: d.id, ...(d.data() as Omit<Bet, "id">) };
        map[b.matchId] = b;
      });
      return map;
    },
  });
}

/** Todos os palpites de uma partida em um grupo (para o detalhe da partida). */
export function useMatchBets(groupId: string | undefined, matchId: string | undefined) {
  return useQuery<Bet[]>({
    queryKey: ["matchBets", groupId, matchId],
    enabled: !!groupId && !!matchId,
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db, "groups", groupId!, "bets"), where("matchId", "==", matchId!))
      );
      return snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Bet, "id">) }))
        .sort((a, b) => b.points - a.points);
    },
  });
}

export function usePlaceBet(groupId: string, uid: string, displayName: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ matchId, score }: { matchId: string; score: Score }) => {
      const betId = `${uid}_${matchId}`;
      await setDoc(doc(db, "groups", groupId, "bets", betId), {
        userId: uid,
        displayName,
        matchId,
        score,
        points: 0,
        createdAt: serverTimestamp(),
      });
    },
    onSuccess: (_d, { matchId }) => {
      qc.invalidateQueries({ queryKey: ["myBets", groupId, uid] });
      qc.invalidateQueries({ queryKey: ["matchBets", groupId, matchId] });
    },
  });
}
