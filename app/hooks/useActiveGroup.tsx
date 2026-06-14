/**
 * Grupo ativo (global).
 *
 * Mantém qual bolão está selecionado e o persiste por usuário. As abas Ranking,
 * Jogos e Mata-mata leem daqui, de modo que trocar o grupo no Perfil muda a
 * visualização de todas elas. A seleção cai no primeiro grupo quando a atual
 * sumir (ex.: o usuário saiu do grupo).
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./useAuth";
import { useMyGroups } from "@/lib/data";
import type { GroupSummary } from "@/lib/types";

interface ActiveGroupValue {
  groups: GroupSummary[];
  activeGroupId: string | undefined;
  activeGroup: GroupSummary | undefined;
  setActiveGroupId: (id: string) => void;
  isLoading: boolean;
  refetch: () => Promise<unknown>;
  isRefetching: boolean;
}

const Ctx = createContext<ActiveGroupValue | null>(null);
const storageKey = (uid: string) => `activeGroup:${uid}`;

export function ActiveGroupProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const { data: groups = [], isLoading, refetch, isRefetching } = useMyGroups(uid);

  const [activeGroupId, setActive] = useState<string | undefined>(undefined);
  const [hydrated, setHydrated] = useState(false);

  // Carrega a seleção persistida quando o usuário muda.
  useEffect(() => {
    let alive = true;
    setHydrated(false);
    if (!uid) {
      setActive(undefined);
      return;
    }
    AsyncStorage.getItem(storageKey(uid))
      .then((v) => alive && (setActive(v ?? undefined), setHydrated(true)))
      .catch(() => alive && setHydrated(true));
    return () => {
      alive = false;
    };
  }, [uid]);

  // Garante que a seleção é válida; default para o primeiro grupo.
  useEffect(() => {
    if (!hydrated || isLoading) return;
    const valid = activeGroupId && groups.some((g) => g.id === activeGroupId);
    if (!valid) {
      const fallback = groups[0]?.id;
      setActive(fallback);
      if (uid && fallback) AsyncStorage.setItem(storageKey(uid), fallback).catch(() => {});
    }
  }, [hydrated, isLoading, groups, activeGroupId, uid]);

  function setActiveGroupId(id: string) {
    setActive(id);
    if (uid) AsyncStorage.setItem(storageKey(uid), id).catch(() => {});
  }

  const value = useMemo<ActiveGroupValue>(
    () => ({
      groups,
      activeGroupId,
      activeGroup: groups.find((g) => g.id === activeGroupId),
      setActiveGroupId,
      isLoading,
      refetch,
      isRefetching,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, activeGroupId, isLoading, isRefetching]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useActiveGroup() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useActiveGroup deve ser usado dentro de ActiveGroupProvider");
  return ctx;
}
