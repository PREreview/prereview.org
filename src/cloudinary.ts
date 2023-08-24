import * as TE from 'fp-ts/TaskEither'
import type { Orcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'

export const getAvatarFromCloudinary = (orcid: Orcid) =>
  match(orcid)
    .with('0000-0003-4921-6155' as Orcid, () =>
      TE.right(
        new URL(
          'https://res.cloudinary.com/prereview/image/upload/c_thumb,f_auto,g_face,h_300,q_auto,w_300,z_0.666/prereview-profile/dvyalmcsaz6bwri1iux4',
        ),
      ),
    )
    .otherwise(() => TE.left('not-found' as const))
