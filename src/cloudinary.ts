import { v2 as cloudinary } from 'cloudinary'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import type { Orcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'
import { URL } from 'url'

export interface CloudinaryApiEnv {
  cloudinaryApi: {
    cloudName: string
  }
}

export const getAvatarFromCloudinary = (orcid: Orcid) =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ cloudinaryApi }: CloudinaryApiEnv) =>
      pipe(
        match(orcid as string)
          .returnType<TE.TaskEither<'not-found', string>>()
          .with('0000-0002-6109-0367', () => TE.right('prereview-profile/c4a5fhc4arzb2chn6txg'))
          .with('0000-0003-4921-6155', () => TE.right('prereview-profile/dvyalmcsaz6bwri1iux4'))
          .otherwise(() => TE.left('not-found' as const)),
        TE.map(
          imageId =>
            new URL(
              cloudinary.url(imageId, {
                cloud_name: cloudinaryApi.cloudName,
                force_version: false,
                secure: true,
                transformation: {
                  crop: 'thumb',
                  fetch_format: 'auto',
                  quality: 'auto',
                  gravity: 'face',
                  width: 300,
                  height: 300,
                  zoom: 0.666,
                },
              }),
            ),
        ),
      ),
    ),
  )
