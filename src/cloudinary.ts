import { UrlParams } from '@effect/platform'
import { now } from 'clock-ts'
import { v2 as cloudinary } from 'cloudinary'
import { Function, String, flow, pipe } from 'effect'
import * as F from 'fetch-fp-ts'
import * as E from 'fp-ts/lib/Either.js'
import * as J from 'fp-ts/lib/Json.js'
import * as R from 'fp-ts/lib/Reader.js'
import * as RIO from 'fp-ts/lib/ReaderIO.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import * as L from 'logger-fp-ts'
import type { Orcid } from 'orcid-id-ts'
import type { Readable } from 'stream'
import { buffer } from 'stream/consumers'
import { P, match } from 'ts-pattern'
import { URL } from 'url'
import type { EnvFor } from './Fpts.js'
import type { PublicUrlEnv } from './public-url.js'
import * as StatusCodes from './StatusCodes.js'
import { type NonEmptyString, NonEmptyStringC } from './types/NonEmptyString.js'

export interface CloudinaryApiEnv {
  cloudinaryApi: {
    cloudName: string
    key: string
    secret: string
  }
}

export interface ReadFileEnv {
  readFile: (path: string) => Readable
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

const PublicIdD = pipe(D.string, D.map(String.replace(/^prereview-profile\//, '')), D.compose(NonEmptyStringC))

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

const readFile = (path: string) =>
  pipe(
    R.ask<ReadFileEnv>(),
    R.map(({ readFile }) => readFile(path)),
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
  avatar: { path: string; mimetype: 'image/avif' | 'image/heic' | 'image/jpeg' | 'image/png' | 'image/webp' },
) =>
  pipe(
    RTE.Do,
    RTE.apS('now', RTE.rightReaderIO(now)),
    RTE.apSW(
      'buffer',
      pipe(RTE.fromReader(readFile(avatar.path)), RTE.chainTaskEitherKW(TE.tryCatchK(buffer, E.toError))),
    ),
    RTE.bindW('upload', ({ buffer, now }) =>
      pipe(
        RTE.asks(({ cloudinaryApi, publicUrl }: CloudinaryApiEnv & PublicUrlEnv) =>
          pipe(
            cloudinary.utils.api_url('upload', {
              cloud_name: cloudinaryApi.cloudName,
              resource_type: 'image',
            }),
            F.Request('POST'),
            F.setBody(
              pipe(
                UrlParams.fromInput(
                  cloudinary.utils.sign_request(
                    {
                      folder: 'prereview-profile',
                      context: `orcid_id=${orcid}|instance=${publicUrl.hostname}`,
                      timestamp: Math.round(now.getTime() / 1000),
                    },
                    { api_key: cloudinaryApi.key, api_secret: cloudinaryApi.secret },
                  ),
                ),
                UrlParams.set('file', `data:${avatar.mimetype};base64,${buffer.toString('base64')}`),
                UrlParams.toString,
              ),
              'application/x-www-form-urlencoded',
            ),
          ),
        ),
        RTE.chainW(F.send),
        RTE.mapLeft(() => 'network-error' as const),
        RTE.filterOrElseW(F.hasStatus(StatusCodes.OK), () => 'non-200-response' as const),
        RTE.chainTaskEitherKW(flow(F.decode(UploadResponseD), TE.mapLeft(D.draw))),
        RTE.orElseFirstW(
          RTE.fromReaderIOK(flow(error => ({ error }), L.errorP('Failed to upload image to Cloudinary'))),
        ),
      ),
    ),
    RTE.apSW('existing', maybeGetCloudinaryAvatar(orcid)),
    RTE.chainFirstW(({ upload }) => saveCloudinaryAvatar(orcid, upload.public_id)),
    RTE.chainFirstReaderIOKW(({ existing }) =>
      match(existing)
        .with(P.string, existing =>
          RIO.asks((env: EnvFor<ReturnType<typeof destroyImageOnCloudinary>>) => {
            void destroyImageOnCloudinary(existing)(env)().catch(Function.constVoid)
          }),
        )
        .with(undefined, RIO.of)
        .exhaustive(),
    ),
    RTE.bimap(() => 'unavailable' as const, Function.constVoid),
  )

export const removeAvatarFromCloudinary = (orcid: Orcid) =>
  pipe(
    RTE.Do,
    RTE.apS('publicId', getCloudinaryAvatar(orcid)),
    RTE.chainFirstW(() => deleteCloudinaryAvatar(orcid)),
    RTE.chainFirstReaderIOKW(({ publicId }) =>
      RIO.asks((env: EnvFor<ReturnType<typeof destroyImageOnCloudinary>>) => {
        void destroyImageOnCloudinary(publicId)(env)().catch(Function.constVoid)
      }),
    ),
    RTE.map(Function.constVoid),
    RTE.orElseW(error =>
      match(error)
        .with('not-found', () => RTE.right(Function.constVoid()))
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
            pipe(
              UrlParams.fromInput(
                cloudinary.utils.sign_request(
                  {
                    public_id: `prereview-profile/${publicId}`,
                    timestamp: Math.round(now.getTime() / 1000),
                  },
                  { api_key: cloudinaryApi.key, api_secret: cloudinaryApi.secret },
                ),
              ),
              UrlParams.toString,
            ),
            'application/x-www-form-urlencoded',
          ),
        ),
      ),
    ),
    RTE.chainW(F.send),
    RTE.mapLeft(() => 'network-error' as const),
    RTE.filterOrElseW(F.hasStatus(StatusCodes.OK), () => 'non-200-response' as const),
    RTE.chainTaskEitherKW(flow(F.decode(DestroyResponseD), TE.mapLeft(D.draw))),
    RTE.orElseFirstW(
      RTE.fromReaderIOK(flow(error => ({ error, publicId }), L.errorP('Failed to destroy image on Cloudinary'))),
    ),
    RTE.bimap(() => 'unavailable' as const, Function.constVoid),
  )
