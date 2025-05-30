import React from "react";
import { Route, Routes } from "react-router-dom";
import Main from "./components/Main/Main";
import Login from "./components/Login/Login";
import Signup from "./components/Login/Signup";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "react-hot-toast";

const App = () => {
  return (
    <AuthProvider>
      <div className="app">
        <Routes>
          <Route path="/" element={<Main />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
        <Toaster />
      </div>
    </AuthProvider>
  );
};

export default App;
