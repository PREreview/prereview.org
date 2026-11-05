export interface UploadImageInput {
  file: Uint8Array
  mimetype: string
  folder: string
  context: Record<string, string>
}
