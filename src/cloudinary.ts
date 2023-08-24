import { v2 as cloudinary } from 'cloudinary'
import * as TE from 'fp-ts/TaskEither'
import type { Orcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'
import { URL } from 'url'

export const getAvatarFromCloudinary = (orcid: Orcid) =>
  match(orcid)
    .with('0000-0003-4921-6155' as Orcid, () =>
      TE.right(
        new URL(
          cloudinary.url('prereview-profile/dvyalmcsaz6bwri1iux4', {
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
    .otherwise(() => TE.left('not-found' as const))
