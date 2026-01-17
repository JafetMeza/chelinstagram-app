export interface ApiResponse<T> {
  status: ResponseStatus;
  error: string;
  data?: T | null;
  apiMethod: string;
}

export const asyncResponse = <T>(
  status: ResponseStatus,
  data: T | null = null,
  apiMethod: string,
  error = ""
): ApiResponse<T> => ({
  status,
  data,
  error,
  apiMethod
});

// METHODS
export enum RequestType {
  POST = "POST",
  GET = "GET",
  PUT = "PUT",
  DELETE = "DELETE",
  FORM = "FORM",
  PATCH = "PATCH",
  LOGIN = "LOGIN",
}

// STATUS
export enum ResponseStatus {
  NONE = 0,
  OK = 200,
  BAD_REQUEST = 400,
  NOT_FOUND = 404,
  NO_AUTH = 401,
  CONFLICT = 409,
  BAD_GATEWAY = 500,
  NO_CONNECTION = 600,
}

// ERROR FOR API
export const communicationError =
  "An internal server error occurred. Please try again later.";
export const connectionError =
  "It seems you are not connected to the internet. Please check your connection.";
export const authorizationError =
  "You are not authorized to access this resource. Please log in again.";
export const notFountError = "The requested information could not be found.";
export const unknownError = "An unknown error occurred. Please try again.";
