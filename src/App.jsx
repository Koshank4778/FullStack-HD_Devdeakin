import "./App.css";

import NavBar from "./components/NavBar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import About from "./pages/About";
import Post from "./pages/Post";
import Pricing from "./pages/Pricing";
import BrowsePosts from "./pages/BrowsePosts";
import AdminDashboard from "./pages/AdminDashboard";

import { Routes, Route } from "react-router-dom";

function App() {
  return (
    <div>
      <NavBar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/post" element={<Post />} />
        <Route path="/browse-posts" element={<BrowsePosts />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>

      <Footer />
    </div>
  );
}

export default App;