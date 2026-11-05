import { describe, expect, it } from "vitest";
import { pcmWavDuration, encodeAudioClip } from "./audio-clip";
function audio(seconds: number) {
  const data = new Float32Array(44100 * seconds);
  return {
    sampleRate: 44100,
    length: data.length,
    numberOfChannels: 1,
    getChannelData: () => data,
  };
}
describe("real audio clips", () => {
  it.each([15, 20, 30])("encodes a verifiable %i second WAV", async (seconds) => {
    const blob = encodeAudioClip(audio(45), 5, seconds);
    expect(pcmWavDuration(new Uint8Array(await blob.slice(0, 44).arrayBuffer()), blob.size)).toBe(
      seconds,
    );
  });
  it("rejects forged lengths and malformed channel data", async () => {
    const blob = encodeAudioClip(audio(20), 0, 20),
      header = new Uint8Array(await blob.slice(0, 44).arrayBuffer());
    expect(pcmWavDuration(header, blob.size - 2)).toBeNull();
    header[22] = 5;
    expect(pcmWavDuration(header, blob.size)).toBeNull();
    expect(pcmWavDuration(new Uint8Array(8), 8)).toBeNull();
  });
});
