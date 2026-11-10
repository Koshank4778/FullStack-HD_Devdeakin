import { useEffect, useMemo, useState } from "react";
import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    updateDoc
} from "firebase/firestore";

import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

function AdminDashboard() {
    const { user, role, loading: authLoading } = useAuth();

    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [subscriptionFilter, setSubscriptionFilter] = useState("All");

    const loadUsers = async () => {
        try {
            setLoadingUsers(true);

            const usersCollection = collection(db, "User");
            const snapshot = await getDocs(usersCollection);

            const userList = snapshot.docs.map((document) => ({
                id: document.id,
                ...document.data()
            }));

            setUsers(userList);
        } catch (error) {
            console.error("Error loading users:", error);
        } finally {
            setLoadingUsers(false);
        }
    };

    useEffect(() => {
        if (role === "admin") {
            loadUsers();
        }
    }, [role]);

    const statistics = useMemo(() => {
        const totalUsers = users.length;

        const freeUsers = users.filter(
            (user) => (user.subscriptionPlan || "Free") === "Free"
        ).length;

        const paidUsers = users.filter(
            (user) => user.subscriptionPlan === "Paid"
        ).length;

        const adminUsers = users.filter(
            (user) => (user.role || "user") === "admin"
        ).length;

        return {
            totalUsers,
            freeUsers,
            paidUsers,
            adminUsers
        };
    }, [users]);

    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            const name = user.name || "";
            const email = user.email || "";
            const plan = user.subscriptionPlan || "Free";

            const search = searchTerm.toLowerCase();

            const matchesSearch =
                name.toLowerCase().includes(search) ||
                email.toLowerCase().includes(search);

            const matchesSubscription =
                subscriptionFilter === "All" ||
                plan === subscriptionFilter;

            return matchesSearch && matchesSubscription;
        });
    }, [users, searchTerm, subscriptionFilter]);

    const changeSubscription = async (userId, currentPlan) => {
        const newPlan = currentPlan === "Paid" ? "Free" : "Paid";

        try {
            await updateDoc(doc(db, "User", userId), {
                subscriptionPlan: newPlan
            });

            setUsers((previousUsers) =>
                previousUsers.map((user) =>
                    user.id === userId
                        ? {
                            ...user,
                            subscriptionPlan: newPlan
                        }
                        : user
                )
            );
        } catch (error) {
            console.error("Error updating subscription:", error);
            alert("Unable to update subscription.");
        }
    };

    const changeRole = async (userId, currentRole) => {
        const newRole = currentRole === "admin" ? "user" : "admin";

        if (userId === user.uid && newRole === "user") {
            alert("You cannot remove your own administrator role.");
            return;
        }

        try {
            await updateDoc(doc(db, "User", userId), {
                role: newRole
            });

            setUsers((previousUsers) =>
                previousUsers.map((user) =>
                    user.id === userId
                        ? {
                            ...user,
                            role: newRole
                        }
                        : user
                )
            );
        } catch (error) {
            console.error("Error updating role:", error);
            alert("Unable to update user role.");
        }
    };

    const deleteUser = async (userId) => {
        if (userId === user.uid) {
            alert("You cannot delete your own account.");
            return;
        }

        const confirmed = window.confirm(
            "Are you sure you want to delete this user?"
        );

        if (!confirmed) {
            return;
        }

        try {
            await deleteDoc(doc(db, "User", userId));

            setUsers((previousUsers) =>
                previousUsers.filter((user) => user.id !== userId)
            );
        } catch (error) {
            console.error("Error deleting user:", error);
            alert("Unable to delete user.");
        }
    };

    if (authLoading) {
        return (
            <div className="admin-loading">
                <h2>Loading Admin Dashboard...</h2>
            </div>
        );
    }

    if (!user || role !== "admin") {
        return (
            <div className="admin-access-denied">
                <h2>Access Denied</h2>
                <p>
                    You do not have permission to access the Admin Dashboard.
                </p>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">

            <div className="admin-header">
                <div>
                    <h1>Admin Dashboard</h1>
                    <p>
                        Manage and monitor users across the DEV@Deakin
                        platform.
                    </p>
                </div>

                <div className="admin-badge">
                    Administrator
                </div>
            </div>

            <div className="statistics-grid">

                <div className="stat-card">
                    <h3>Total Users</h3>
                    <p>{statistics.totalUsers}</p>
                </div>

                <div className="stat-card">
                    <h3>Free Users</h3>
                    <p>{statistics.freeUsers}</p>
                </div>

                <div className="stat-card">
                    <h3>Paid Users</h3>
                    <p>{statistics.paidUsers}</p>
                </div>

                <div className="stat-card">
                    <h3>Administrators</h3>
                    <p>{statistics.adminUsers}</p>
                </div>

            </div>

            <div className="user-management">

                <div className="management-header">
                    <div>
                        <h2>User Management</h2>
                        <p>
                            Search, filter and manage registered
                            DEV@Deakin users.
                        </p>
                    </div>
                </div>

                <div className="filters">

                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(event) =>
                            setSearchTerm(event.target.value)
                        }
                    />

                    <select
                        value={subscriptionFilter}
                        onChange={(event) =>
                            setSubscriptionFilter(event.target.value)
                        }
                    >
                        <option value="All">All Plans</option>
                        <option value="Free">Free</option>
                        <option value="Paid">Paid</option>
                    </select>

                </div>

                {loadingUsers ? (
                    <div className="table-loading">
                        Loading users...
                    </div>
                ) : (
                    <div className="table-container">

                        <table>

                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Subscription</th>
                                    <th>Role</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>

                                {filteredUsers.length > 0 ? (
                                    filteredUsers.map((user) => {

                                        const currentPlan =
                                            user.subscriptionPlan || "Free";

                                        const currentRole =
                                            user.role || "user";

                                        return (
                                            <tr key={user.id}>

                                                <td>
                                                    {user.name || "Unknown"}
                                                </td>

                                                <td>
                                                    {user.email || "No email"}
                                                </td>

                                                <td>
                                                    <span
                                                        className={`plan-badge ${currentPlan === "Paid"
                                                                ? "paid"
                                                                : "free"
                                                            }`}
                                                    >
                                                        {currentPlan}
                                                    </span>
                                                </td>

                                                <td>
                                                    {currentRole}
                                                </td>

                                                <td>
                                                    {user.createdAt
                                                        ? new Date(
                                                            user.createdAt.seconds *
                                                            1000
                                                        ).toLocaleDateString()
                                                        : "N/A"}
                                                </td>

                                                <td>
                                                    <div className="admin-actions">

                                                        <button
                                                            onClick={() =>
                                                                changeSubscription(
                                                                    user.id,
                                                                    currentPlan
                                                                )
                                                            }
                                                        >
                                                            {currentPlan === "Paid"
                                                                ? "Set Free"
                                                                : "Set Paid"}
                                                        </button>

                                                        <button
                                                            onClick={() =>
                                                                changeRole(
                                                                    user.id,
                                                                    currentRole
                                                                )
                                                            }
                                                        >
                                                            {currentRole === "admin"
                                                                ? "Make User"
                                                                : "Make Admin"}
                                                        </button>

                                                        <button
                                                            className="delete-button"
                                                            onClick={() =>
                                                                deleteUser(
                                                                    user.id
                                                                )
                                                            }
                                                        >
                                                            Delete
                                                        </button>

                                                    </div>
                                                </td>

                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="6">
                                            No users found.
                                        </td>
                                    </tr>
                                )}

                            </tbody>

                        </table>

                    </div>
                )}

            </div>

        </div>
    );
}

export default AdminDashboard;