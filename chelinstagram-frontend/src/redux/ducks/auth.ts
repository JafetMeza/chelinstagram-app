import { AuthResponse } from "@/types/schema";
import { type PayloadAction, createSlice } from "@reduxjs/toolkit";

const initialState: AuthResponse = {
  message: "",
  accessToken: "",
  user: {
    id: "",
    username: "",
    displayName: "",
    avatarUrl: ""
  }
};

const authSlice = createSlice({
  name: "authResponse",
  initialState: initialState,
  reducers: {
    setLogin(_, action: PayloadAction<AuthResponse>) {
      return action.payload;
    },
    setLogout() {
      return initialState;
    }
  },
});

export const { setLogin, setLogout } = authSlice.actions;
export default authSlice.reducer;
