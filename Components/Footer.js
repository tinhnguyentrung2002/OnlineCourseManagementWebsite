import React, { Component } from "react";
import { Container } from "react-bootstrap";
import "../css/Teacher/custom-footer.css";
class Footer extends Component {
  render() {
    return (
      <footer className="footer px-0 px-lg-3">
        <Container fluid>
          <nav className="footer-nav">
            <p className="copyright text-center">
              © {new Date().getFullYear()} Online Course Manager. All rights reserved.
            </p>
          </nav>
        </Container>
      </footer>
    );
  }
}

export default Footer;