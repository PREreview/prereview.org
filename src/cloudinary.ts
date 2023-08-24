import { v2 as cloudinary } from 'cloudinary'
import * as TE from 'fp-ts/TaskEither'
import { flow } from 'fp-ts/function'
import type { Orcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'
import { URL } from 'url'

export const getAvatarFromCloudinary = flow(
  (orcid: Orcid) =>
    match(orcid)
      .returnType<TE.TaskEither<'not-found', string>>()
      .with('0000-0003-4921-6155' as Orcid, () => TE.right('prereview-profile/dvyalmcsaz6bwri1iux4'))
      .otherwise(() => TE.left('not-found' as const)),
  TE.map(
    imageId =>
      new URL(
        cloudinary.url(imageId, {
          cloud_name: 'prereview',
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
)
