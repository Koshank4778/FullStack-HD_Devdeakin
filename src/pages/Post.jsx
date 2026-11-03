import { useState } from "react";
import { useAuth } from "../context/AuthContext";

function Post() {
    const { user, loading, subscriptionPlan } = useAuth();

    const [postType, setPostType] = useState("question");
    const [postPlan, setPostPlan] = useState("Free");

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [abstract, setAbstract] = useState("");
    const [articleText, setArticleText] = useState("");
    const [tags, setTags] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePost = async (event) => {
        event.preventDefault();

        if (loading) {
            alert("Please wait while your account is loading.");
            return;
        }

        if (!user) {
            alert("Please log in before creating a post.");
            return;
        }

        const tagList = tags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag !== "");

        if (!title.trim()) {
            alert("Please enter a title.");
            return;
        }

        if (title.trim().length > 150) {
            alert("Title cannot exceed 150 characters.");
            return;
        }

        if (postType === "question" && !description.trim()) {
            alert("Please describe your problem.");
            return;
        }

        if (
            postType === "article" &&
            (!abstract.trim() || !articleText.trim())
        ) {
            alert("Please enter the abstract and article text.");
            return;
        }

        if (tagList.length > 3) {
            alert("You can add a maximum of 3 tags.");
            return;
        }

        if (tagList.some((tag) => tag.length > 30)) {
            alert("Each tag must be 30 characters or less.");
            return;
        }

        if (new Set(tagList.map((tag) => tag.toLowerCase())).size !== tagList.length) {
            alert("Please do not enter duplicate tags.");
            return;
        }

        if (postPlan === "Paid" && subscriptionPlan !== "Paid") {
            alert("You need a Paid subscription to create Paid posts.");
            return;
        }

        const postData = {
            title: title.trim(),
            postType,
            postPlan,
            description: postType === "question" ? description.trim() : "",
            abstract: postType === "article" ? abstract.trim() : "",
            articleText: postType === "article" ? articleText.trim() : "",
            tags: tagList
        };

        try {
            setIsSubmitting(true);

            // Get Firebase authentication token
            const token = await user.getIdToken();

            // Send post information to Express backend
            const response = await fetch("http://localhost:3001/api/posts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(postData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Unable to submit post.");
            }

            alert(result.message);

            // Clear the form after successful submission
            setTitle("");
            setDescription("");
            setAbstract("");
            setArticleText("");
            setTags("");
            setPostType("question");
            setPostPlan("Free");

        } catch (error) {
            console.error("Post submission error:", error);
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <p>Loading account...</p>;
    }

    return (
        <main className="post-page">
            <form className="post-form" onSubmit={handlePost}>
                <h2 className="post-heading">New Post</h2>

                {!user && (
                    <p>Please log in to create a post.</p>
                )}

                <div className="post-type">
                    <span>Select Post Type:</span>

                    <label>
                        <input
                            type="radio"
                            name="postType"
                            value="question"
                            checked={postType === "question"}
                            onChange={() => setPostType("question")}
                        />
                        Question
                    </label>

                    <label>
                        <input
                            type="radio"
                            name="postType"
                            value="article"
                            checked={postType === "article"}
                            onChange={() => setPostType("article")}
                        />
                        Article
                    </label>
                </div>

                <div className="post-type">
                    <span>Select Post Plan:</span>

                    <label>
                        <input
                            type="radio"
                            name="postPlan"
                            value="Free"
                            checked={postPlan === "Free"}
                            onChange={() => setPostPlan("Free")}
                        />
                        Free
                    </label>

                    <label>
                        <input
                            type="radio"
                            name="postPlan"
                            value="Paid"
                            checked={postPlan === "Paid"}
                            onChange={() => setPostPlan("Paid")}
                        />
                        Paid
                    </label>
                </div>

                {postPlan === "Paid" && subscriptionPlan !== "Paid" && (
                    <p className="tag-help">
                        You need to upgrade your subscription before submitting a Paid post.
                    </p>
                )}

                <section className="post-section">
                    <h3>What do you want to ask or share?</h3>

                    <p className="post-instruction">
                        This section changes depending on your post type.
                    </p>

                    <label htmlFor="title">Title</label>

                    <input
                        id="title"
                        type="text"
                        maxLength="150"
                        placeholder={
                            postType === "question"
                                ? "Start your question with how, what, why, etc."
                                : "Enter a descriptive title"
                        }
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        required
                    />

                    {postType === "question" ? (
                        <>
                            <label htmlFor="description">
                                Describe your problem
                            </label>

                            <textarea
                                id="description"
                                className="large-textarea"
                                placeholder="Explain your question or problem"
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                maxLength="10000"
                                required
                            />
                        </>
                    ) : (
                        <>
                            <label htmlFor="abstract">Abstract</label>

                            <textarea
                                id="abstract"
                                className="small-textarea"
                                placeholder="Enter a 1-paragraph abstract"
                                value={abstract}
                                onChange={(event) => setAbstract(event.target.value)}
                                maxLength="2000"
                                required
                            />

                            <label htmlFor="articleText">Article Text</label>

                            <textarea
                                id="articleText"
                                className="large-textarea"
                                placeholder="Write your article here"
                                value={articleText}
                                onChange={(event) => setArticleText(event.target.value)}
                                maxLength="50000"
                                required
                            />
                        </>
                    )}

                    <label htmlFor="tags">Tags</label>

                    <input
                        id="tags"
                        type="text"
                        placeholder="Add up to 3 comma-separated tags, e.g. Java, React"
                        value={tags}
                        onChange={(event) => setTags(event.target.value)}
                    />

                    <p className="tag-help">
                        Separate your tags with commas. You can add up to 3 tags.
                    </p>
                </section>

                <button
                    className="post-button"
                    type="submit"
                    disabled={!user || isSubmitting}
                >
                    {isSubmitting ? "Submitting..." : "Post"}
                </button>
            </form>
        </main>
    );
}

export default Post;
