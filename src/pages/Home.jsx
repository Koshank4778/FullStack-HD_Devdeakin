import FeaturedArticles from "../components/FeaturedArticles";
import FeaturedTutorials from "../components/FeaturedTutorials";

function Home() {
    return (
        <main>

            {/* Home Introduction */}
            <section className="home-intro">

                <div className="home-hero">
                    <img
                        src="\image\CampusImage.jpg"
                        alt="Chitkara University Campus"
                        className="campus-image"
                    />
                </div>

                <div className="intro-content">

                    <img
                        src="\image\Just a randompic.jpeg"
                        alt="Profile"
                        className="profile-photo"
                    />

                    <p>
                        I am a full-stack web developer based in Melbourne, Australia.
                    </p>

                </div>

            </section>

            {/* Existing content */}
            <FeaturedArticles />
            <FeaturedTutorials />

        </main>
    );
}

export default Home;