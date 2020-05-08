const encoder = new TextEncoder();
const decoder = new TextDecoder();

export class Encoding {
  encode(text: string | undefined) {
    return encoder.encode(text);
  }
  decode(bytes: BufferSource) {
    return decoder.decode(bytes);
  }
}
