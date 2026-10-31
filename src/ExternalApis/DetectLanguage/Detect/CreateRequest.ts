import { HttpBody, HttpClientRequest } from 'effect/http'

export const CreateRequest = (text: string) =>
  HttpClientRequest.post('https://ws.detectlanguage.com/v3/detect', { body: HttpBody.formDataRecord({ q: text }) })
