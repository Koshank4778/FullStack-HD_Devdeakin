import express from "express";
import cors from "cors";
import {
    initializeApp,
    cert
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
    getFirestore,
    FieldValue,
    Timestamp
} from "firebase-admin/firestore";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


// ==========================================
// FIREBASE ADMIN SDK INITIALIZATION
// ==========================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.join(
    __dirname,
    "serviceAccountKey.json"
);

if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(
        "Firebase service account key not found at: " +
        serviceAccountPath
    );
}

const serviceAccount = JSON.parse(
    fs.readFileSync(serviceAccountPath, "utf8")
);

initializeApp({
    credential: cert(serviceAccount),
    projectId: "dev-deakin-hd"
});


const app = express();

app.use(
    cors({
        origin: "http://localhost:5173"
    })
);

app.use(express.json());

const db = getFirestore();
const adminAuth = getAuth();


// ==========================================
// HELPER: VERIFY FIREBASE USER TOKEN
// ==========================================

async function verifyUser(req) {
    const authHeader = req.headers.authorization || "";

    const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : "";

    if (!token) {
        throw new Error("NO_TOKEN");
    }

    return await adminAuth.verifyIdToken(token);
}


// ==========================================
// HELPER: CHECK ACTIVE TRIAL
// ==========================================

function hasActiveTrial(userData) {
    if (!userData.trialEndAt) {
        return false;
    }

    let trialEnd;

    try {
        if (
            userData.trialEndAt &&
            typeof userData.trialEndAt.toDate === "function"
        ) {
            trialEnd = userData.trialEndAt.toDate();
        } else {
            trialEnd = new Date(userData.trialEndAt);
        }
    } catch (error) {
        console.error("Invalid trialEndAt:", error);
        return false;
    }

    if (Number.isNaN(trialEnd.getTime())) {
        return false;
    }

    return trialEnd.getTime() > Date.now();
}


// ==========================================
// 1. UPGRADE SUBSCRIPTION API
// ==========================================

app.post("/api/upgrade", async (req, res) => {
    try {
        let decodedToken;

        try {
            decodedToken = await verifyUser(req);
        } catch (error) {
            if (error.message === "NO_TOKEN") {
                return res.status(401).json({
                    error: "Please log in first."
                });
            }

            console.error(
                "Firebase token verification failed:",
                error.message
            );

            return res.status(401).json({
                error: "Invalid or expired login."
            });
        }

        const userRef = db
            .collection("User")
            .doc(decodedToken.uid);

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
            subscriptionUpdatedAt:
                FieldValue.serverTimestamp(),

            // Paid users no longer need an active trial
            trialActive: false
        });

        return res.json({
            message: "Plan upgraded successfully.",
            subscriptionPlan: "Paid"
        });

    } catch (error) {
        console.error("Upgrade error:", error);

        return res.status(500).json({
            error:
                error.message ||
                "Unable to upgrade the plan."
        });
    }
});


// ==========================================
// 2. START 7-DAY FREE TRIAL API
// ==========================================

app.post("/api/trial", async (req, res) => {
    try {
        let decodedToken;

        // --------------------------------------
        // Verify login
        // --------------------------------------

        try {
            decodedToken = await verifyUser(req);
        } catch (error) {
            if (error.message === "NO_TOKEN") {
                return res.status(401).json({
                    error:
                        "Please log in before starting the free trial."
                });
            }

            console.error(
                "Firebase token verification failed:",
                error.message
            );

            return res.status(401).json({
                error: "Invalid or expired login."
            });
        }


        // --------------------------------------
        // Find user
        // --------------------------------------

        const userRef = db
            .collection("User")
            .doc(decodedToken.uid);

        const userSnapshot = await userRef.get();

        if (!userSnapshot.exists) {
            return res.status(404).json({
                error: "User account not found."
            });
        }

        const userData = userSnapshot.data();


        // --------------------------------------
        // Check Paid plan
        // --------------------------------------

        if (userData.subscriptionPlan === "Paid") {
            return res.status(409).json({
                error:
                    "You are already on the Paid plan."
            });
        }


        // --------------------------------------
        // Check whether trial is currently active
        // --------------------------------------

        if (
            userData.trialActive === true &&
            userData.trialEndAt
        ) {
            const trialEnd =
                userData.trialEndAt.toDate();

            if (trialEnd.getTime() > Date.now()) {
                return res.status(409).json({
                    error:
                        "Your free trial is already active."
                });
            }
        }


        // --------------------------------------
        // Prevent reusing an expired trial
        // --------------------------------------

        if (
            userData.trialStartAt ||
            userData.trialEndAt
        ) {
            return res.status(409).json({
                error:
                    "Your free trial has already been used."
            });
        }


        // --------------------------------------
        // Calculate 7-day trial
        // --------------------------------------

        const startTime = Date.now();

        const endTime =
            startTime +
            (7 * 24 * 60 * 60 * 1000);

        const trialStart =
            Timestamp.fromMillis(startTime);

        const trialEnd =
            Timestamp.fromMillis(endTime);


        // --------------------------------------
        // Save trial information
        // --------------------------------------

        await userRef.update({
            trialActive: true,
            trialStartAt: trialStart,
            trialEndAt: trialEnd
        });


        // --------------------------------------
        // Return trial information
        // --------------------------------------

        return res.status(201).json({
            message:
                "7-day free trial started successfully.",

            trialActive: true,

            trialStartAt:
                new Date(startTime).toISOString(),

            trialEndAt:
                new Date(endTime).toISOString()
        });

    } catch (error) {
        console.error(
            "Free trial error:",
            error
        );

        return res.status(500).json({
            error:
                error.message ||
                "Unable to start the free trial."
        });
    }
});


// ==========================================
// 3. CREATE POST API
// ==========================================

app.post("/api/posts", async (req, res) => {
    try {
        let decodedToken;

        try {
            decodedToken = await verifyUser(req);
        } catch (error) {
            if (error.message === "NO_TOKEN") {
                return res.status(401).json({
                    error:
                        "Please log in before creating a post."
                });
            }

            console.error(
                "Token verification failed:",
                error.message
            );

            return res.status(401).json({
                error:
                    "Invalid or expired login. Please log in again."
            });
        }


        // --------------------------------------
        // Find user
        // --------------------------------------

        const userRef = db
            .collection("User")
            .doc(decodedToken.uid);

        const userSnapshot =
            await userRef.get();

        if (!userSnapshot.exists) {
            return res.status(404).json({
                error:
                    "User account not found."
            });
        }


        const userData =
            userSnapshot.data();

        const userPlan =
            userData.subscriptionPlan ||
            "Free";

        const trialAccess =
            hasActiveTrial(userData);


        // A Paid user OR active trial has Paid content access
        const hasPaidAccess =
            userPlan === "Paid" ||
            trialAccess;


        // --------------------------------------
        // Request data
        // --------------------------------------

        const {
            title,
            postType,
            postPlan,
            description,
            abstract,
            articleText,
            tags
        } = req.body;


        // --------------------------------------
        // Validate title
        // --------------------------------------

        if (
            typeof title !== "string" ||
            !title.trim() ||
            title.trim().length > 150
        ) {
            return res.status(400).json({
                error:
                    "Title is required and must not exceed 150 characters."
            });
        }


        // --------------------------------------
        // Validate post type
        // --------------------------------------

        if (
            !["question", "article"]
                .includes(postType)
        ) {
            return res.status(400).json({
                error:
                    "Invalid post type."
            });
        }


        // --------------------------------------
        // Validate post plan
        // --------------------------------------

        if (
            !["Free", "Paid"]
                .includes(postPlan)
        ) {
            return res.status(400).json({
                error:
                    "Invalid post plan."
            });
        }


        // --------------------------------------
        // Check Paid content permission
        // --------------------------------------

        if (
            postPlan === "Paid" &&
            !hasPaidAccess
        ) {
            return res.status(403).json({
                error:
                    "Upgrade to the Paid plan or start a free trial to create Paid posts."
            });
        }


        // --------------------------------------
        // Validate question
        // --------------------------------------

        if (postType === "question") {

            if (
                typeof description !== "string" ||
                !description.trim() ||
                description.trim().length > 10000
            ) {
                return res.status(400).json({
                    error:
                        "A valid question description is required."
                });
            }
        }


        // --------------------------------------
        // Validate article
        // --------------------------------------

        if (postType === "article") {

            if (
                typeof abstract !== "string" ||
                !abstract.trim() ||
                abstract.trim().length > 2000
            ) {
                return res.status(400).json({
                    error:
                        "A valid article abstract is required."
                });
            }


            if (
                typeof articleText !== "string" ||
                !articleText.trim() ||
                articleText.trim().length > 50000
            ) {
                return res.status(400).json({
                    error:
                        "Valid article text is required."
                });
            }
        }


        // --------------------------------------
        // Validate tags
        // --------------------------------------

        if (
            !Array.isArray(tags) ||
            tags.length > 3
        ) {
            return res.status(400).json({
                error:
                    "You can add a maximum of 3 tags."
            });
        }


        const cleanTags = tags.map(tag =>
            typeof tag === "string"
                ? tag.trim()
                : ""
        );


        if (
            cleanTags.some(
                tag =>
                    !tag ||
                    tag.length > 30
            ) ||
            new Set(
                cleanTags.map(
                    tag =>
                        tag.toLowerCase()
                )
            ).size !==
            cleanTags.length
        ) {
            return res.status(400).json({
                error:
                    "Please provide valid, unique tags."
            });
        }


        // --------------------------------------
        // Prepare post document
        // --------------------------------------

        const postData = {

            title:
                title.trim(),

            postType,

            postPlan,

            description:
                postType === "question"
                    ? description.trim()
                    : "",

            abstract:
                postType === "article"
                    ? abstract.trim()
                    : "",

            articleText:
                postType === "article"
                    ? articleText.trim()
                    : "",

            tags:
                cleanTags,

            userId:
                decodedToken.uid,

            createdAt:
                FieldValue.serverTimestamp()
        };


        // --------------------------------------
        // Save post
        // --------------------------------------

        const postRef =
            await db
                .collection("Posts")
                .add(postData);


        return res.status(201).json({
            message:
                "Post submitted successfully!",

            postId:
                postRef.id
        });

    } catch (error) {

        console.error(
            "Create post error:",
            error
        );

        return res.status(500).json({
            error:
                error.message ||
                "Unable to save your post."
        });
    }
});


// ==========================================
// 4. RETRIEVE POSTS API
// ==========================================

app.get("/api/posts", async (req, res) => {
    try {

        let userPlan = "Free";
        let trialAccess = false;


        // --------------------------------------
        // Check authentication
        // --------------------------------------

        const authHeader =
            req.headers.authorization || "";


        if (
            authHeader.startsWith("Bearer ")
        ) {

            const token =
                authHeader.slice(7);

            try {

                const decodedToken =
                    await adminAuth.verifyIdToken(
                        token
                    );


                const userRef =
                    db
                        .collection("User")
                        .doc(decodedToken.uid);


                const userSnapshot =
                    await userRef.get();


                if (!userSnapshot.exists) {
                    return res.status(404).json({
                        error:
                            "User account not found."
                    });
                }


                const userData =
                    userSnapshot.data();


                userPlan =
                    userData.subscriptionPlan ||
                    "Free";


                trialAccess =
                    hasActiveTrial(
                        userData
                    );

            } catch (error) {

                console.error(
                    "Token verification failed:",
                    error.message
                );

                return res.status(401).json({
                    error:
                        "Invalid or expired login."
                });
            }
        }


        // --------------------------------------
        // Determine content access
        // --------------------------------------

        const hasPaidAccess =
            userPlan === "Paid" ||
            trialAccess;


        let postsQuery =
            db.collection("Posts");


        // Free users without active trial
        // only see Free posts

        if (!hasPaidAccess) {

            postsQuery =
                postsQuery.where(
                    "postPlan",
                    "==",
                    "Free"
                );
        }


        // --------------------------------------
        // Retrieve posts
        // --------------------------------------

        const snapshot =
            await postsQuery
                .orderBy(
                    "createdAt",
                    "desc"
                )
                .get();


        // --------------------------------------
        // Convert Firestore data
        // --------------------------------------

        const posts =
            snapshot.docs.map(doc => {

                const data =
                    doc.data();

                return {

                    id:
                        doc.id,

                    ...data,

                    createdAt:
                        data.createdAt
                            ? data.createdAt
                                .toDate()
                                .toISOString()
                            : null
                };
            });


        return res.json({

            posts,

            userPlan,

            trialAccess
        });

    } catch (error) {

        console.error(
            "Fetch posts error:",
            error
        );

        return res.status(500).json({
            error:
                error.message ||
                "Unable to retrieve posts."
        });
    }
});


// ==========================================
// 5. HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {

    return res.json({
        status: "OK",
        project: "dev-deakin-hd"
    });

});


// ==========================================
// START SERVER
// ==========================================

app.listen(3001, () => {

    console.log(
        "Backend running at http://localhost:3001"
    );

});