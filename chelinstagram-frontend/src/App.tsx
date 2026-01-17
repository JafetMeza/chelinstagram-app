import ProviderLayout from "./components/layout/provider";
import { Route, Routes } from "react-router";
import HomePage from "./pages/homePage";
import Layout from "./components/layout/layout";

function App() {

  return (
    <ProviderLayout>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
        </Route>
      </Routes>
    </ProviderLayout>
  );
}

export default App;
