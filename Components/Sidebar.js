import React from "react";
import { useLocation, NavLink, useNavigate } from "react-router-dom";
import { Nav } from "react-bootstrap";

function Sidebar({ color, image, routes }) {
  const location = useLocation();
  const navigate = useNavigate();

  const activeRoute = (routeName) => {
    return location.pathname.indexOf(routeName) > -1 ? "active" : "";
  };

  return (
    <div className="sidebar" data-image={image} data-color={color}>
      <div
        className="sidebar-background"
        style={{
          backgroundImage: "url(" + image + ")"
        }}
      />
      <div className="sidebar-wrapper">
        <div className="logo d-flex align-items-center justify-content-center">
          <a

            className="simple-text logo-mini mx-1"
          >
            <div style={{ cursor: 'pointer' }} className="logo-img">
              <img src={require("../assets/rectangleLogo.png")} alt="..." />
            </div>
          </a>
          <h6 className="bold-text mt-2 ml-1" style={{ cursor: 'pointer' }}>
            Online Course Manager
          </h6>
        </div>
        <Nav>
          {routes.map((prop, key) => {
            if (!prop.redirect && prop.path !== '/khoa-hoc/:courseId' &&prop.path !== '/chi-tiet-khoa-hoc/:courseId' && prop.path !== '/lop-hoc/:courseId')
              return (
                <li
                  className={
                    prop.upgrade
                      ? "active active-pro"
                      : activeRoute(prop.layout + prop.path)
                  }
                  key={key}
                >
                  <NavLink
                    to={prop.layout + prop.path}
                    className={({ isActive }) => 
                      `nav-link ${isActive ? 'active' : ''}`
                    }
                  >
                    <i className={prop.icon} />
                    <p>{prop.name}</p>
                  </NavLink>
                </li>
              );
            return null;
          })}
        </Nav>
      </div>
    </div>
  );
}

export default Sidebar;
