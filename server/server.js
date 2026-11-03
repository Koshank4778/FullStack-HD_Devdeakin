
import express from "express";
import cors from "cors";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Firebase Admin SDK initialization
initializeApp({
    credential: applicationDefault(),
    projectId: "dev-deakin-d2"
});

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

const db = getFirestore();
const adminAuth = getAuth();


// ==========================================
// 1. UPGRADE SUBSCRIPTION API
// ==========================================

app.post("/api/upgrade", async (req, res) => {
    try {
        const authHeader = req.headers.authorization || "";
        const token = authHeader.startsWith("Bearer ")
            ? authHeader.slice(7)
            : "";

        if (!token) {
            return res.status(401).json({
                error: "Please log in first."
            });
        }

        let decodedToken;

        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (error) {
            console.error("Firebase token verification failed:", error.message);

            return res.status(401).json({
                error: "Invalid or expired login. Check the backend terminal."
            });
        }

        const userRef = db.collection("User").doc(decodedToken.uid);
        const userSnapshot = await userRef.get();

        if (!userSnapshot.exists) {
            return res.status(404).json({
                error: "User account not found."
            });
        }

        const userData = userSnapshot.data();

        if (userData.subscriptionPlan === "Paid") {
            return res.status(409).json({
                error: "You already have the Paid plan."
            });
        }

        await userRef.update({
            subscriptionPlan: "Paid",
            subscriptionUpdatedAt: FieldValue.serverTimestamp()
        });

        return res.json({
            message: "Plan upgraded successfully.",
            subscriptionPlan: "Paid"
        });

    } catch (error) {
        console.error("Upgrade error:", error);

        return res.status(500).json({
            error: "Unable to upgrade the plan."
        });
    }
});


// ==========================================
// 2. CREATE POST API
// ==========================================

app.post("/api/posts", async (req, res) => {
    try {
        const authHeader = req.headers.authorization || "";
        const token = authHeader.startsWith("Bearer ")
            ? authHeader.slice(7)
            : "";

        if (!token) {
            return res.status(401).json({
                error: "Please log in before creating a post."
            });
        }

        let decodedToken;

        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (error) {
            console.error("Token verification failed:", error.message);

            return res.status(401).json({
                error: "Invalid or expired login. Please log in again."
            });
        }

        const userRef = db.collection("User").doc(decodedToken.uid);
        const userSnapshot = await userRef.get();

        if (!userSnapshot.exists) {
            return res.status(404).json({
                error: "User account not found."
            });
        }

        const userData = userSnapshot.data();
        const userPlan = userData.subscriptionPlan || "Free";

        const {
            title,
            postType,
            postPlan,
            description,
            abstract,
            articleText,
            tags
        } = req.body;

        // Validate title
        if (
            typeof title !== "string" ||
            !title.trim() ||
            title.trim().length > 150
        ) {
            return res.status(400).json({
                error: "Title is required and must not exceed 150 characters."
            });
        }

        // Validate post type
        if (!["question", "article"].includes(postType)) {
            return res.status(400).json({
                error: "Invalid post type."
            });
        }

        // Validate post plan
        if (!["Free", "Paid"].includes(postPlan)) {
            return res.status(400).json({
                error: "Invalid post plan."
            });
        }

        // Check subscription permission
        if (postPlan === "Paid" && userPlan !== "Paid") {
            return res.status(403).json({
                error: "Upgrade to the Paid plan to create Paid posts."
            });
        }

        // Validate question
        if (postType === "question") {
            if (
                typeof description !== "string" ||
                !description.trim() ||
                description.trim().length > 10000
            ) {
                return res.status(400).json({
                    error: "A valid question description is required."
                });
            }
        }

        // Validate article
        if (postType === "article") {
            if (
                typeof abstract !== "string" ||
                !abstract.trim() ||
                abstract.trim().length > 2000
            ) {
                return res.status(400).json({
                    error: "A valid article abstract is required."
                });
            }

            if (
                typeof articleText !== "string" ||
                !articleText.trim() ||
                articleText.trim().length > 50000
            ) {
                return res.status(400).json({
                    error: "Valid article text is required."
                });
            }
        }

        // Validate tags
        if (!Array.isArray(tags) || tags.length > 3) {
            return res.status(400).json({
                error: "You can add a maximum of 3 tags."
            });
        }

        const cleanTags = tags.map(tag =>
            typeof tag === "string" ? tag.trim() : ""
        );

        if (
            cleanTags.some(tag => !tag || tag.length > 30) ||
            new Set(cleanTags.map(tag => tag.toLowerCase())).size !== cleanTags.length
        ) {
            return res.status(400).json({
                error: "Please provide valid, unique tags."
            });
        }

        // Prepare Firestore document
        const postData = {
            title: title.trim(),
            postType,
            postPlan,
            description: postType === "question" ? description.trim() : "",
            abstract: postType === "article" ? abstract.trim() : "",
            articleText: postType === "article" ? articleText.trim() : "",
            tags: cleanTags,
            userId: decodedToken.uid,
            createdAt: FieldValue.serverTimestamp()
        };

        // Save post to Firestore
        const postRef = await db.collection("Posts").add(postData);

        return res.status(201).json({
            message: "Post submitted successfully!",
            postId: postRef.id
        });

    } catch (error) {
        console.error("Create post error:", error);

        return res.status(500).json({
            error: "Unable to save your post. Please try again."
        });
    }
});


// ==========================================
// 3. RETRIEVE POSTS API
// ==========================================

app.get("/api/posts", async (req, res) => {
    try {
        let userPlan = "Free";

        const authHeader = req.headers.authorization || "";

        if (authHeader.startsWith("Bearer ")) {
            const token = authHeader.slice(7);

            try {
                const decodedToken = await adminAuth.verifyIdToken(token);

                const userRef = db.collection("User").doc(decodedToken.uid);
                const userSnapshot = await userRef.get();

                if (!userSnapshot.exists) {
                    return res.status(404).json({
                        error: "User account not found."
                    });
                }

                userPlan = userSnapshot.data().subscriptionPlan || "Free";

            } catch (error) {
                console.error("Token verification failed:", error.message);

                return res.status(401).json({
                    error: "Invalid or expired login."
                });
            }
        }

        // Retrieve posts according to subscription
        let postsQuery = db.collection("Posts");

        if (userPlan !== "Paid") {
            postsQuery = postsQuery.where("postPlan", "==", "Free");
        }

        const snapshot = await postsQuery
            .orderBy("createdAt", "desc")
            .get();

        // Convert Firestore timestamps into JSON-compatible dates
        const posts = snapshot.docs.map(doc => {
            const data = doc.data();

            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt
                    ? data.createdAt.toDate().toISOString()
                    : null
            };
        });

        return res.json({
            posts,
            userPlan
        });

    } catch (error) {
        console.error("Fetch posts error:", error);

        return res.status(500).json({
            error: "Unable to retrieve posts."
        });
    }
});


// ==========================================
// 4. START EXPRESS SERVER
// ==========================================

app.listen(3001, () => {
    console.log("Backend running at http://localhost:3001");
});
