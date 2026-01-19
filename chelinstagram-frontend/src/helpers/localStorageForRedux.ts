/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
export const loadState = (): any => {
  try {
    const serializedState = localStorage.getItem("broker-configuration-app");
    if (serializedState === null) {
      return undefined;
    }
    return JSON.parse(serializedState);
  } catch (err) {
    return undefined;
  }
};

export const saveState = (state: object): void => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem("broker-configuration-app", serializedState);
  } catch (err) { /* empty */ }
};
