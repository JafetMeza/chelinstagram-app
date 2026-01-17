import { AuthResponse } from "@/types/schema";
import { type PayloadAction, createSlice } from "@reduxjs/toolkit";

const initialState: AuthResponse = {
  token: "",
  user: {
    id: "",
    username: "",
    email: "",
    displayName: "",
    avatar: ""
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
