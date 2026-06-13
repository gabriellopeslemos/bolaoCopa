/**
 * Tela "Grupos" — lista os grupos do usuário e botões para criar ou entrar.
 */
import React, { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, TextInput, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection, query, getDocs, addDoc, doc,
  serverTimestamp, where, orderBy,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, fns } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { colors } from "@/lib/colors";

interface GroupItem { id: string; name: string; totalPoints?: number }

function useMyGroups(uid: string) {
  return useQuery({
    queryKey: ["groups", uid],
    queryFn: async () => {
      const membersQ = query(
        collection(db, "groups"),
        where(`members.${uid}`, "!=", null)
      );
      // Simpler: scan members subcollection via collectionGroup
      const snap = await getDocs(
        query(collection(db, "groups"), orderBy("createdAt", "desc"))
      );
      // Filter client-side for groups where user is a member
      const groups: GroupItem[] = [];
      for (const g of snap.docs) {
        const memberSnap = await getDocs(collection(db, "groups", g.id, "members"));
        if (memberSnap.docs.some((m) => m.id === uid)) {
          const memberDoc = memberSnap.docs.find((m) => m.id === uid);
          groups.push({
            id: g.id,
            name: g.data().name as string,
            totalPoints: memberDoc?.data()?.totalPoints as number | undefined,
          });
        }
      }
      return groups;
    },
    enabled: !!uid,
  });
}

export default function GroupsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: groups, isLoading } = useMyGroups(user?.uid ?? "");

  const [createModal, setCreateModal] = useState(false);
  const [joinModal, setJoinModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const ref = await addDoc(collection(db, "groups"), {
        name,
        ownerId: user!.uid,
        inviteCode: code,
        createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, "groups", ref.id, "members"), {
        userId: user!.uid, // stored as doc with id = uid below
      });
      // Use setDoc for consistent doc id
      const { setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, "groups", ref.id, "members", user!.uid), {
        displayName: user!.displayName ?? "Você",
        role: "owner",
        totalPoints: 0,
        joinedAt: serverTimestamp(),
      });
      return ref.id;
    },
    onSuccess: (groupId) => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      setCreateModal(false);
      setGroupName("");
      router.push(`/group/${groupId}`);
    },
    onError: () => Alert.alert("Erro", "Não foi possível criar o grupo."),
  });

  const joinMutation = useMutation({
    mutationFn: async (code: string) => {
      const fn = httpsCallable<{ inviteCode: string }, { groupId: string; name: string }>(
        fns, "joinGroup"
      );
      return fn({ inviteCode: code });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      setJoinModal(false);
      setInviteCode("");
      router.push(`/group/${res.data.groupId}`);
    },
    onError: () => Alert.alert("Erro", "Código inválido ou grupo não encontrado."),
  });

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={groups ?? []}
          keyExtractor={(g) => g.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>Você ainda não participa de nenhum grupo.</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/group/${item.id}`)}
            >
              <Text style={styles.groupName}>{item.name}</Text>
              {item.totalPoints !== undefined && (
                <Text style={styles.pts}>{item.totalPoints} pts</Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnSecondary} onPress={() => setJoinModal(true)}>
          <Text style={styles.btnSecondaryText}>Entrar com código</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => setCreateModal(true)}>
          <Text style={styles.btnText}>+ Criar grupo</Text>
        </TouchableOpacity>
      </View>

      {/* Modal criar grupo */}
      <Modal visible={createModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Novo grupo</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome do grupo"
              placeholderTextColor={colors.textMuted}
              value={groupName}
              onChangeText={setGroupName}
            />
            <TouchableOpacity
              style={[styles.btn, createMutation.isPending && styles.btnDisabled]}
              onPress={() => groupName.trim() && createMutation.mutate(groupName.trim())}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Criar</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCreateModal(false)}>
              <Text style={styles.cancel}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal entrar */}
      <Modal visible={joinModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Entrar em um grupo</Text>
            <TextInput
              style={styles.input}
              placeholder="Código de convite"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              value={inviteCode}
              onChangeText={setInviteCode}
            />
            <TouchableOpacity
              style={[styles.btn, joinMutation.isPending && styles.btnDisabled]}
              onPress={() => inviteCode.trim() && joinMutation.mutate(inviteCode.trim())}
              disabled={joinMutation.isPending}
            >
              {joinMutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Entrar</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setJoinModal(false)}>
              <Text style={styles.cancel}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: colors.cardBorder,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  groupName: { color: colors.text, fontSize: 16, fontWeight: "600", flex: 1 },
  pts: { color: colors.green, fontWeight: "bold", fontSize: 14 },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 40, fontSize: 15 },
  actions: {
    padding: 16, gap: 10,
    borderTopWidth: 1, borderTopColor: colors.divider,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 10, padding: 14, alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  btnSecondary: {
    borderColor: colors.primary, borderWidth: 1,
    borderRadius: 10, padding: 14, alignItems: "center",
  },
  btnSecondaryText: { color: colors.primary, fontWeight: "bold", fontSize: 15 },
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center", padding: 24,
  },
  modal: {
    backgroundColor: colors.card,
    borderRadius: 16, padding: 24, gap: 14,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: "bold" },
  input: {
    backgroundColor: colors.inputBg,
    borderColor: colors.inputBorder,
    borderWidth: 1, borderRadius: 10,
    color: colors.text, padding: 12, fontSize: 16,
  },
  cancel: { color: colors.textMuted, textAlign: "center", marginTop: 4 },
});
