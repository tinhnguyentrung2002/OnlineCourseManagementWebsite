import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from "../Screens/Login";
import Intro from "../Screens/Intro";
import AdminLayout from '../Components/Teacher.js';
import AdminLayout1 from '../Components/Admin1.js';
import routes from '../routes/Teacher/routes.js';
import adminroutes from './Admin/adminroutes.js';
import NotFound from "../Components/NotFound.js";
import Loading from "../Components/loading.js";
import { auth } from '../firebase.js';

const AppRouter = () => {
    const [loading, setLoading] = useState(false);
    const location = useLocation();

    useEffect(() => {
        setLoading(true);

        const loginSession = localStorage.getItem('loginSession');
        const currentTime = new Date().getTime();
        const userSession = JSON.parse(loginSession);
        if (loginSession) {
            const state = userSession.state;
            if(state === "ban")
            {
                localStorage.removeItem('loginSession');
                auth.signOut().then(() => {
                    console.log("Session Timeout");
                });
            }
            const sessionTime = parseInt(userSession.loginSession, 10);
            const sessionDuration = currentTime - sessionTime;
            if (sessionDuration > 24 * 60 * 60 * 1000) {
              
                localStorage.removeItem('loginSession');
                auth.signOut().then(() => {
                    console.log("Session Timeout");
                });
            }
        }

        const timer = setTimeout(() => {
            setLoading(false);
        }, 1000);

        return () => clearTimeout(timer);
    }, [location.pathname]);

    return (
        <>
            {loading && <Loading />}
            <Routes>
                <Route path="/" element={<Navigate to="/gioi-thieu" />} />
                <Route path="/gioi-thieu" element={<Intro />} />
                <Route path="/dang-nhap" element={<Login />} />

                <Route element={<AdminLayout />}>
                    {routes.map((route, index) => (
                        <Route
                            key={index}
                            path={route.layout + route.path}
                            element={<route.component />}
                        />
                    ))}
                </Route>
                <Route element={<AdminLayout1 />}>
                    {adminroutes.map((route, index) => (
                        <Route
                            key={index}
                            path={route.layout + route.path}
                            element={<route.component />}
                        />
                    ))}
                </Route>
                <Route path="*" element={<NotFound />} />
            </Routes>
        </>
    );
};

const Main = () => (
    <Router>
        <AppRouter />
    </Router>
);

export default Main;
