import { Context, Effect, flow, Layer, Scope } from 'effect'
import type { HttpClient } from 'effect/http'
import { AddRecordToCommunity } from './AddRecordToCommunity/index.ts'
import { CommitDraftFile } from './CommitDraftFile/index.ts'
import { CreateDeposition } from './CreateDeposition/index.ts'
import { CreateDraft } from './CreateDraft/index.ts'
import { DeleteDraft } from './DeleteDraft/index.ts'
import { EditRecord } from './EditRecord/index.ts'
import { GetDeposition } from './GetDeposition/index.ts'
import { GetDraft } from './GetDraft/index.ts'
import { GetRecord } from './GetRecord/index.ts'
import { PublishDeposition } from './PublishDeposition/index.ts'
import { PublishDraft } from './PublishDraft/index.ts'
import { RemoveRecordFromCommunity } from './RemoveRecordFromCommunity/index.ts'
import { ReserveDoi } from './ReserveDoi/index.ts'
import { StartDraftFileUpload } from './StartDraftFileUpload/index.ts'
import { UpdateDraft } from './UpdateDraft/index.ts'
import { UploadDraftFileContent } from './UploadDraftFileContent/index.ts'
import { UploadFile } from './UploadFile/index.ts'
import type { ZenodoApi } from './ZenodoApi.ts'

export * from './Deposition.ts'
export * from './Draft.ts'
export * from './NewDraft.ts'
export * from './PublishedRecord.ts'
export { type File } from './UploadFile/index.ts'
export { ZenodoApi } from './ZenodoApi.ts'

export class Zenodo extends Context.Service<
  Zenodo,
  {
    addRecordToCommunity: (
      ...args: Parameters<typeof AddRecordToCommunity>
    ) => Effect.Effect<
      Effect.Success<ReturnType<typeof AddRecordToCommunity>>,
      Effect.Error<ReturnType<typeof AddRecordToCommunity>>
    >
    commitDraftFile: (
      ...args: Parameters<typeof CommitDraftFile>
    ) => Effect.Effect<
      Effect.Success<ReturnType<typeof CommitDraftFile>>,
      Effect.Error<ReturnType<typeof CommitDraftFile>>
    >
    /** @deprecated Uses Zenodo's legacy deposit API. */
    createDeposition: (
      ...args: Parameters<typeof CreateDeposition>
    ) => Effect.Effect<
      Effect.Success<ReturnType<typeof CreateDeposition>>,
      Effect.Error<ReturnType<typeof CreateDeposition>>
    >
    createDraft: (
      ...args: Parameters<typeof CreateDraft>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof CreateDraft>>, Effect.Error<ReturnType<typeof CreateDraft>>>
    deleteDraft: (
      ...args: Parameters<typeof DeleteDraft>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof DeleteDraft>>, Effect.Error<ReturnType<typeof DeleteDraft>>>
    editRecord: (
      ...args: Parameters<typeof EditRecord>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof EditRecord>>, Effect.Error<ReturnType<typeof EditRecord>>>
    /** @deprecated Uses Zenodo's legacy deposit API. */
    getDeposition: (
      ...args: Parameters<typeof GetDeposition>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof GetDeposition>>, Effect.Error<ReturnType<typeof GetDeposition>>>
    getDraft: (
      ...args: Parameters<typeof GetDraft>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof GetDraft>>, Effect.Error<ReturnType<typeof GetDraft>>>
    getRecord: (
      ...args: Parameters<typeof GetRecord>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof GetRecord>>, Effect.Error<ReturnType<typeof GetRecord>>>
    /** @deprecated Uses Zenodo's legacy deposit API. */
    publishDeposition: (
      ...args: Parameters<typeof PublishDeposition>
    ) => Effect.Effect<
      Effect.Success<ReturnType<typeof PublishDeposition>>,
      Effect.Error<ReturnType<typeof PublishDeposition>>
    >
    publishDraft: (
      ...args: Parameters<typeof PublishDraft>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof PublishDraft>>, Effect.Error<ReturnType<typeof PublishDraft>>>
    removeRecordFromCommunity: (
      ...args: Parameters<typeof RemoveRecordFromCommunity>
    ) => Effect.Effect<
      Effect.Success<ReturnType<typeof RemoveRecordFromCommunity>>,
      Effect.Error<ReturnType<typeof RemoveRecordFromCommunity>>
    >
    reserveDoi: (
      ...args: Parameters<typeof ReserveDoi>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof ReserveDoi>>, Effect.Error<ReturnType<typeof ReserveDoi>>>
    startDraftFileUpload: (
      ...args: Parameters<typeof StartDraftFileUpload>
    ) => Effect.Effect<
      Effect.Success<ReturnType<typeof StartDraftFileUpload>>,
      Effect.Error<ReturnType<typeof StartDraftFileUpload>>
    >
    updateDraft: (
      ...args: Parameters<typeof UpdateDraft>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof UpdateDraft>>, Effect.Error<ReturnType<typeof UpdateDraft>>>
    uploadDraftFileContent: (
      ...args: Parameters<typeof UploadDraftFileContent>
    ) => Effect.Effect<
      Effect.Success<ReturnType<typeof UploadDraftFileContent>>,
      Effect.Error<ReturnType<typeof UploadDraftFileContent>>
    >
    /** @deprecated Uses Zenodo's legacy deposit API. */
    uploadFile: (
      ...args: Parameters<typeof UploadFile>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof UploadFile>>, Effect.Error<ReturnType<typeof UploadFile>>>
  }
>()('Zenodo') {}

export const addRecordToCommunity = (...args: Parameters<(typeof Zenodo.Service)['addRecordToCommunity']>) =>
  Zenodo.use(service => service.addRecordToCommunity(...args))

export const commitDraftFile = (...args: Parameters<(typeof Zenodo.Service)['commitDraftFile']>) =>
  Zenodo.use(service => service.commitDraftFile(...args))

/** @deprecated Uses Zenodo's legacy deposit API. */
export const createDeposition = (...args: Parameters<(typeof Zenodo.Service)['createDeposition']>) =>
  Zenodo.use(service => service.createDeposition(...args))

export const createDraft = (...args: Parameters<(typeof Zenodo.Service)['createDraft']>) =>
  Zenodo.use(service => service.createDraft(...args))

export const deleteDraft = (...args: Parameters<(typeof Zenodo.Service)['deleteDraft']>) =>
  Zenodo.use(service => service.deleteDraft(...args))

export const editRecord = (...args: Parameters<(typeof Zenodo.Service)['editRecord']>) =>
  Zenodo.use(service => service.editRecord(...args))

/** @deprecated Uses Zenodo's legacy deposit API. */
export const getDeposition = (...args: Parameters<(typeof Zenodo.Service)['getDeposition']>) =>
  Zenodo.use(service => service.getDeposition(...args))

export const getDraft = (...args: Parameters<(typeof Zenodo.Service)['getDraft']>) =>
  Zenodo.use(service => service.getDraft(...args))

export const getRecord = (...args: Parameters<(typeof Zenodo.Service)['getRecord']>) =>
  Zenodo.use(service => service.getRecord(...args))

/** @deprecated Uses Zenodo's legacy deposit API. */
export const publishDeposition = (...args: Parameters<(typeof Zenodo.Service)['publishDeposition']>) =>
  Zenodo.use(service => service.publishDeposition(...args))

export const publishDraft = (...args: Parameters<(typeof Zenodo.Service)['publishDraft']>) =>
  Zenodo.use(service => service.publishDraft(...args))

export const removeRecordFromCommunity = (...args: Parameters<(typeof Zenodo.Service)['removeRecordFromCommunity']>) =>
  Zenodo.use(service => service.removeRecordFromCommunity(...args))

export const reserveDoi = (...args: Parameters<(typeof Zenodo.Service)['reserveDoi']>) =>
  Zenodo.use(service => service.reserveDoi(...args))

export const startDraftFileUpload = (...args: Parameters<(typeof Zenodo.Service)['startDraftFileUpload']>) =>
  Zenodo.use(service => service.startDraftFileUpload(...args))

export const updateDraft = (...args: Parameters<(typeof Zenodo.Service)['updateDraft']>) =>
  Zenodo.use(service => service.updateDraft(...args))

export const uploadDraftFileContent = (...args: Parameters<(typeof Zenodo.Service)['uploadDraftFileContent']>) =>
  Zenodo.use(service => service.uploadDraftFileContent(...args))

/** @deprecated Uses Zenodo's legacy deposit API. */
export const uploadFile = (...args: Parameters<(typeof Zenodo.Service)['uploadFile']>) =>
  Zenodo.use(service => service.uploadFile(...args))

const make: Effect.Effect<typeof Zenodo.Service, never, HttpClient.HttpClient | ZenodoApi> = Effect.gen(function* () {
  const context = yield* Effect.map(Effect.context<HttpClient.HttpClient | ZenodoApi>(), Context.omit(Scope.Scope))

  return {
    addRecordToCommunity: flow(AddRecordToCommunity, Effect.provide(context)),
    commitDraftFile: flow(CommitDraftFile, Effect.provide(context)),
    createDeposition: flow(CreateDeposition, Effect.provide(context)),
    createDraft: flow(CreateDraft, Effect.provide(context)),
    deleteDraft: flow(DeleteDraft, Effect.provide(context)),
    editRecord: flow(EditRecord, Effect.provide(context)),
    getDeposition: flow(GetDeposition, Effect.provide(context)),
    getDraft: flow(GetDraft, Effect.provide(context)),
    getRecord: flow(GetRecord, Effect.provide(context)),
    publishDeposition: flow(PublishDeposition, Effect.provide(context)),
    publishDraft: flow(PublishDraft, Effect.provide(context)),
    removeRecordFromCommunity: flow(RemoveRecordFromCommunity, Effect.provide(context)),
    reserveDoi: flow(ReserveDoi, Effect.provide(context)),
    startDraftFileUpload: flow(StartDraftFileUpload, Effect.provide(context)),
    updateDraft: flow(UpdateDraft, Effect.provide(context)),
    uploadDraftFileContent: flow(UploadDraftFileContent, Effect.provide(context)),
    uploadFile: flow(UploadFile, Effect.provide(context)),
  }
})

export const layer = Layer.effect(Zenodo, make)
