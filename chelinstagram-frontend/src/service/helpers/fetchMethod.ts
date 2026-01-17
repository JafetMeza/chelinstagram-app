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
  // 1. Get token from localStorage
  const token = localStorage.getItem("token");

  // 2. Base Headers
  const header: HeadersInit = {
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-cache, no-store, must-revalidate", // Fixed typo "Cashe"
  };

  // 3. Add Authorization if token exists
  if (token) {
    header["Authorization"] = `Bearer ${token}`;
  }

  // 4. Handle Content-Type and Body
  const isFormData = data instanceof FormData;

  // Only set application/json if we aren't sending FormData
  if (!isFormData && type !== RequestType.GET && type !== RequestType.DELETE) {
    header["Content-Type"] = "application/json; charset=utf-8";
  }

  const options: RequestInit = {
    method: type === RequestType.FORM ? "POST" : type,
    headers: header,
  };

  // 5. Attach Body
  if (type !== RequestType.GET && type !== RequestType.DELETE) {
    options.body = isFormData ? (data as FormData) : JSON.stringify(data);
  }

  return options;
};

export const fetchMethod = async <T>(
  url: string,
  type = RequestType.GET,
  data: object | FormData | string | boolean = {}
): Promise<ApiResponse<T>> => {
  const request = RequestOptions(type, data);
  try {
    const response = await fetch(url, request);
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
  const response = await fetch(url, request);
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
