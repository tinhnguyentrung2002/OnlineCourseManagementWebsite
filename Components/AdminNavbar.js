import React, { Component, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Navbar, Container, Nav, Dropdown, Button, Image } from "react-bootstrap";
import { auth, db } from '../firebase.js';
import { signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import adminroutes from "../routes/Admin/adminroutes.js";
import { useNavigate, NavLink } from 'react-router-dom';
import AlertPopup from './alert.js';
import { useUser } from '../context/UserContext.js';

function Header() {
  const navigate = useNavigate();
  const uid = useUser();
  const [alert, setAlert] = useState({ message: '', severity: '' });
  const [userData, setUserData] = useState(null);

  
  useEffect(() => {
    if(uid){
      const userDoc = doc(db, "Users", uid);
      const unsubscribe = onSnapshot(userDoc, (docSnap) => {
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        } else {
          console.log("Lỗi truy xuất thông tin người dùng");
        }
      });
      return () => unsubscribe();
    }
  }, [])

  const handleLogout = async () => {
    await signOut(auth);
    try {
      setAlert({ open: true, message: 'Đăng xuất thành công!', severity: 'success' });
      setTimeout(() => {
        setAlert({ message: '', severity: '' }); 
        navigate("/dang-nhap");
        localStorage.removeItem('loginSession');}, 1000);
     
    } catch (error) {
      navigate("/gioi-thieu");
      console.error("Lỗi đăng xuất:", error);
    }
  }
  const location = useLocation();
  const mobileSidebarToggle = (e) => {
    e.preventDefault();
    document.documentElement.classList.toggle("nav-open");
    var node = document.createElement("div");
    node.id = "bodyClick";
    node.onclick = function () {
      this.parentElement.removeChild(this);
      document.documentElement.classList.toggle("nav-open");
    };
    document.body.appendChild(node);
  };

  const getBrandText = () => {
    for (let i = 0; i < adminroutes.length; i++) {
      if (location.pathname.indexOf(adminroutes[i].layout + adminroutes[i].path) !== -1) {
        return adminroutes[i].name;
      }
    }
    return "";
  };
  return (
    <Navbar bg="light" expand="lg">
      <Container fluid>
      <AlertPopup alert={alert} setAlert={setAlert} />
        <div className="d-flex justify-content-center align-items-center ml-2 ml-lg-0">
          <Button
            variant="dark"
            className="d-lg-none btn-fill d-flex justify-content-center align-items-center rounded-circle p-2"
            onClick={mobileSidebarToggle}
          >
            <i className="fas fa-ellipsis-v"></i>
          </Button>
          <Navbar.Brand
            style={{color:'black'}}
            href="#home"
            onClick={(e) => e.preventDefault()}
            className="mr-2 ml-3"
          >
            {getBrandText()}
          </Navbar.Brand>
        </div>
        <Navbar.Toggle aria-controls="basic-navbar-nav" className="mr-2">
          <span className="navbar-toggler-bar burger-lines"></span>
          <span className="navbar-toggler-bar burger-lines"></span>
          <span className="navbar-toggler-bar burger-lines"></span>
        </Navbar.Toggle>
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="nav mr-auto" navbar>
            {/* <Nav.Item>
              <Nav.Link
                data-toggle="dropdown"
                href="#pablo"
                onClick={(e) => e.preventDefault()}
                className="m-0"
              >
                <i className="nc-icon nc-palette"></i>
                <span className="d-lg-none ml-1">Tổng quan</span>
              </Nav.Link>
            </Nav.Item>
            <Dropdown as={Nav.Item}>
              <Dropdown.Toggle
                as={Nav.Link}
                data-toggle="dropdown"
                id="dropdown-67443507"
                variant="default"
                className="m-0"
              >
                <i className="nc-icon nc-planet"></i>
                <span className="notification">5</span>
                <span className="d-lg-none ml-1">Ho</span>
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item
                  href="#pablo"
                  onClick={(e) => e.preventDefault()}
                >
                  Notification 1
                </Dropdown.Item>
                <Dropdown.Item
                  href="#pablo"
                  onClick={(e) => e.preventDefault()}
                >
                  Notification 2
                </Dropdown.Item>
                <Dropdown.Item
                  href="#pablo"
                  onClick={(e) => e.preventDefault()}
                >
                  Notification 3
                </Dropdown.Item>
                <Dropdown.Item
                  href="#pablo"
                  onClick={(e) => e.preventDefault()}
                >
                  Notification 4
                </Dropdown.Item>
                <Dropdown.Item
                  href="#pablo"
                  onClick={(e) => e.preventDefault()}
                >
                  Another notification
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown> */}
              {/* <Nav.Item>
                <Nav.Link
                  className="m-0"
                  href="#pablo"
                  onClick={(e) => e.preventDefault()}
                >
                  <i className="nc-icon nc-zoom-split"></i>
                  <span className="d-lg-block"> Search</span>
                </Nav.Link>
              </Nav.Item> */}
          </Nav>
          <Nav className="ml-auto d-flex justify-content-center align-items-center" navbar>
          {userData && (

              <Nav.Item>
                  <span className="ml-2">{userData.user_name}</span>
              </Nav.Item>
            )}
            {/* <Dropdown as={Nav.Item}>
              <Dropdown.Toggle
                aria-expanded={false}
                aria-haspopup={true}
                as={Nav.Link}
                data-toggle="dropdown"
                id="navbarDropdownMenuLink"
                variant="default"
                className="m-0"
              >
                <span className="no-icon">Dropdown</span>
              </Dropdown.Toggle>
              <Dropdown.Menu aria-labelledby="navbarDropdownMenuLink">
                <Dropdown.Item
                  href="#pablo"
                  onClick={(e) => e.preventDefault()}
                >
                  Action
                </Dropdown.Item>
                <Dropdown.Item
                  href="#pablo"
                  onClick={(e) => e.preventDefault()}
                >
                  Another action
                </Dropdown.Item>
                <Dropdown.Item
                  href="#pablo"
                  onClick={(e) => e.preventDefault()}
                >
                  Something
                </Dropdown.Item>
                <Dropdown.Item
                  href="#pablo"
                  onClick={(e) => e.preventDefault()}
                >
                  Something else here
                </Dropdown.Item>
                <div className="divider"></div>
                <Dropdown.Item
                  href="#pablo"
                  onClick={(e) => e.preventDefault()}
                >
                  Separated link
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown> */}
            <Nav.Item>
              <Nav.Link
                className="m-0"
                href="#pablo"
                onClick={(e) => {e.preventDefault(); handleLogout()}}
              >
                <span className="no-icon">Đăng xuất</span>
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Header;
