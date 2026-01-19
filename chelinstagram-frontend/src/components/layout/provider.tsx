"use client";

import { Provider } from "react-redux";
import store from "@/redux/createStore";

export default function ProviderLayout({
    children,
}: {
    children: React.ReactNode;
}): React.ReactNode {
    return (
        <Provider store={store}>
            {children}
        </Provider>
    );
}
