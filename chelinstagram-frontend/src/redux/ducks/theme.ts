import { type PayloadAction, createSlice } from "@reduxjs/toolkit";

type theme = "dark" | "light";
const initialState: theme = "light";

const themeSlice = createSlice({
  name: "theme",
  initialState: initialState as theme,
  reducers: {
    setTheme(_, action: PayloadAction<theme>) {
      return action.payload;
    },
  },
});

export const { setTheme } = themeSlice.actions;
export default themeSlice.reducer;
