import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";

import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [subscriptionPlan, setSubscriptionPlan] = useState("Free");
    const [role, setRole] = useState("user");

    const [trialActive, setTrialActive] = useState(false);
    const [trialEndAt, setTrialEndAt] = useState(null);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!active) return;

            setUser(currentUser);
            setLoading(true);

            if (!currentUser) {
                setSubscriptionPlan("Free");
                setRole("user");
                setTrialActive(false);
                setTrialEndAt(null);
                setLoading(false);
                return;
            }

            try {
                const userRef = doc(db, "User", currentUser.uid);
                const userSnapshot = await getDoc(userRef);

                if (active) {
                    const userData = userSnapshot.exists()
                        ? userSnapshot.data()
                        : {};

                    const plan = userData.subscriptionPlan || "Free";
                    const userRole = userData.role || "user";

                    let activeTrial = false;
                    let endDate = null;

                    if (userData.trialEndAt) {
                        endDate = userData.trialEndAt.toDate
                            ? userData.trialEndAt.toDate()
                            : new Date(userData.trialEndAt);

                        activeTrial =
                            endDate.getTime() > Date.now() &&
                            plan !== "Paid";
                    }

                    setSubscriptionPlan(plan);
                    setRole(userRole);
                    setTrialActive(activeTrial);
                    setTrialEndAt(endDate);
                }
            } catch (error) {
                console.error("Error loading user data:", error);

                if (active) {
                    setSubscriptionPlan("Free");
                    setRole("user");
                    setTrialActive(false);
                    setTrialEndAt(null);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        });

        return () => {
            active = false;
            unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,

                subscriptionPlan,
                setSubscriptionPlan,

                role,

                trialActive,
                setTrialActive,

                trialEndAt,
                setTrialEndAt
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}