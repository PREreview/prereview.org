import { now } from 'clock-ts'
import { v2 as cloudinary } from 'cloudinary'
import * as F from 'fetch-fp-ts'
import * as E from 'fp-ts/Either'
import * as J from 'fp-ts/Json'
import * as R from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { flow, identity, pipe } from 'fp-ts/function'
import * as s from 'fp-ts/string'
import { MediaType, Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import type { Orcid } from 'orcid-id-ts'
import { URL } from 'url'
import { type NonEmptyString, NonEmptyStringC } from './types/string'

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

export interface SaveCloudinaryAvatarEnv {
  saveCloudinaryAvatar: (orcid: Orcid, id: NonEmptyString) => TE.TaskEither<'unavailable', void>
}

const JsonD = {
  decode: (s: string) =>
    pipe(
      J.parse(s),
      E.mapLeft(() => D.error(s, 'JSON')),
    ),
}

const PublicIdD = pipe(D.string, D.map(s.replace(/^prereview-profile\//, '')), D.compose(NonEmptyStringC))

const UploadResponseD = pipe(
  JsonD,
  D.compose(
    D.struct({
      public_id: PublicIdD,
    }),
  ),
)

const getCloudinaryAvatar = (orcid: Orcid) =>
  pipe(
    RTE.ask<GetCloudinaryAvatarEnv>(),
    RTE.chainTaskEitherK(({ getCloudinaryAvatar }) => getCloudinaryAvatar(orcid)),
  )

const saveCloudinaryAvatar = (orcid: Orcid, id: NonEmptyString) =>
  pipe(
    RTE.ask<SaveCloudinaryAvatarEnv>(),
    RTE.chainTaskEitherK(({ saveCloudinaryAvatar }) => saveCloudinaryAvatar(orcid, id)),
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

export const saveAvatarOnCloudinary = (
  orcid: Orcid,
  avatar: { buffer: Buffer; mimetype: 'image/jpeg' | 'image/png' },
) =>
  pipe(
    RTE.rightReaderIO(now),
    RTE.chainW(now =>
      RTE.asks(({ cloudinaryApi }: CloudinaryApiEnv) =>
        pipe(
          cloudinary.utils.api_url('upload', {
            cloud_name: cloudinaryApi.cloudName,
            resource_type: 'image',
          }),
          F.Request('POST'),
          F.setBody(
            new URLSearchParams({
              ...cloudinary.utils.sign_request(
                {
                  folder: 'prereview-profile',
                  timestamp: Math.round(now.getTime() / 1000),
                },
                { api_key: cloudinaryApi.key, api_secret: cloudinaryApi.secret },
              ),
              file: `data:${avatar.mimetype};base64,${avatar.buffer.toString('base64')}`,
            }).toString(),
            MediaType.applicationFormURLEncoded,
          ),
        ),
      ),
    ),
    RTE.chainW(F.send),
    RTE.filterOrElseW(F.hasStatus(Status.OK), identity),
    RTE.chainTaskEitherKW(F.decode(UploadResponseD)),
    RTE.chainW(upload => saveCloudinaryAvatar(orcid, upload.public_id)),
    RTE.mapLeft(() => 'unavailable' as const),
  )
