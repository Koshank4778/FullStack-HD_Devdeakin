import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

function BrowsePosts() {
    const { user, loading } = useAuth();

    const [posts, setPosts] = useState([]);
    const [userPlan, setUserPlan] = useState("Free");
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState("");

    // Filtering states
    const [search, setSearch] = useState("");
    const [postTypeFilter, setPostTypeFilter] = useState("all");
    const [postPlanFilter, setPostPlanFilter] = useState("all");
    const [tagFilter, setTagFilter] = useState("");
    const [dateFilter, setDateFilter] = useState("");

    // Hide and expand states
    const [hiddenPosts, setHiddenPosts] = useState([]);
    const [expandedPosts, setExpandedPosts] = useState([]);

    // Fetch posts from backend
    useEffect(() => {
        if (loading) return;

        const fetchPosts = async () => {
            try {
                setFetching(true);
                setError("");

                const headers = {};

                if (user) {
                    const token = await user.getIdToken();
                    headers.Authorization = `Bearer ${token}`;
                }

                const response = await fetch(
                    "http://localhost:3001/api/posts",
                    { headers }
                );

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || "Unable to load posts.");
                }

                setPosts(result.posts || []);
                setUserPlan(result.userPlan || "Free");

            } catch (err) {
                console.error("Fetch posts error:", err);
                setError(err.message);
            } finally {
                setFetching(false);
            }
        };

        fetchPosts();
    }, [user, loading]);

    // Hide or show a post
    const toggleHide = (postId) => {
        setHiddenPosts((previous) =>
            previous.includes(postId)
                ? previous.filter((id) => id !== postId)
                : [...previous, postId]
        );
    };

    // Expand or collapse a post
    const toggleExpand = (postId) => {
        setExpandedPosts((previous) =>
            previous.includes(postId)
                ? previous.filter((id) => id !== postId)
                : [...previous, postId]
        );
    };

    // Reset all filters and hidden posts
    const handleReset = () => {
        setSearch("");
        setPostTypeFilter("all");
        setPostPlanFilter("all");
        setTagFilter("");
        setDateFilter("");
        setHiddenPosts([]);
        setExpandedPosts([]);
    };

    // Convert ISO date into local YYYY-MM-DD format
    const getPostDate = (createdAt) => {
        if (!createdAt) return "";

        const date = new Date(createdAt);

        if (isNaN(date.getTime())) return "";

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    };

    // Apply filters to posts already permitted by backend
    const filteredPosts = posts.filter((post) => {
        const searchText = [
            post.title,
            post.description,
            post.abstract,
            post.articleText
        ].join(" ").toLowerCase();

        const matchesSearch = searchText.includes(search.toLowerCase());

        const matchesType =
            postTypeFilter === "all" ||
            post.postType === postTypeFilter;

        const matchesPlan =
            postPlanFilter === "all" ||
            post.postPlan === postPlanFilter;

        const matchesTag =
            !tagFilter ||
            post.tags?.some((tag) =>
                tag.toLowerCase().includes(tagFilter.toLowerCase())
            );

        const postDate = getPostDate(post.createdAt);

        const matchesDate =
            !dateFilter || postDate === dateFilter;

        const isVisible = !hiddenPosts.includes(post.id);

        return (
            matchesSearch &&
            matchesType &&
            matchesPlan &&
            matchesTag &&
            matchesDate &&
            isVisible
        );
    });

    if (loading || fetching) {
        return <main className="browse-page">Loading posts...</main>;
    }

    return (
        <main className="browse-page">

            <div className="browse-header">
                <h1>Browse Posts</h1>

                <p>
                    Explore questions and articles shared by the DEV@Deakin community.
                </p>

                <span className="subscription-label">
                    Your plan: {userPlan}
                </span>
            </div>

            {error && (
                <p className="error-message">{error}</p>
            )}

            {/* Search and filtering */}
            <section className="browse-filters">

                <input
                    type="text"
                    placeholder="Search posts..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <select
                    value={postTypeFilter}
                    onChange={(e) => setPostTypeFilter(e.target.value)}
                >
                    <option value="all">All Types</option>
                    <option value="question">Questions</option>
                    <option value="article">Articles</option>
                </select>

                <select
                    value={postPlanFilter}
                    onChange={(e) => setPostPlanFilter(e.target.value)}
                >
                    <option value="all">All Plans</option>
                    <option value="Free">Free</option>
                    <option value="Paid">Paid</option>
                </select>

                <input
                    type="text"
                    placeholder="Filter by tag..."
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                />

                <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                />

                <button
                    type="button"
                    onClick={handleReset}
                    className="reset-button"
                >
                    Reset
                </button>

            </section>

            {/* Posts list */}
            <section className="posts-list">

                <h2>Community Posts ({filteredPosts.length})</h2>

                {filteredPosts.length === 0 ? (
                    <p>No posts found. Try changing your filters.</p>
                ) : (
                    filteredPosts.map((post) => {
                        const isExpanded = expandedPosts.includes(post.id);

                        return (
                            <article className="post-card" key={post.id}>

                                <div className="post-card-header">
                                    <span className="post-type-label">
                                        {post.postType}
                                    </span>

                                    <span className={
                                        post.postPlan === "Paid"
                                            ? "paid-label"
                                            : "free-label"
                                    }>
                                        {post.postPlan}
                                    </span>
                                </div>

                                <h3>{post.title}</h3>

                                <p className="post-date">
                                    {post.createdAt
                                        ? new Date(post.createdAt).toLocaleString()
                                        : "Date unavailable"}
                                </p>

                                {post.postType === "question" ? (
                                    <p>
                                        {isExpanded
                                            ? post.description
                                            : `${post.description?.slice(0, 180)}${post.description?.length > 180 ? "..." : ""}`}
                                    </p>
                                ) : (
                                    <>
                                        <p>
                                            {isExpanded
                                                ? post.abstract
                                                : `${post.abstract?.slice(0, 180)}${post.abstract?.length > 180 ? "..." : ""}`}
                                        </p>

                                        {isExpanded && (
                                            <div className="article-content">
                                                {post.articleText}
                                            </div>
                                        )}
                                    </>
                                )}

                                <div className="post-tags">
                                    {post.tags?.map((tag, index) => (
                                        <span key={index}>#{tag}</span>
                                    ))}
                                </div>

                                <div className="post-actions">

                                    <button
                                        type="button"
                                        onClick={() => toggleExpand(post.id)}
                                    >
                                        {isExpanded ? "Show Less" : "Read More"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => toggleHide(post.id)}
                                    >
                                        Hide Post
                                    </button>

                                </div>

                            </article>
                        );
                    })
                )}

            </section>

        </main>
    );
}

export default BrowsePosts;
