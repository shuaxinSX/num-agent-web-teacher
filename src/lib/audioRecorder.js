function mergeChunks(chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}

function floatTo16BitPCM(input) {
  const output = new Int16Array(input.length);

  for (let index = 0; index < input.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, input[index]));
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  return output;
}

function encodeWav(samples, sampleRate) {
  const pcm = floatTo16BitPCM(samples);
  const buffer = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(buffer);

  function writeString(offset, value) {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + pcm.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, pcm.length * 2, true);

  let offset = 44;
  for (let index = 0; index < pcm.length; index += 1) {
    view.setInt16(offset, pcm[index], true);
    offset += 2;
  }

  return buffer;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function resampleBuffer(sourceData, sourceRate, targetRate) {
  if (sourceRate === targetRate) {
    return sourceData;
  }

  const audioBuffer = new AudioBuffer({
    length: sourceData.length,
    sampleRate: sourceRate,
    numberOfChannels: 1
  });

  audioBuffer.copyToChannel(sourceData, 0);

  const duration = sourceData.length / sourceRate;
  const targetLength = Math.max(1, Math.ceil(duration * targetRate));
  const offlineContext = new OfflineAudioContext(1, targetLength, targetRate);
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start(0);

  const renderedBuffer = await offlineContext.startRendering();
  return renderedBuffer.getChannelData(0);
}

export async function createAudioRecorder(targetSampleRate = 16000) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      noiseSuppression: true,
      echoCancellation: true
    }
  });

  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  const chunks = [];
  const startedAt = performance.now();

  processor.onaudioprocess = (event) => {
    const channelData = event.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(channelData));
  };

  source.connect(processor);
  processor.connect(audioContext.destination);

  return {
    async stop() {
      processor.disconnect();
      source.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      await audioContext.close();

      const merged = mergeChunks(chunks);
      const resampled = await resampleBuffer(merged, audioContext.sampleRate, targetSampleRate);
      const wavBuffer = encodeWav(resampled, targetSampleRate);

      return {
        audioBase64: arrayBufferToBase64(wavBuffer),
        format: "wav",
        codec: "raw",
        sampleRate: targetSampleRate,
        bits: 16,
        channel: 1,
        durationMs: performance.now() - startedAt
      };
    }
  };
}
