export class HttpError extends Error {
  readonly statusCode: number;
  readonly details: string[];

  constructor(statusCode: number, message: string, details: string[] = [], readonly error = 'RequestError') {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const notFound = (message: string): HttpError => new HttpError(404, message, [], 'NotFound');
export const conflict = (message: string): HttpError => new HttpError(409, message, [], 'Conflict');
export const badRequest = (message: string, details: string[] = []): HttpError =>
  new HttpError(400, message, details, 'BadRequest');
