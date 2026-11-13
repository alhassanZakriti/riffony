export type MidiNoteHandler = (note: number, velocity: number, timeStamp: number) => void;

export function isMidiSupported() {
  return typeof navigator !== "undefined" && "requestMIDIAccess" in navigator;
}

/**
 * Subscribes to note-on messages from every connected MIDI input, including
 * devices plugged in after subscribing. Returns an unsubscribe function.
 */
export async function subscribeMidiNoteOn(
  handler: MidiNoteHandler,
  onDevicesChange?: (names: string[]) => void,
): Promise<() => void> {
  const access = await navigator.requestMIDIAccess();

  const onMessage = (e: MIDIMessageEvent) => {
    const data = e.data;
    if (!data || data.length < 3) return;
    const status = data[0] & 0xf0;
    if (status === 0x90 && data[2] > 0) handler(data[1], data[2], e.timeStamp);
  };

  const bind = () => {
    access.inputs.forEach((input) => {
      input.onmidimessage = onMessage;
    });
    onDevicesChange?.(Array.from(access.inputs.values()).map((i) => i.name ?? "MIDI device"));
  };

  bind();
  access.onstatechange = bind;

  return () => {
    access.onstatechange = null;
    access.inputs.forEach((input) => {
      input.onmidimessage = null;
    });
  };
}
