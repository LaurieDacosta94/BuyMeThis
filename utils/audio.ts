
export const base64ToUint8Array = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const playPcmAudio = async (base64Audio: string, sampleRate = 24000): Promise<AudioBufferSourceNode> => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass({ sampleRate });
    
    const bytes = base64ToUint8Array(base64Audio);
    
    // The Gemini API returns raw PCM 16-bit integer data.
    // We need to convert this to Float32 for the Web Audio API.
    const dataInt16 = new Int16Array(bytes.buffer);
    const float32Data = new Float32Array(dataInt16.length);
    
    for (let i = 0; i < dataInt16.length; i++) {
        // Normalize 16-bit integer (-32768 to 32767) to float (-1.0 to 1.0)
        float32Data[i] = dataInt16[i] / 32768.0;
    }

    const buffer = audioContext.createBuffer(1, float32Data.length, sampleRate);
    buffer.getChannelData(0).set(float32Data);

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();
    
    return source;
};
