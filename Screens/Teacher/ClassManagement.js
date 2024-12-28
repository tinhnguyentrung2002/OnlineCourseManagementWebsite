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
  Button,
  Modal,
  ListGroup,
} from "react-bootstrap";
import { collection, query, where, getDocs, orderBy, doc, deleteDoc } from "firebase/firestore";
import { useUser } from "../../context/UserContext.js";
import { useNavigate } from "react-router-dom";
import defaultImage from "../../assets/default_image.png";
import AlertPopup from "../../Components/alert.js";

function ClassManagement() {
  const uid = useUser();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterState, setFilterState] = useState("all");
  const [alert, setAlert] = useState({ message: '', severity: '' });
  const [showModal, setShowModal] = useState(false);
  const handleShowModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);
  const [showCopyModal, setShowCopyModal] = useState(false); 
  const [copies, setCopies] = useState([]); 
  const handleShowCopyModal = () => setShowCopyModal(true);
  const handleCloseCopyModal = () => setShowCopyModal(false);
  const refreshCourses = (status, message) => {
    fetchCourses();
    setAlert({
      severity: status === "success" ? "success" : "danger",
      message: message,
    });
    handleCloseModal();
  };

  useEffect(() => {
    fetchCourses()
    fetchCopies();
  }, [uid]);
  const fetchCopies = async () => {
    try {
      const copiesRef = collection(db, "Copies");
      const q = query(
        copiesRef,
        where("copy_user_id", "==", uid)
      );
      
      const copySnapshot = await getDocs(q);
      const copyList = copySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        copy_upload: doc.data().copy_upload ? new Date(doc.data().copy_upload.seconds * 1000).toLocaleString() : ""
      }));
      
      setCopies(copyList);
    } catch (error) {
      console.error("Error fetching copies:", error);
    }
  };
  const deleteSubcollectionDocs = async (docRef, subcollectionName) => {
    const subcollectionRef = collection(docRef, subcollectionName);
    const snapshot = await getDocs(subcollectionRef);
    const deletePromises = snapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);
  };
  
  const deleteDocumentWithSubcollections = async (docRef, subcollectionNames) => {
    try {
      for (const subcollectionName of subcollectionNames) {
        if (subcollectionName === "Heading") {
          const headingsSnapshot = await getDocs(collection(docRef, "Heading"));
          for (const headingDoc of headingsSnapshot.docs) {
            const headingRef = doc(docRef, "Heading", headingDoc.id);
  
            const subsubcollections = ["video", "document", "quiz"];
            for (const subsub of subsubcollections) {
              if (subsub === "quiz") {
                const quizzesSnapshot = await getDocs(collection(headingRef, subsub));
                for (const quizDoc of quizzesSnapshot.docs) {
                  const quizRef = doc(headingRef, subsub, quizDoc.id);
                  await deleteSubcollectionDocs(quizRef, "questions");
                  await deleteDoc(quizRef);
                }
              } else {
                await deleteSubcollectionDocs(headingRef, subsub);
              }
            }

            await deleteDoc(headingRef);
          }
        }
        await deleteSubcollectionDocs(docRef, subcollectionName);
      }
      await deleteDoc(docRef);
      console.log('Đã xóa tài liệu và tất cả các subcollection');
    } catch (error) {
      console.error('Lỗi khi xóa tài liệu hoặc subcollections:', error);
    }
  };
  const handleDeleteCopy = async (copyId) => {
    try {
      const copyRef = doc(db, "Copies", copyId);
      const sub =['Heading', 'Type']
      await deleteDocumentWithSubcollections(copyRef, sub);
      setAlert({ message: "Bản sao đã được xóa", severity: "success" });
      fetchCopies();
    } catch (error) {
      console.error("Error deleting copy:", error);
      setAlert({ message: "Lỗi khi xóa bản sao", severity: "danger" });
    }
  };
  const fetchCourses = async () => {
    const coursesCollection = collection(db, "Courses");
    const q = query(
      coursesCollection,
      where("course_owner_id", "==", uid),
      where("course_type", "==" ,"class"),
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
    const matchesGrade =
      filterGrade === "all" || course.course_grade.toString() === filterGrade;
    const matchesState =
      filterState === "all" || convertBooleanToString(course.course_state) === filterState;

    return matchesSearch && matchesGrade && matchesState;
  });

  const handleCardClick = (id) => {

    navigate(`/giao-vien/chi-tiet-lop-hoc/${id}`);
  };
  return (
    <Container fluid className="py-4">
        <AlertPopup alert={alert} setAlert={setAlert} />
        
      <Modal show={showCopyModal} onHide={handleCloseCopyModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Danh Sách Bản Sao</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ListGroup>
            {copies.length > 0 ? (
              copies.map((copy) => (
                <ListGroup.Item key={copy.id} className="d-flex justify-content-between">
                  <div>
                    <strong>{copy.copy_name}</strong>
                    <br />
                    <small>{copy.copy_upload}</small>
                  </div>
                  <Button variant="danger" style={{height:50, marginTop:5}} onClick={() => handleDeleteCopy(copy.id)}>Xóa</Button>
                </ListGroup.Item>
              ))
            ) : (
              <p>Không có bản sao nào</p>
            )}
          </ListGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseCopyModal}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
      <h2 className="text-center mb-4">Danh sách lớp học</h2>
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
          placeholder="Tìm kiếm lớp học..."
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </InputGroup>

      <Row className="mb-4 justify-content-center">
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
            <option value="false">Đã kết thúc</option>
          </Form.Select>
        </Col>
        <Col xs="auto">
        <Button   style={{ height: "50px" }} variant="primary" onClick={handleShowCopyModal}>
          Danh sách bản sao
      </Button>
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
                      color: course.course_state === true ? "#28a745" : "grey",
                    }}
                  ></i>
                  <span style={{ fontSize: "12px", marginLeft: "5px", color: "white", fontWeight: 'bold' }}>
                    {course.course_state === true ? "Đang hoạt động" : "Đã kết thúc"}
                  </span>
                </div>
                <Card.Title className="text-center">{course.course_title}</Card.Title>
                <div className="d-flex justify-content-center mt-1">
                  <div className="text-center">
                    <Badge bg={"info"}>
                       {new Date(course.course_upload.seconds * 1000).toLocaleDateString('vi-VN')}
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
                <strong>Thêm mới lớp học</strong>
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <AddCourseModal show={showModal} handleClose={handleCloseModal} onCourseAdded={refreshCourses} type={"class"} uid={uid} />
    </Container>
  );
}

export default ClassManagement;
