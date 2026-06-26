declare module 'heic2any' {
  interface Heic2AnyOptions {
    blob: Blob;
    /** MIME de saída. Ex.: 'image/jpeg' | 'image/png'. Padrão: 'image/png'. */
    toType?: string;
    /** Qualidade de 0 a 1 (para JPEG/WebP). */
    quality?: number;
    /** Retornar todos os quadros (HEIC com múltiplas imagens). */
    multiple?: boolean;
    gifInterval?: number;
  }

  /** Converte HEIC/HEIF em outro formato de imagem no navegador (libheif via WASM). */
  export default function heic2any(
    options: Heic2AnyOptions
  ): Promise<Blob | Blob[]>;
}
