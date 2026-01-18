import React, { useMemo } from "react";
import { FlatList, View } from "react-native";

import { ScreenContainer } from "../components/ScreenContainer";
import { ThemedText } from "../components/ThemedText";
import { StatPill } from "../components/StatPill";
import { BadgeCard } from "../components/BadgeCard";

import { useAppStore } from "../store/useAppStore";
import { BADGES } from "../utils/rewards";

export function RewardsScreen() {
  const streak = useAppStore((s) => s.streak);
  const wallet = useAppStore((s) => s.wallet);

  const badgeRows = useMemo(() => {
    const stats = { bestStreak: streak.bestStreak, totalReviewed: wallet.totalReviewed, coins: wallet.coins };
    return BADGES.map((b) => ({ ...b, isUnlocked: b.isUnlocked(stats) }));
  }, [streak.bestStreak, wallet.totalReviewed, wallet.coins]);

  const unlockedCount = badgeRows.filter((b) => b.isUnlocked).length;

  return (
    <ScreenContainer>
      <ThemedText variant="title">Rewards</ThemedText>
      <ThemedText variant="muted" style={{ marginTop: 6 }}>
        This is your proof of work. Don’t chase motivation—track consistency.
      </ThemedText>

      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
        <StatPill label="Current Streak" value={`${streak.currentStreak}`} />
        <StatPill label="Best Streak" value={`${streak.bestStreak}`} />
        <StatPill label="Coins" value={`${wallet.coins}`} />
        <StatPill label="XP" value={`${wallet.xp}`} />
      </View>

      <ThemedText variant="subtitle" style={{ marginTop: 18 }}>
        Badges ({unlockedCount}/{badgeRows.length})
      </ThemedText>

      <FlatList
        style={{ marginTop: 12 }}
        data={badgeRows}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <BadgeCard title={item.title} description={item.description} isUnlocked={item.isUnlocked} />
        )}
      />
    </ScreenContainer>
  );
}
