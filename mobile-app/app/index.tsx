import { Redirect } from "expo-router";
import { useAuth } from "../src/context/AuthContext";

export default function Index() {
    const { authState } = useAuth();

    if (authState.authenticated) {
        return <Redirect href="/(app)/bus-selection" />;
    } else {
        return <Redirect href="/login" />;
    }
}
