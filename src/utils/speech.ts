import * as Speech from "expo-speech";

export function speakEnglishWord(params: {
  text: string;
  rate?: number;
  pitch?: number;
}) {
  const text = params.text?.trim();
  if (!text) return;
  Speech.speak(text, {
    language: "en-US",
    rate: params.rate ?? 0.95,
    pitch: params.pitch ?? 1.0,
  });
}

export function stopSpeaking() {
  Speech.stop();
}
