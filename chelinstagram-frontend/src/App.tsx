import ProviderLayout from "./components/layout/provider";
import { Route, Routes } from "react-router";
import HomePage from "./pages/homePage";
import Layout from "./components/layout/layout";
import LoginPage from "./pages/loginPage";
import { ROUTES } from "./routes";
import AuthenticationProvider from "./components/context/authenticationContext";

function App() {

  return (
    <ProviderLayout>
      <AuthenticationProvider>
        <Routes>
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route element={<Layout />}>
            <Route path={ROUTES.HOME} element={<HomePage />} />
          </Route>
        </Routes>
      </AuthenticationProvider>
    </ProviderLayout>
  );
}

export default App;
