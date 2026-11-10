import { useState, useTransition } from "react";
import { useAuth } from "../context/AuthContext";

function Pricing() {
    const {
        user,
        loading,
        subscriptionPlan,
        setSubscriptionPlan,
        trialActive,
        setTrialActive,
        trialEndAt,
        setTrialEndAt
    } = useAuth();

    const [showModal, setShowModal] = useState(false);
    const [cardNumber, setCardNumber] = useState("");
    const [expiry, setExpiry] = useState("");
    const [cvv, setCvv] = useState("");
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [trialLoading, setTrialLoading] = useState(false);

    // Advanced React concept: useTransition
    const [isPending, startTransition] = useTransition();

    const handleStartTrial = async () => {
        if (!user) {
            alert("Please log in first.");
            return;
        }

        if (subscriptionPlan === "Paid") {
            alert("You already have a Paid subscription.");
            return;
        }

        if (trialActive) {
            alert("Your free trial is already active.");
            return;
        }

        try {
            setTrialLoading(true);

            const token = await user.getIdToken();

            const response = await fetch("http://localhost:3001/api/trial", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to start trial.");
            }

            const endDate = new Date(data.trialEndAt);

            // Update UI state without blocking the interface
            startTransition(() => {
                setTrialActive(true);
                setTrialEndAt(endDate);
                setSubscriptionPlan("Free");
            });

            alert("Your 7-day free trial has started!");

        } catch (error) {
            console.error("Trial error:", error);
            alert(error.message || "Unable to start free trial.");
        } finally {
            setTrialLoading(false);
        }
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();

        if (!user) {
            alert("Please log in first.");
            return;
        }

        if (!cardNumber || !expiry || !cvv) {
            alert("Please fill in all payment details.");
            return;
        }

        if (cardNumber.replace(/\s/g, "").length < 12) {
            alert("Please enter a valid card number.");
            return;
        }

        if (cvv.length < 3) {
            alert("Please enter a valid CVV.");
            return;
        }

        try {
            setPaymentLoading(true);

            const token = await user.getIdToken();

            const response = await fetch(
                "http://localhost:3001/api/upgrade",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to upgrade subscription."
                );
            }

            /*
             * IMPORTANT:
             * Update the React state immediately after the backend
             * successfully changes the user to Paid.
             */
            startTransition(() => {
                setSubscriptionPlan("Paid");
                setTrialActive(false);
                setTrialEndAt(null);
            });

            setShowModal(false);
            setCardNumber("");
            setExpiry("");
            setCvv("");

            alert("Subscription upgraded successfully!");

        } catch (error) {
            console.error("Payment error:", error);
            alert(error.message || "Payment failed.");
        } finally {
            setPaymentLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="pricing-page">
                <h1>Pricing</h1>
                <p>Loading subscription information...</p>
            </div>
        );
    }

    return (
        <div className="pricing-page">

            <h1>DEV@Deakin Pricing</h1>

            <p>
                Choose the plan that works best for you.
            </p>

            {/* Current subscription */}
            {user && (
                <div className="current-plan">
                    <h2>Current Plan</h2>

                    <p>
                        <strong>Plan:</strong>{" "}
                        {subscriptionPlan}
                    </p>

                    {subscriptionPlan === "Paid" && (
                        <p>
                            You currently have access to the Paid
                            subscription features.
                        </p>
                    )}
                </div>
            )}

            {/* FREE PLAN */}
            <div className="pricing-card">
                <h2>Free Plan</h2>

                <h3>$0</h3>

                <ul>
                    <li>Basic DEV@Deakin access</li>
                    <li>Browse posts</li>
                    <li>Create posts</li>
                    <li>Standard features</li>
                </ul>

                {subscriptionPlan === "Paid" ? (
                    <button disabled>
                        Paid Plan Active
                    </button>
                ) : trialActive ? (
                    <div className="trial-active">

                        <h3>Free Trial Active</h3>

                        {trialEndAt && (
                            <p>
                                Your free trial ends on{" "}
                                <strong>
                                    {trialEndAt.toLocaleDateString()}
                                </strong>
                                .
                            </p>
                        )}

                        <p>
                            You currently have access to trial features.
                        </p>

                    </div>
                ) : (
                    <button
                        onClick={handleStartTrial}
                        disabled={trialLoading || isPending}
                    >
                        {trialLoading
                            ? "Starting Trial..."
                            : "Start 7-Day Free Trial"}
                    </button>
                )}
            </div>

            {/* PAID PLAN */}
            <div className="pricing-card">
                <h2>Paid Plan</h2>

                <h3>$9.99 / month</h3>

                <ul>
                    <li>All Free features</li>
                    <li>Premium features</li>
                    <li>Priority access</li>
                    <li>Advanced DEV@Deakin functionality</li>
                </ul>

                {subscriptionPlan === "Paid" ? (
                    <button disabled>
                        Current Paid Plan
                    </button>
                ) : (
                    <button
                        onClick={() => setShowModal(true)}
                    >
                        Upgrade to Paid
                    </button>
                )}
            </div>

            {/* PAYMENT MODAL */}
            {showModal && (
                <div className="payment-modal">

                    <div className="payment-modal-content">

                        <h2>Upgrade to Paid</h2>

                        <p>
                            Enter your payment details to upgrade
                            your subscription.
                        </p>

                        <form onSubmit={handlePaymentSubmit}>

                            <div>
                                <label>
                                    Card Number
                                </label>

                                <input
                                    type="text"
                                    placeholder="1234 5678 9012 3456"
                                    value={cardNumber}
                                    onChange={(e) =>
                                        setCardNumber(e.target.value)
                                    }
                                    maxLength="19"
                                />
                            </div>

                            <div>
                                <label>
                                    Expiry Date
                                </label>

                                <input
                                    type="text"
                                    placeholder="MM/YY"
                                    value={expiry}
                                    onChange={(e) =>
                                        setExpiry(e.target.value)
                                    }
                                    maxLength="5"
                                />
                            </div>

                            <div>
                                <label>
                                    CVV
                                </label>

                                <input
                                    type="password"
                                    placeholder="123"
                                    value={cvv}
                                    onChange={(e) =>
                                        setCvv(e.target.value)
                                    }
                                    maxLength="4"
                                />
                            </div>

                            <div className="payment-buttons">

                                <button
                                    type="submit"
                                    disabled={
                                        paymentLoading ||
                                        isPending
                                    }
                                >
                                    {paymentLoading
                                        ? "Processing..."
                                        : "Confirm Payment"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowModal(false)
                                    }
                                    disabled={paymentLoading}
                                >
                                    Cancel
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            )}

        </div>
    );
}

export default Pricing;