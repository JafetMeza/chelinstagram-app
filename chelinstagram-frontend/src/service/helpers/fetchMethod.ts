import {
  type ApiResponse,
  RequestType,
  ResponseStatus,
  asyncResponse,
  authorizationError,
  communicationError,
  connectionError,
  notFountError,
} from "./serviceConstants";

export const RequestOptions = (
  type: RequestType,
  data: object | FormData | string | boolean = {}
): RequestInit => {
  let header: HeadersInit | undefined = {
    "X-Content-Type-Options": "nosniff",
    "Cashe-Control": "no-cache, no-store, must-revalidate",
  };
  if (type === RequestType.POST || type === RequestType.PUT || type === RequestType.PATCH)
    header = {
      ...header,
      "Content-Type": "application/problem+json; charset=utf-8",
    };

  switch (type) {
    case RequestType.GET:
      return {
        method: RequestType.GET,
        headers: header,
      };
    case RequestType.POST:
      return {
        method: RequestType.POST,
        headers: header,
        body: JSON.stringify(data),
      };
    case RequestType.PUT:
      return {
        method: RequestType.PUT,
        headers: header,
        body: JSON.stringify(data),
      };
    case RequestType.PATCH:
      return {
        method: RequestType.PATCH,
        headers: header,
        body: JSON.stringify(data),
      };
    case RequestType.DELETE:
      return {
        method: RequestType.DELETE,
        headers: header,
      };
    case RequestType.FORM:
      return {
        method: RequestType.POST,
        headers: header,
        body: data as FormData,
      };
    case RequestType.LOGIN:
      return {
        method: RequestType.POST,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
      };
    default:
      return {
        method: RequestType.GET,
        headers: header
      };
  }
};

export const fetchMethod = async <T>(
  url: string,
  type = RequestType.GET,
  data: object | FormData | string | boolean = {}
): Promise<ApiResponse<T>> => {
  const request = RequestOptions(type, data);
  try {
    const response = await fetch(url, { ...request, credentials: 'include' });
    if (!response.ok) throw response;
    return asyncResponse<T>(
      ResponseStatus.OK,
      await response.json().catch(() => { }),
      ""
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.log(err);
    if (err.status === ResponseStatus.BAD_REQUEST) {
      const errorMessage = Promise.resolve(
        err.text().then((errorMessage: string) => {
          return errorMessage;
        })
      );
      return asyncResponse<T>(
        ResponseStatus.BAD_REQUEST,
        null,
        "",
        await errorMessage
      );
    } else if (err.status === ResponseStatus.NO_AUTH) {
      console.error("No authentication");
      return asyncResponse<T>(ResponseStatus.NO_AUTH, null, "", authorizationError);
    } else if (err.status === ResponseStatus.CONFLICT) {
      const errorMessage = Promise.resolve(
        err.text().then((errorMessage: string) => {
          return errorMessage;
        })
      );
      return asyncResponse<T>(
        ResponseStatus.CONFLICT,
        null,
        "",
        await errorMessage
      );
    } else if (err.status === ResponseStatus.NOT_FOUND) {
      return asyncResponse<T>(ResponseStatus.NOT_FOUND, null, "", notFountError);
    } else if (err.status === ResponseStatus.NO_CONNECTION) {
      return asyncResponse<T>(ResponseStatus.NO_CONNECTION, null, "", connectionError);
    }
    else {
      return asyncResponse<T>(
        ResponseStatus.BAD_GATEWAY,
        null,
        "",
        communicationError
      );
    }
  }
};

export const fetchFileMethod = async (
  url: string,
  fileName: string
): Promise<ApiResponse<string>> => {
  const request = RequestOptions(RequestType.GET);
  const response = await fetch(url, { ...request, credentials: 'include' });
  try {
    const data = await response.blob();
    const dataUrl = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${fileName}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return asyncResponse<string>(ResponseStatus.OK, dataUrl, "");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error.status === ResponseStatus.BAD_REQUEST) {
      const errorMessage = Promise.resolve(
        error.text().then((errorMessage: string) => {
          return errorMessage;
        })
      );
      return asyncResponse<string>(
        ResponseStatus.BAD_REQUEST,
        null,
        "",
        await errorMessage
      );
    }

    return asyncResponse<string>(
      ResponseStatus.BAD_GATEWAY,
      null,
      "",
      communicationError
    );
  }
};
