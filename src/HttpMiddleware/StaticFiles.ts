export const hasContentHash = (filePath: string): boolean =>
  /\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+(?:\.map)?$/.test(filePath)
