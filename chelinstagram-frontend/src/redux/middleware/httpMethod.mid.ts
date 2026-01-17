/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  type ApiResponse,
  ResponseStatus,
} from "@/service/helpers/serviceConstants";
import { apiRequest, apiSuccess, apiFail } from "../ducks/apiData";
import { type AppDispatch } from "../createStore";

export type ApiMethodType<T, Params extends any[]> = (
  ...params: Params
) => Promise<ApiResponse<T>>;

export const GetApi = <T, Params extends any[]>(
  params: Params,
  apiMethod: ApiMethodType<T, Params>
) => {
  return async (dispatch: AppDispatch) => {
    dispatch(apiRequest());
    const result = await apiMethod(...params);
    if (result.status === ResponseStatus.OK) {
      return dispatch(apiSuccess({
        data: result.data,
        apiMethod: apiMethod.name
      }));
    } else {
      return dispatch(apiFail({ error: result.error, status: result.status, apiMethod: apiMethod.name }));
    }
  };
};

export const PostApi =
  <T, Params extends any[]>(
    params: Params,
    apiMethod: ApiMethodType<T, Params>
  ) =>
    async (dispatch: AppDispatch) => {
      dispatch(apiRequest());
      const result = await apiMethod(...params);
      if (result.status === ResponseStatus.OK) {
        return dispatch(apiSuccess({ data: result.data, apiMethod: apiMethod.name }));
      } else {
        return dispatch(
          apiFail({
            error: result.error,
            status: result.status,
            apiMethod: apiMethod.name
          })
        );
      }
    };
