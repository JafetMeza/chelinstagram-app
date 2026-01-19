/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ResponseStatus,
  type ApiResponse,
} from "@/service/helpers/serviceConstants";
import { type PayloadAction, createSlice } from "@reduxjs/toolkit";

interface ApiPayload {
  data: any;
  apiMethod: string;
}

export interface IApiData {
  ok: boolean;
  errorMessage: string;
  data: any;
  loading: boolean;
  status?: ResponseStatus;
  apiMethod: string;
}

const initialState: IApiData = {
  ok: true,
  errorMessage: "",
  data: {},
  loading: false,
  apiMethod: ""
};

const apiDataSlice = createSlice({
  name: "apiData",
  initialState,
  reducers: {
    apiRequest(state) {
      state.ok = false;
      state.loading = true;
      state.data = {};
      state.errorMessage = "";
      state.apiMethod = "";
    },
    apiSuccess(state, action: PayloadAction<ApiPayload>) {
      state.ok = true;
      state.errorMessage = "";
      state.data = action.payload.data;
      state.loading = false;
      state.status = ResponseStatus.OK;
      state.apiMethod = action.payload.apiMethod;
    },
    apiFail(state, action: PayloadAction<ApiResponse<never>>) {
      state.ok = false;
      state.errorMessage = action.payload.error;
      state.data = {};
      state.loading = false;
      state.status = action.payload.status;
      state.apiMethod = action.payload.apiMethod;
    },
    apiClear() {
      return initialState;
    }
  },
});

export const { apiRequest, apiSuccess, apiFail, apiClear } = apiDataSlice.actions;
export default apiDataSlice.reducer;
