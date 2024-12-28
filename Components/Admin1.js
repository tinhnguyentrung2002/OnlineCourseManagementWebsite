import React, { useEffect, useRef, useState } from "react";
import { useLocation, Route, Routes, useNavigate } from "react-router-dom";
import AdminNavbar from "../Components/AdminNavbar.js";
import Footer from "./Footer.js";
import Sidebar from "./Sidebar.js";
import FixedPlugin from "./FixedPlugin.js";
import routes from "../routes/Admin/adminroutes.js";
import sidebarImage3 from "../assets/sidebar-3.jpg";
import sidebarImage1 from "../assets/sidebar-1.jpg";
import sidebarImage2 from "../assets/sidebar-2.jpg";
import sidebarImage4 from "../assets/sidebar-4.jpg";
import { Helmet } from "react-helmet";
import { UserProvider } from '../context/UserContext.js';
import { db } from "../firebase.js";
import { doc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import AlertPopup from "./alert.js";
const images = [sidebarImage1, sidebarImage2, sidebarImage3, sidebarImage4];
function Admin1() {
  const [image, setImage] = useState(() => images[Math.floor(Math.random() * images.length)]);
  const [color, setColor] = useState("black");
  const [hasImage, setHasImage] = useState(true);
  const location = useLocation();
  const mainPanel = useRef(null);
  const navigate = useNavigate();
  const [hasUpdatedLogin, setHasUpdatedLogin] = useState(false);
  const [alert, setAlert] = useState({ message: '', severity: '' });

  const checkLoginSession = () => {
    const loginSession = localStorage.getItem('loginSession');
    return loginSession !== null;
  };
  const updateLastLogin = async (uid) => {
    if (!uid) return;
  
    const userRef = doc(db, 'Users', uid);
    await updateDoc(userRef, {
      user_lastLogin: serverTimestamp(),
    });
    const usersQuery = query(collection(db, 'Users'), where('user_uid', '==', uid));
    const usersSnapshot = await getDocs(usersQuery);
    
    if (!usersSnapshot.empty) {
      const userData = usersSnapshot.docs[0].data();
      const userName = userData.user_name;
      setAlert({ message: 'Xin chào admin ' + userName, severity: 'info' });
    } else {
      setAlert({ message: 'Không tìm thấy người dùng.', severity: 'error' });
    }
  };
  const getUid = () => {
    const userData = localStorage.getItem('loginSession');
    if (userData) {
      const parsedData = JSON.parse(userData);
      return parsedData.uid;
    }
    return null;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const isLoggedIn = checkLoginSession();

      if (!isLoggedIn) {
        navigate('/dang-nhap');
      }
      
    }, 1000);

    return () => clearInterval(interval);
  }, [navigate]);
    useEffect(() => {
    if (hasUpdatedLogin) return;

    const uid = getUid();
    if (uid) {

      updateLastLogin(uid, setAlert).then(() => {
        setHasUpdatedLogin(true);
      });
    }
  }, [hasUpdatedLogin]);

  const getRoutes = (routes) => {
    return routes.map((prop, key) => {
      if (prop.layout === "/admin") {
        return (
          <Route
            path={prop.layout + prop.path}
            element={<prop.component />}
            key={key}
          />
        );
      } else {
        return null;
      }
    });
  };

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.scrollingElement.scrollTop = 0;
    mainPanel.current.scrollTop = 0;
    if (
      window.innerWidth < 993 &&
      document.documentElement.className.indexOf("nav-open") !== -1
    ) {
      document.documentElement.classList.toggle("nav-open");
      const element = document.getElementById("bodyClick");
      if (element) {
        element.parentNode.removeChild(element);
      }
    }
  }, [location]);

  const uid = checkLoginSession() ? getUid() : null;

  return (
    <>
    <UserProvider uid={uid}>
    <Helmet>
      <title>Trang quản trị admin</title>
    </Helmet>
      <div className="wrapper">
      <AlertPopup alert={alert} setAlert={setAlert} />
    
            <Sidebar color={color} image={hasImage ? image : ""} routes={routes} />

        <div className="main-panel" ref={mainPanel}>
          <AdminNavbar />
          <div className="content">
            <Routes>{getRoutes(routes)}</Routes>
          </div>
          <Footer />
        </div>
      </div>
      <FixedPlugin
        hasImage={hasImage}
        setHasImage={() => setHasImage(!hasImage)}
        color={color}
        setColor={(color) => setColor(color)}
        image={image}
        setImage={(image) => setImage(image)}
      />
    </UserProvider>
      
    </>
  );
}

export default Admin1;
