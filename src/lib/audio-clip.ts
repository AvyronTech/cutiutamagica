/** Canonical PCM16 WAV clips keep server-side duration validation independent of browser metadata. */
export function pcmWavDuration(header: Uint8Array, fileSize: number): number | null {
  if (header.length < 44) return null;
  const text = (a: number, b: number) => String.fromCharCode(...header.subarray(a, b));
  const v = new DataView(header.buffer, header.byteOffset, header.byteLength);
  if (
    text(0, 4) !== "RIFF" ||
    text(8, 12) !== "WAVE" ||
    text(12, 16) !== "fmt " ||
    text(36, 40) !== "data" ||
    v.getUint32(16, true) !== 16 ||
    v.getUint16(20, true) !== 1
  )
    return null;
  const channels = v.getUint16(22, true),
    rate = v.getUint32(24, true),
    bytes = v.getUint32(28, true),
    size = v.getUint32(40, true);
  if (
    channels < 1 ||
    channels > 2 ||
    rate < 16000 ||
    rate > 96000 ||
    v.getUint16(34, true) !== 16 ||
    v.getUint16(32, true) !== channels * 2 ||
    bytes !== rate * channels * 2 ||
    size % (channels * 2) !== 0 ||
    size + 44 !== fileSize ||
    v.getUint32(4, true) + 8 !== fileSize
  )
    return null;
  return size / bytes;
}
export function encodeAudioClip(
  buffer: Pick<AudioBuffer, "sampleRate" | "length" | "numberOfChannels" | "getChannelData">,
  start: number,
  duration: number,
): Blob {
  const rate = buffer.sampleRate,
    offset = Math.round(start * rate),
    length = Math.min(Math.round(duration * rate), buffer.length - offset);
  const bytes = new ArrayBuffer(44 + length * 2),
    v = new DataView(bytes);
  const text = (at: number, s: string) =>
    [...s].forEach((c, i) => v.setUint8(at + i, c.charCodeAt(0)));
  text(0, "RIFF");
  v.setUint32(4, bytes.byteLength - 8, true);
  text(8, "WAVE");
  text(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  text(36, "data");
  v.setUint32(40, length * 2, true);
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) =>
    buffer.getChannelData(i),
  );
  for (let i = 0; i < length; i++) {
    const value = Math.max(
      -1,
      Math.min(
        1,
        channels.reduce((sum, channel) => sum + channel[offset + i], 0) / channels.length,
      ),
    );
    v.setInt16(44 + i * 2, Math.round(value * (value < 0 ? 32768 : 32767)), true);
  }
  return new Blob([bytes], { type: "audio/wav" });
}
