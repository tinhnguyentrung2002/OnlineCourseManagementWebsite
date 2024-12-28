import { db } from "../../firebase.js";
import React, { useState, useEffect } from "react";
import AddCourseModal from "../../Components/AddCourseModal.js";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  InputGroup,
  Badge,
} from "react-bootstrap";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useUser } from "../../context/UserContext.js";
import { useNavigate } from "react-router-dom";
import defaultImage from "../../assets/default_image.png";
import AlertPopup from "../../Components/alert.js";

function CourseManagement() {
  const uid = useUser();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [tempCourses, setTempCourses] = useState([]);
  const [filterPrice, setFilterPrice] = useState("all");
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterState, setFilterState] = useState("all");
  const [alert, setAlert] = useState({ message: '', severity: '' });
  const [showModal, setShowModal] = useState(false);
  const handleShowModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);

  const refreshCourses = (status, message) => {
    fetchCourses();
    fetchTempCourses();
    setAlert({
      severity: status === "success" ? "success" : "danger",
      message: message,
    });
    handleCloseModal();
  };

  useEffect(() => {
    fetchCourses();
    fetchTempCourses();
  }, [uid]);
  const fetchTempCourses = async () => {
    const tempCoursesCollection = collection(db, "TempCourses");
    const q = query(tempCoursesCollection, where("course_owner_id", "==", uid));

    const querySnapshot = await getDocs(q);
    const fetchedTempCourses = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    setTempCourses(fetchedTempCourses);
  };
  const fetchCourses = async () => {
    const coursesCollection = collection(db, "Courses");
    const q = query(
      coursesCollection,
      where("course_owner_id", "==", uid),
      where("course_type", "==" ,"course"),
      orderBy("course_upload", "desc")
    );

    const querySnapshot = await getDocs(q);
    const fetchedCourses = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    setCourses(fetchedCourses);
  };
  const convertBooleanToString = (bool) => {
    return bool ? "true" : "false";
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.course_title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPrice =
      filterPrice === "all" ||
      (filterPrice === "free" ? course.course_price === 0 : course.course_price > 0);
    const matchesGrade =
      filterGrade === "all" || course.course_grade.toString() === filterGrade;
    const matchesState =
      filterState === "all" || convertBooleanToString(course.course_state) === filterState;

    return matchesSearch && matchesPrice && matchesGrade && matchesState;
  });
  const filteredTempCourses = tempCourses.filter((course) => {
    const matchesSearch = course.course_title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });
  const handleCardClick = (id, temp) => {

    navigate(`/giao-vien/chi-tiet-khoa-hoc/${id}`, { state: { temp } });
  };
  return (
    <Container fluid className="py-4">
        <AlertPopup alert={alert} setAlert={setAlert} />
      <h2 className="text-center mb-4">Danh sách khóa học</h2>
      <InputGroup className="mb-4 justify-content-center">
        <InputGroup.Text style={{ height: "50px", backgroundColor: "#f8f9fa", borderRadius: "30px 0 0 30px" }}>
          <i className="fas fa-search"></i>
        </InputGroup.Text>
        <Form.Control
          style={{
            maxWidth: "800px",
            height: "50px",
            borderRadius: "0 30px 30px 0",
            paddingLeft: "12px",
          }}
          placeholder="Tìm kiếm khóa học..."
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </InputGroup>

      <Row className="mb-4 justify-content-center">
        <Col xs="auto">
          <Form.Select
            style={{ height: "50px" }}
            className="mb-2"
            onChange={(e) => setFilterPrice(e.target.value)}
          >
            <option value="all">Tất cả</option>
            <option value="free">Miễn phí</option>
            <option value="paid">Có phí</option>
          </Form.Select>
        </Col>
        <Col xs="auto">
          <Form.Select
            style={{ height: "50px" }}
            className="mb-2"
            onChange={(e) => setFilterGrade(e.target.value)}
          >
            <option value="all">Tất cả khối</option>
            <option value="10">Khối 10</option>
            <option value="11">Khối 11</option>
            <option value="12">Khối 12</option>
          </Form.Select>
        </Col>
        <Col xs="auto">
          <Form.Select
            style={{ height: "50px" }}
            className="mb-2"
            onChange={(e) => setFilterState(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Đang ẩn</option>
          </Form.Select>
        </Col>
      </Row>

      <Row className="g-4 mb-8">
        {filteredCourses.map((course) => (
          <Col md="4" key={course.id}>
            <Card className="h-100 position-relative shadow-sm"
              style={{ transition: "transform 0.2s", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              onClick={() => handleCardClick(course.id, 0)}
            >
              <Card.Img
                variant="top"
                src={(course.course_img) ? course.course_img : defaultImage}
                style={{ height: "200px", objectFit: "fill" }}
              />
              <Card.Body>
                <div
                  style={{
                    backgroundColor: 'rgba(50, 50, 50, 0.7)',
                    borderRadius: '15px',
                    padding: '5px 10px',
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <i
                    className="fas fa-circle"
                    style={{
                      color: course.course_state === true ? "#28a745" : "red",
                    }}
                  ></i>
                  <span style={{ fontSize: "12px", marginLeft: "5px", color: "white", fontWeight: 'bold' }}>
                    {course.course_state === true ? "Đang hoạt động" : "Đã ẩn"}
                  </span>
                </div>
                <Card.Title className="text-center">{course.course_title}</Card.Title>
                <div className="d-flex justify-content-center mt-1">
                  <div className="text-center">
                    <Badge bg={course.course_price === 0 ? "success" : "warning"}>
                      {course.course_price === 0 ? "Miễn phí" : "Có phí"}
                    </Badge>
                  </div>
                  <div className="text-center ms-2">
                    <Badge bg="primary">Khối {course.course_grade}</Badge>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}

     
        <Col md="4" className="d-flex justify-content-center">
          <Card
            className="h-100 w-100 shadow-sm"
            style={{ 
              cursor: "pointer", 
              transition: "background-color 0.2s",
              backgroundColor: "#f0f0f0",
              border: "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#d9d9d9")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f0f0f0")} 
            onClick={handleShowModal}
          >
            <Card.Body className="text-center" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '260px' }}>
              <Card.Title>
                <i className="fas fa-plus" style={{ fontSize: '50px', color: '#007bff', marginRight:18 }}></i>
              </Card.Title>
              <Card.Text>
                <strong>Thêm mới khóa học</strong>
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <h3 className="text-center mb-4 mt-1">Dự án khóa học</h3>
      <Row className="g-4">
        {filteredTempCourses.length > 0 ? (
          filteredTempCourses.map((course) => (
            <Col md="4" key={course.id}>
              <Card className="h-100 position-relative shadow-sm"
                style={{ transition: "transform 0.2s", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onClick={() => handleCardClick(course.id, 1)}
              >
                <Card.Img
                  variant="top"
                  src={course.course_img || defaultImage}
                  style={{ height: "200px", objectFit: "fill" }}
                />
                <Card.Body>
                  <Card.Title className="text-center">{course.course_title}</Card.Title>
                  <div className="d-flex justify-content-center mt-1">
                    <div className="text-center">
                      <Badge bg={course.course_price === 0 ? "success" : "warning"}>
                        {course.course_price === 0 ? "Miễn phí" : "Có phí"}
                      </Badge>
                    </div>
                    <div className="text-center ms-2">
                      <Badge bg="primary">Khối {course.course_grade}</Badge>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))
        ) : (
          <Col md="12" className="text-center mt-3">
            <p style={{ color: "#888", fontStyle: "italic" }}>Chưa có</p>
          </Col>
        )}
      </Row>

      <AddCourseModal show={showModal} handleClose={handleCloseModal} onCourseAdded={refreshCourses} type={"course"} />
    </Container>
  );
}

export default CourseManagement;
