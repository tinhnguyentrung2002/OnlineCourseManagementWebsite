import React from 'react';
import {
  MDBContainer,
  MDBRow,
  MDBCol,
  MDBCard,
  MDBCardBody,
  MDBBtn,
  MDBCarousel,
  MDBCarouselItem,
  MDBCardTitle,
  MDBCardText,
  MDBFooter,
} from 'mdb-react-ui-kit';
import '../css/Intro.css';
import slide1 from "../assets/overall_app.png"
import slide2 from "../assets/main_app.png"
import slide3 from "../assets/payment_app.png"
import { Helmet } from 'react-helmet';

const Intro = () => {
  const checkLoginSession = () => {
    const loginSession = localStorage.getItem('loginSession');
  
    if (loginSession) {

      const sessionData = JSON.parse(loginSession);
      console.log(sessionData.permission)
      return sessionData.permission;
    }
    
    return null;
  };
  return (
    <MDBContainer fluid className="d-flex flex-column vh-100 intro-container">
         <Helmet>
      <title>Giới thiệu</title>
    </Helmet>
      <MDBRow className="flex-grow-1 align-items-center">
        <MDBCol md="6" className="intro-left text-center p-5">
          <h1 className="text-primary display-3">Online Course Manager</h1>
          <MDBCardTitle className="mt-4 fs-4">Giới thiệu về ứng dụng</MDBCardTitle>
          <MDBCardText className="mt-3">
            Ứng dụng giúp bạn quản lý các khóa học trực tuyến một cách dễ dàng, từ việc theo dõi tiến độ học tập cho đến việc tương tác với giảng viên. Tính năng chính bao gồm:
          </MDBCardText>
          <ul className="list-unstyled feature-list mt-4">
            <li>🔹 Quản lý khóa học</li>
            <li>🔹 Theo dõi tiến độ học tập</li>
            <li>🔹 Tương tác với giảng viên và sinh viên khác</li>
            <li>🔹 Thống kê và báo cáo chi tiết</li>
          </ul>
          <div className="button-group mt-4">
            <MDBBtn className="me-3"  href="/download-apk">Tải APK</MDBBtn>
            {checkLoginSession() === null ? (
                <MDBBtn href="/dang-nhap">Truy cập dashboard</MDBBtn>
              ) : checkLoginSession() === "0" ? (
                <MDBBtn href="/admin/dashboard">Truy cập dashboard</MDBBtn>
              ) : (
                <MDBBtn href="/giao-vien/dashboard">Truy cập dashboard</MDBBtn>
              )}
          </div>
          <div className="social-links mt-5">
            <a href="#" className="me-3">Facebook</a>
            <a href="#" className="me-3">Twitter</a>
            <a href="#">Instagram</a>
          </div>
        </MDBCol>
      </MDBRow>
      <MDBRow className="features-section py-5 mt-5" style={{ backgroundColor:'#ffffff' }}>
      <MDBCol md="12" className="p-0">
          <MDBCarousel  interval={3000} className="w-100 h-100">
            <MDBCarouselItem className="active" itemId={1}>
              <img src={slide1} alt="Slide 1" className="d-block w-100 h-100 " />
            </MDBCarouselItem>
            <MDBCarouselItem itemId={2}>
              <img src={slide2} alt="Slide 2" className="d-block w-100 h-100" />
            </MDBCarouselItem>
            <MDBCarouselItem itemId={3}>
              <img src={slide3} alt="Slide 3" className="d-block w-100 h-100" />
            </MDBCarouselItem>
          </MDBCarousel>
        </MDBCol>
      </MDBRow>
      <MDBRow className="features-section py-5" style={{ backgroundColor:'#f5f5f5'}}>
      <MDBCol md="3" className="text-center mb-4">
          <MDBCard className="shadow-sm feature-card">
            <MDBCardBody>
              <i className="fas fa-star fa-3x text-primary"></i>
              <MDBCardTitle className="mt-3">Tính năng nổi bật</MDBCardTitle>
              <MDBCardText className="mt-2">
                Giao diện thân thiện với người dùng
              </MDBCardText>
            </MDBCardBody>
          </MDBCard>
        </MDBCol>
        <MDBCol md="3" className="text-center mb-4">
          <MDBCard className="shadow-sm feature-card">
            <MDBCardBody>
              <i className="fas fa-book fa-3x text-primary"></i>
              <MDBCardTitle className="mt-3">Khóa học đa dạng</MDBCardTitle>
              <MDBCardText className="mt-2">
                Cung cấp các khóa học đa dạng cho người dùng
              </MDBCardText>
            </MDBCardBody>
          </MDBCard>
        </MDBCol>
        <MDBCol md="3" className="text-center mb-4">
          <MDBCard className="shadow-sm feature-card">
            <MDBCardBody>
              <i className="fas fa-chalkboard-teacher fa-3x text-primary"></i>
              <MDBCardTitle className="mt-3">Giáo viên chuyên nghiệp</MDBCardTitle>
              <MDBCardText className="mt-2">
                Kết nối với giáo viên có kinh nghiệm.
              </MDBCardText>
            </MDBCardBody>
          </MDBCard>
        </MDBCol>
        <MDBCol md="3" className="text-center mb-4">
          <MDBCard className="shadow-sm feature-card">
            <MDBCardBody>
              <i className="fas fa-comments fa-3x text-primary"></i>
              <MDBCardTitle className="mt-3">Tương tác tốt hơn</MDBCardTitle>
              <MDBCardText className="mt-2">
                Nâng cao tương tác giữa học viên và giảng viên.
              </MDBCardText>
            </MDBCardBody>
          </MDBCard>
        </MDBCol>
      </MDBRow>

      <MDBFooter className="text-center bg-light py-3 mt-auto">
        <div className="text-muted">&copy; {new Date().getFullYear()}  Online Course Manager. All rights reserved.</div>
      </MDBFooter>
    </MDBContainer>
  );
};

export default Intro;
