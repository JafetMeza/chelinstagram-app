import ProviderLayout from "./components/layout/provider";
import { Route, Routes } from "react-router";
import HomePage from "./pages/homePage";
import Layout from "./components/layout/layout";
import LoginPage from "./pages/loginPage";
import { ROUTES } from "./routes";
import AuthenticationProvider from "./components/context/authenticationContext";
import CreateChelfiePage from "./pages/createChelfiePage";
import SearchPage from "./pages/searchPage";

function App() {

  return (
    <ProviderLayout>
      <AuthenticationProvider>
        <Routes>
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route element={<Layout />}>
            <Route path={ROUTES.HOME} element={<HomePage />} />
            <Route path={ROUTES.CREATE} element={<CreateChelfiePage />} />
            <Route path={ROUTES.EXPLORE} element={<SearchPage />} />
          </Route>
        </Routes>
      </AuthenticationProvider>
    </ProviderLayout>
  );
}

export default App;
