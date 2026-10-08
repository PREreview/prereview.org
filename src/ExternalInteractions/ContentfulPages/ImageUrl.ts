import { Url, UrlParams } from '@effect/platform'
import { Array, identity, pipe } from 'effect'

interface ImageFile {
  readonly url: URL
  readonly contentType: string
  readonly details: { readonly image: { readonly width: number } }
}

const widelySupportedContentTypes = ['image/jpeg', 'image/png', 'image/gif']

export const avif = (file: ImageFile, maxWidth?: number): URL =>
  pipe(file.url, shrinkToMaxWidth(file, maxWidth), setFormat('avif'))

export const webp = (file: ImageFile, maxWidth?: number): URL =>
  pipe(file.url, shrinkToMaxWidth(file, maxWidth), setFormat('webp'))

export const fallback = (file: ImageFile, maxWidth?: number): URL =>
  pipe(
    file.url,
    shrinkToMaxWidth(file, maxWidth),
    Array.contains(widelySupportedContentTypes, file.contentType) ? identity : setFormat('jpg'),
  )

const setFormat = (format: string) => Url.modifyUrlParams(UrlParams.set('fm', format))

const shrinkToMaxWidth = (file: ImageFile, maxWidth?: number) =>
  maxWidth !== undefined && file.details.image.width > maxWidth
    ? Url.modifyUrlParams(UrlParams.set('w', maxWidth.toString()))
    : identity<URL>
