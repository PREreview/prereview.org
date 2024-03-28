import { now } from 'clock-ts'
import { v2 as cloudinary } from 'cloudinary'
import * as F from 'fetch-fp-ts'
import * as E from 'fp-ts/Either'
import * as J from 'fp-ts/Json'
import * as R from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import { constVoid, flow, pipe } from 'fp-ts/function'
import * as s from 'fp-ts/string'
import { MediaType, Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import * as L from 'logger-fp-ts'
import type { Orcid } from 'orcid-id-ts'
import { P, match } from 'ts-pattern'
import { URL } from 'url'
import type { PublicUrlEnv } from './public-url'
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

export interface DeleteCloudinaryAvatarEnv {
  deleteCloudinaryAvatar: (orcid: Orcid) => TE.TaskEither<'unavailable', void>
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

const DestroyResponseD = pipe(
  JsonD,
  D.compose(
    D.struct({
      result: D.literal('ok'),
    }),
  ),
)

const getCloudinaryAvatar = (orcid: Orcid) =>
  pipe(
    RTE.ask<GetCloudinaryAvatarEnv>(),
    RTE.chainTaskEitherK(({ getCloudinaryAvatar }) => getCloudinaryAvatar(orcid)),
  )

const maybeGetCloudinaryAvatar = flow(
  getCloudinaryAvatar,
  RTE.orElseW(error =>
    match(error)
      .with('not-found', () => RTE.right(undefined))
      .with('unavailable', RTE.left)
      .exhaustive(),
  ),
)

const saveCloudinaryAvatar = (orcid: Orcid, id: NonEmptyString) =>
  pipe(
    RTE.ask<SaveCloudinaryAvatarEnv>(),
    RTE.chainTaskEitherK(({ saveCloudinaryAvatar }) => saveCloudinaryAvatar(orcid, id)),
  )

const deleteCloudinaryAvatar = (orcid: Orcid) =>
  pipe(
    RTE.ask<DeleteCloudinaryAvatarEnv>(),
    RTE.chainTaskEitherK(({ deleteCloudinaryAvatar }) => deleteCloudinaryAvatar(orcid)),
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
  avatar: { buffer: Buffer; mimetype: 'image/avif' | 'image/heic' | 'image/jpeg' | 'image/png' | 'image/webp' },
) =>
  pipe(
    RTE.Do,
    RTE.apS('now', RTE.rightReaderIO(now)),
    RTE.bindW('upload', ({ now }) =>
      pipe(
        RTE.asks(({ cloudinaryApi, publicUrl }: CloudinaryApiEnv & PublicUrlEnv) =>
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
                    context: `orcid_id=${orcid}|instance=${publicUrl.hostname}`,
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
        RTE.chainW(F.send),
        RTE.mapLeft(() => 'network-error' as const),
        RTE.filterOrElseW(F.hasStatus(Status.OK), () => 'non-200-response' as const),
        RTE.chainTaskEitherKW(flow(F.decode(UploadResponseD), TE.mapLeft(D.draw))),
        RTE.orElseFirstW(
          RTE.fromReaderIOK(flow(error => ({ error }), L.errorP('Failed to upload image to Cloudinary'))),
        ),
      ),
    ),
    RTE.apSW('existing', maybeGetCloudinaryAvatar(orcid)),
    RTE.chainFirstW(({ upload }) => saveCloudinaryAvatar(orcid, upload.public_id)),
    RTE.chainFirstW(({ existing }) =>
      match(existing).with(P.string, destroyImageOnCloudinary).with(undefined, RTE.right).exhaustive(),
    ),
    RTE.bimap(() => 'unavailable' as const, constVoid),
  )

export const removeAvatarFromCloudinary = (orcid: Orcid) =>
  pipe(
    RTE.Do,
    RTE.apS('publicId', getCloudinaryAvatar(orcid)),
    RTE.chainFirstW(() => deleteCloudinaryAvatar(orcid)),
    RTE.chainW(({ publicId }) => destroyImageOnCloudinary(publicId)),
    RTE.orElseW(error =>
      match(error)
        .with('not-found', () => RTE.right(constVoid()))
        .otherwise(RTE.left),
    ),
  )

const destroyImageOnCloudinary = (publicId: NonEmptyString) =>
  pipe(
    RTE.rightReaderIO(now),
    RTE.chainW(now =>
      RTE.asks(({ cloudinaryApi }: CloudinaryApiEnv) =>
        pipe(
          cloudinary.utils.api_url('destroy', {
            cloud_name: cloudinaryApi.cloudName,
            resource_type: 'image',
          }),
          F.Request('POST'),
          F.setBody(
            new URLSearchParams(
              cloudinary.utils.sign_request(
                {
                  public_id: `prereview-profile/${publicId}`,
                  timestamp: Math.round(now.getTime() / 1000),
                },
                { api_key: cloudinaryApi.key, api_secret: cloudinaryApi.secret },
              ),
            ).toString(),
            MediaType.applicationFormURLEncoded,
          ),
        ),
      ),
    ),
    RTE.chainW(F.send),
    RTE.mapLeft(() => 'network-error' as const),
    RTE.filterOrElseW(F.hasStatus(Status.OK), () => 'non-200-response' as const),
    RTE.chainTaskEitherKW(flow(F.decode(DestroyResponseD), TE.mapLeft(D.draw))),
    RTE.orElseFirstW(
      RTE.fromReaderIOK(flow(error => ({ error, publicId }), L.errorP('Failed to destroy image on Cloudinary'))),
    ),
    RTE.bimap(() => 'unavailable' as const, constVoid),
  )
