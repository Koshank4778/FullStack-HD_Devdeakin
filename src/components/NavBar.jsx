import { Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase";

function NavBar() {
    const { user, loading } = useAuth();

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout error:", error);
            alert("Unable to log out. Please try again.");
        }
    };

    return (
        <header className="site-header">

            <Link to="/" className="logo">
                DEV<span>@</span>Deakin
            </Link>

            <nav>
                <Link to="/">Home</Link>
                <Link to="/about">About</Link>
                <Link to="/post">Post</Link>
                <Link to="/browse-posts">Browse Posts</Link>
                <Link to="/pricing">Pricing</Link>

                {!loading && (
                    user ? (
                        <>
                            <span>{user.email}</span>

                            <button onClick={handleLogout}>
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login">Login</Link>
                            <Link to="/signup">Sign Up</Link>
                        </>
                    )
                )}
            </nav>

        </header>
    );
}

export default NavBar;
