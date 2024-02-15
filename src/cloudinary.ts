import { v2 as cloudinary } from 'cloudinary'
import * as R from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import type { Orcid } from 'orcid-id-ts'
import { URL } from 'url'
import type { NonEmptyString } from './types/string'

export interface CloudinaryApiEnv {
  cloudinaryApi: {
    cloudName: string
    key: string
    secret: string
  }
}

export interface GetCloudinaryAvatarEnv {
  getCloudinaryAvatar: (orcid: Orcid) => TE.TaskEither<'not-found' | 'unavailable', NonEmptyString>
}

const getCloudinaryAvatar = (orcid: Orcid) =>
  pipe(
    RTE.ask<GetCloudinaryAvatarEnv>(),
    RTE.chainTaskEitherK(({ getCloudinaryAvatar }) => getCloudinaryAvatar(orcid)),
  )

export const getAvatarFromCloudinary = flow(
  getCloudinaryAvatar,
  RTE.chainReaderKW(imageId =>
    R.asks(
      ({ cloudinaryApi }: CloudinaryApiEnv) =>
        new URL(
          cloudinary.url(`prereview-profile/${imageId}`, {
            cloud_name: cloudinaryApi.cloudName,
            force_version: false,
            transformation: {
              crop: 'thumb',
              fetch_format: 'auto',
              quality: 'auto',
              gravity: 'face',
              width: 300,
              height: 300,
              zoom: 0.666,
            },
            urlAnalytics: false,
          }),
        ),
    ),
  ),
)
