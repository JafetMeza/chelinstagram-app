import ProviderLayout from "./components/layout/provider";
import { Route, Routes } from "react-router";
import HomePage from "./pages/homePage";
import Layout from "./components/layout/layout";
import LoginPage from "./pages/loginPage";
import { ROUTES } from "./routes";
import AuthenticationProvider from "./components/context/authenticationContext";
import CreateChelfiePage from "./pages/createChelfiePage";
import SearchPage from "./pages/searchPage";
import ProfileGridPage from "./pages/profileGridPage";
import ProfileFeedPage from "./pages/profileFeedPage";
import EditProfilePage from "./pages/editProfile";
import FollowersPage from "./pages/followersPage";
import ChatListPage from "./pages/chatListPage";
import ChatRoomPage from "./pages/chatRoomPage";
import { PwaUpdatePrompt } from "./components/ui/pwaUpdatePromt";
import { SocketProvider } from "./components/context/socketContext";
import { PushNotificationPrompt } from "./components/ui/pushNotificationPromt";
import SettingsPage from "./pages/settingsPage";

function App() {

  return (
    <>
      <PwaUpdatePrompt />
      <ProviderLayout>
        <PushNotificationPrompt />
        <AuthenticationProvider>
          <SocketProvider>
            <Routes>
              <Route path={ROUTES.LOGIN} element={<LoginPage />} />
              <Route element={<Layout />}>
                <Route path={ROUTES.HOME} element={<HomePage />} />
                <Route path={ROUTES.CREATE} element={<CreateChelfiePage />} />
                <Route path={ROUTES.EXPLORE} element={<SearchPage />} />
                <Route path={ROUTES.PROFILE_PATH} element={<ProfileGridPage />} />
                <Route path={ROUTES.PROFILE_FEED_PATH} element={<ProfileFeedPage />} />
                <Route path={ROUTES.EDIT_PROFILE} element={<EditProfilePage />} />
                <Route path={ROUTES.FOLLOWERS_PATH} element={<FollowersPage />} />
                <Route path={ROUTES.CHAT_LIST} element={<ChatListPage />} />
                <Route path={ROUTES.CHAT_PATH} element={<ChatRoomPage />} />
                <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
              </Route>
            </Routes>
          </SocketProvider>
        </AuthenticationProvider>
      </ProviderLayout>
    </>
  );
}

export default App;
