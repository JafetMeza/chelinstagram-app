import throttle from "lodash/throttle";
import { loadState, saveState } from "../helpers/localStorageForRedux";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import themeReducer from "./ducks/theme";
import apiDataReducer from "./ducks/apiData";
import authReducer from "./ducks/auth";
import profileReducer from "./ducks/profileState";

const rootReducer = combineReducers({
  theme: themeReducer,
  apiData: apiDataReducer,
  authData: authReducer,
  profileState: profileReducer,
});

const persistedState = loadState();

const store = configureStore({
  reducer: rootReducer,
  devTools: process.env.NODE_ENV !== "production",
  preloadedState: persistedState,
});

store.subscribe(
  throttle(() => {
    saveState({
      theme: store.getState().theme,
      authData: store.getState().authData,
      profileState: store.getState().profileState
    });
  }, 1000)
);

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export default store;
