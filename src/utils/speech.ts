import * as Speech from "expo-speech";
import { useAppStore } from "../store/useAppStore";

function getSpeechSettings() {
  const speech = useAppStore.getState().settings?.speech;
  return {
    language: speech?.language ?? "system",
    voiceId: speech?.voiceId,
    rate: speech?.rate ?? 0.95,
    pitch: speech?.pitch ?? 1.0,
  };
}

export function speakEnglishWord(params: {
  text: string;
  rate?: number;
  pitch?: number;
}) {
  const text = params.text?.trim();
  if (!text) return;
  const settings = getSpeechSettings();
  Speech.speak(text, {
    language: settings.language === "system" ? undefined : settings.language,
    voice: settings.voiceId,
    rate: params.rate ?? settings.rate,
    pitch: params.pitch ?? settings.pitch,
  });
}

export function speakEnglishSequence(params: {
  texts: string[];
  rate?: number;
  pitch?: number;
  // If true, stops any current speech before starting.
  interrupt?: boolean;
  onDone?: () => void;
}) {
  const cleaned = (params.texts ?? []).map((t) => t?.trim()).filter(Boolean) as string[];
  if (cleaned.length === 0) return;

  const settings = getSpeechSettings();
  if (params.interrupt !== false) Speech.stop();

  const speakNext = (index: number) => {
    const text = cleaned[index];
    if (!text) return;
    Speech.speak(text, {
      language: settings.language === "system" ? undefined : settings.language,
      voice: settings.voiceId,
      rate: params.rate ?? settings.rate,
      pitch: params.pitch ?? settings.pitch,
      onDone: () => {
        if (index + 1 < cleaned.length) {
          speakNext(index + 1);
        } else {
          params.onDone?.();
        }
      },
    });
  };

  speakNext(0);
}

export function stopSpeaking() {
  Speech.stop();
}
