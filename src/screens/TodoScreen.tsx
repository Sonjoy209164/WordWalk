import React, { useMemo, useState } from "react";
import { FlatList, TextInput, View } from "react-native";
import { useTheme } from "@react-navigation/native";

import { ScreenContainer } from "../components/ScreenContainer";
import { ThemedText } from "../components/ThemedText";
import { ThemedCard } from "../components/ThemedCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { TodoRow } from "../components/TodoRow";

import { useAppStore } from "../store/useAppStore";
import { toISODate } from "../utils/date";

export function TodoScreen() {
  const theme = useTheme();
  const todos = useAppStore((s) => s.todos);
  const addTodo = useAppStore((s) => s.addTodo);
  const toggleTodoCompletion = useAppStore((s) => s.toggleTodoCompletion);
  const deleteTodo = useAppStore((s) => s.deleteTodo);

  const todayISO = toISODate(new Date());

  const [draft, setDraft] = useState("");
  const [showAll, setShowAll] = useState(false);

  const visibleTodos = useMemo(() => {
    const sorted = [...todos].sort((a, b) => {
      if (a.dueDateISO === b.dueDateISO) return b.createdAtISO.localeCompare(a.createdAtISO);
      return a.dueDateISO.localeCompare(b.dueDateISO);
    });
    if (showAll) return sorted;
    return sorted.filter((t) => t.dueDateISO === todayISO);
  }, [todos, showAll, todayISO]);

  return (
    <ScreenContainer>
      <ThemedText variant="title">To‑Do</ThemedText>
      <ThemedText variant="muted" style={{ marginTop: 6 }}>
        Use tasks to control your workload. Streak controls your behavior.
      </ThemedText>

      <ThemedCard style={{ marginTop: 16 }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={showAll ? "Add a task (defaults to today)" : "Add a task for today"}
          placeholderTextColor={theme.colors.border}
          style={{
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: theme.colors.text,
            backgroundColor: theme.colors.background,
          }}
        />

        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <PrimaryButton
            label="Add"
            onPress={() => {
              addTodo(draft, todayISO);
              setDraft("");
            }}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            label={showAll ? "Show Today" : "Show All"}
            variant="outline"
            onPress={() => setShowAll((v) => !v)}
            style={{ width: 140 }}
          />
        </View>
      </ThemedCard>

      <FlatList
        style={{ marginTop: 16 }}
        data={visibleTodos}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={() => (
          <ThemedCard>
            <ThemedText variant="muted">
              {showAll ? "No tasks yet." : "No tasks for today. Add one above."}
            </ThemedText>
          </ThemedCard>
        )}
        renderItem={({ item }) => (
          <ThemedCard>
            <ThemedText variant="caption">Due: {item.dueDateISO}</ThemedText>
            <TodoRow
              title={item.title}
              isCompleted={item.isCompleted}
              onToggle={() => toggleTodoCompletion(item.id)}
              onDelete={() => deleteTodo(item.id)}
            />
          </ThemedCard>
        )}
      />
    </ScreenContainer>
  );
}
