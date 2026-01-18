import React, { useMemo, useState } from "react";
import { Modal, Pressable, TextInput, View } from "react-native";
import { useNavigation, useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { ScreenContainer } from "../components/ScreenContainer";
import { ThemedText } from "../components/ThemedText";
import { ThemedCard } from "../components/ThemedCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { ProgressBar } from "../components/ProgressBar";
import { StatPill } from "../components/StatPill";
import { TodoRow } from "../components/TodoRow";

import { useAppStore } from "../store/useAppStore";
import { toISODate } from "../utils/date";

export function HomeScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();

  const dailyGoal = useAppStore((s) => s.settings.dailyGoal);
  const todayActivity = useAppStore((s) => s.getTodayActivity());
  const dueWordIds = useAppStore((s) => s.getDueWordIds());
  const newWordIds = useAppStore((s) => s.getNewWordIds());
  const streak = useAppStore((s) => s.streak);
  const wallet = useAppStore((s) => s.wallet);

  const todos = useAppStore((s) => s.todos);
  const addTodo = useAppStore((s) => s.addTodo);
  const toggleTodoCompletion = useAppStore((s) => s.toggleTodoCompletion);
  const deleteTodo = useAppStore((s) => s.deleteTodo);

  const todayISO = toISODate(new Date());

  const todaysTodos = useMemo(
    () => todos.filter((t) => t.dueDateISO === todayISO).slice(0, 6),
    [todos, todayISO]
  );

  const reviewProgress = Math.min(1, todayActivity.reviewedCount / dailyGoal);

  const [isAddTodoOpen, setIsAddTodoOpen] = useState(false);
  const [todoDraft, setTodoDraft] = useState("");

  return (
    <ScreenContainer>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <ThemedText variant="title">WordWalk</ThemedText>
        <Pressable onPress={() => navigation.navigate("Settings")} hitSlop={10}>
          <Ionicons name="settings-outline" size={22} color={theme.colors.text} />
        </Pressable>
      </View>

      <ThemedText variant="muted" style={{ marginTop: 6 }}>
        Build consistency. Let the streak do the heavy lifting.
      </ThemedText>

      <ThemedCard style={{ marginTop: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <ThemedText variant="subtitle">Today’s review</ThemedText>
            <ThemedText variant="muted" style={{ marginTop: 4 }}>
              {todayActivity.reviewedCount} / {dailyGoal} reviewed • {dueWordIds.length} due • {newWordIds.length} new
            </ThemedText>
          </View>
          <Ionicons name={todayActivity.didHitGoal ? "checkmark-circle" : "time-outline"} size={22} color={theme.colors.primary} />
        </View>

        <View style={{ marginTop: 12 }}>
          <ProgressBar progress={reviewProgress} />
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
          <PrimaryButton label="Start Review" onPress={() => navigation.navigate("Review")} style={{ flex: 1 }} />
          <PrimaryButton
            label="Sets"
            variant="outline"
            onPress={() => navigation.navigate("Groups")}
            style={{ width: 110 }}
          />
        </View>
      </ThemedCard>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        <StatPill label="Streak" value={`${streak.currentStreak} day${streak.currentStreak === 1 ? "" : "s"}`} />
        <StatPill label="Best" value={`${streak.bestStreak}`} />
        <StatPill label="Coins" value={`${wallet.coins}`} />
      </View>

      <View style={{ marginTop: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <ThemedText variant="subtitle">Today’s To‑Dos</ThemedText>
        <Pressable onPress={() => setIsAddTodoOpen(true)} hitSlop={10}>
          <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
        </Pressable>
      </View>

      <ThemedCard style={{ marginTop: 10 }}>
        {todaysTodos.length === 0 ? (
          <ThemedText variant="muted">No tasks for today. Add one to stay intentional.</ThemedText>
        ) : (
          todaysTodos.map((todo) => (
            <TodoRow
              key={todo.id}
              title={todo.title}
              isCompleted={todo.isCompleted}
              onToggle={() => toggleTodoCompletion(todo.id)}
              onDelete={() => deleteTodo(todo.id)}
            />
          ))
        )}

        <PrimaryButton
          label="Open full to‑do list"
          variant="outline"
          onPress={() => navigation.navigate("Todo")}
          style={{ marginTop: 10 }}
        />
      </ThemedCard>

      <Modal visible={isAddTodoOpen} transparent animationType="fade" onRequestClose={() => setIsAddTodoOpen(false)}>
        <Pressable
          onPress={() => setIsAddTodoOpen(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", padding: 16, justifyContent: "center" }}
        >
          <Pressable
            onPress={() => null}
            style={{ backgroundColor: theme.colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.colors.border }}
          >
            <ThemedText variant="subtitle">Add a to‑do</ThemedText>
            <TextInput
              value={todoDraft}
              onChangeText={setTodoDraft}
              placeholder="e.g., Learn Set 3"
              placeholderTextColor={theme.colors.border}
              style={{
                marginTop: 10,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: theme.colors.text,
              }}
            />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <PrimaryButton label="Cancel" variant="outline" onPress={() => setIsAddTodoOpen(false)} style={{ flex: 1 }} />
              <PrimaryButton
                label="Add"
                onPress={() => {
                  addTodo(todoDraft, todayISO);
                  setTodoDraft("");
                  setIsAddTodoOpen(false);
                }}
                style={{ flex: 1 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}
