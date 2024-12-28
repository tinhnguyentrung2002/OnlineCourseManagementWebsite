import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Badge, ListGroup, Accordion, Alert, Button, Modal, Form} from 'react-bootstrap';
import { db } from "../firebase";
import { query, where, getDocs, collection, doc, deleteDoc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import defaultImage from "../assets/default_image.png";
import "../css/Teacher/customDetailCourse.css";
import EditCourse from '../Components/EditCourse';
import AlertPopup from './alert';

const AdminCourseDetail = () => {
  const { courseId } = useParams();
  const [courseData, setCourseData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [alert, setAlert] = useState({ message: '', severity: '' });
  const [error, setError] = useState(null);
  const location = useLocation();
  const temp = location.state?.temp || 0;
  const navigate = useNavigate();
  const getCollectionPath = () => (temp === 0 ? "Courses" : "TempCourses");
  console.log(courseId)
  console.log(temp)
  useEffect(() => {
    fetchCourseData();
    fetchCategories();
  }, [courseId]);
  const fetchCourseData = async () => {
    try {
      const courseCollectionRef = collection(db, getCollectionPath());
      const q = query(courseCollectionRef, where("course_id", "==", courseId));
      const querySnapshot = await getDocs(q);
  
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const fetchedCourse = {
          course_id: doc.id,
          ...doc.data(),
        };
        fetchedCourse.Heading = await fetchHeadings(doc.ref);
        fetchedCourse.Type = await fetchSubCollection('Type', doc.ref);
      
        setCourseData(fetchedCourse);
      } else {
        setError("Khóa học không tồn tại");
      }
    } catch (err) {
      setError("Có lỗi xảy ra khi lấy dữ liệu khóa học: " + err.message);
    }
  };
  const fetchSubCollection = async (subCollectionName, docRef) => {
    const subCollectionRef = collection(docRef, subCollectionName);
    const subCollectionSnapshot = await getDocs(subCollectionRef);
    return subCollectionSnapshot.docs.map(subDoc => ({ id: subDoc.id, ...subDoc.data() }));
  };

  const fetchHeadings = async (courseRef) => {
    const headings = await fetchSubCollection('Heading', courseRef);
    headings.sort((a, b) => a.heading_order - b.heading_order);
    
    for (let heading of headings) {
      const headingRef = doc(db, getCollectionPath(), courseRef.id, "Heading", heading.id);
      heading.document = await fetchSubCollection('document', headingRef);
      heading.video = await fetchSubCollection('video', headingRef);
      heading.quiz = await fetchSubCollection('quiz', headingRef);

      heading.video.sort((a, b) => a.video_upload_date.toMillis() - b.video_upload_date.toMillis());
      heading.document.sort((a, b) => a.document_upload_date.toMillis() - b.document_upload_date.toMillis());
    
      for (let quiz of heading.quiz) {
        const quizRef = doc(db, getCollectionPath(), courseRef.id, "Heading", heading.id, "quiz", quiz.id);
        quiz.question = await fetchSubCollection('questions', quizRef);
      }
    }
    return headings;
  };

  const fetchCategories = async () => {
    try {
      const categoryCollectionRef = collection(db, "Categories");
      const categorySnapshot = await getDocs(categoryCollectionRef);
      const fetchedCategories = categorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategories(fetchedCategories);

      const updatedCategories = await Promise.all(fetchedCategories.map(async (category) => {
        const categoryChildCollectionRef = collection(db, "Categories", category.id, "CategoriesChild");
        const categoryChildSnapshot = await getDocs(categoryChildCollectionRef);
        const fetchedCategoryChildren = categoryChildSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return {
          ...category,
          CategoriesChild: fetchedCategoryChildren
        };
      }));
      setCategories(updatedCategories);
    } catch (err) {
      setError("Có lỗi xảy ra khi lấy dữ liệu danh mục");
    
    }
  };
  const getCategoryTitle = (type) => {
    try {
      const skipCategories = ['grade10', 'grade11', 'grade12'];

      if (skipCategories.includes(type.category_id)) {
        return null;
      }
      const category = categories.find(cat => cat.category_id === type.category_id);
      if (category) {
        if (type.category_child_id) {
          const categoryChild = category.CategoriesChild.find(child => child.category_id === type.category_child_id);
          return categoryChild ? categoryChild.category_title : "Không tìm thấy danh mục con";
        }
        return category.category_title;
      }
    } catch {
      return "Không tìm thấy danh mục chính";
    }
    return "Không tìm thấy danh mục chính";
  };
 
  const handleBackEvent = () => {
    navigate(-1);
  };
  if (error) {
    return (
      <Container className="mt-5">
        <Alert variant="danger" className="text-center">
          <h4>Lỗi</h4>
          <p>{error}</p>
        </Alert>
      </Container>
    );
  }
  return (
    <Container className="mt-1">
      <AlertPopup alert={alert} setAlert={setAlert} />
      <div className="tabs">
        <button 
          className={`tab ${!isEditing ? 'active' : ''}`} 
          onClick={() => {setIsEditing(false); setCourseData(null) ;fetchCourseData()}}
        >
          Chi tiết
        </button>
      </div>

        {courseData ? (
          <>
            <div className="d-flex align-items-center mb-4 mt-5 ml-2 mr-2">
              <i 
                className="fas fa-arrow-left fa-1x" 
                onClick={handleBackEvent} 
                style={{ color: 'black', cursor: 'pointer' }}
              ></i>
              <h2 className="text-center flex-grow-1 mb-0">Chi tiết khóa học</h2>
            </div>
            <Card className="shadow-sm border-0 mb-4 ml-2 mr-2">
              <Row className="g-0">
                <Col md={4}>
                  <Card.Img src={courseData.course_img || defaultImage} className="h-100 object-fill" />
                </Col>
                <Col md={8}>
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <Card.Title className="fs-3">{courseData.course_title}</Card.Title>
                        <Badge bg="success" className="mb-2">Lớp {courseData.course_grade}</Badge>
                        <Card.Text className="text-muted">{courseData.course_description}</Card.Text>
                      </div>
                      {temp == 0 &&  <Badge bg={courseData.course_state === true ? 'primary' : 'secondary'}>
                        {courseData.course_state ? "Đang hoạt động" : "Đang ẩn"}
                      </Badge>}
                     
                    </div>
                    <ListGroup variant="flush" className="mt-3">
                      <ListGroup.Item><strong>ID:</strong> {courseData.course_id}</ListGroup.Item>
                      <ListGroup.Item><strong>Giá:</strong> {courseData.course_price.toLocaleString()} VND</ListGroup.Item>
                      <ListGroup.Item><strong>Thời gian tổng:</strong> {courseData.course_total_time} giờ</ListGroup.Item>
                      <ListGroup.Item><strong>Thời gian đăng:</strong> {new Date(courseData.course_upload.seconds * 1000).toLocaleDateString('vi-VN')}</ListGroup.Item>
                      <ListGroup.Item><strong>Số thành viên tham gia:</strong> {courseData.course_member}</ListGroup.Item>
                      <ListGroup.Item><strong>Đánh giá:</strong> {courseData.course_rate} / 5</ListGroup.Item>
                      <ListGroup.Item>
                        <strong>Thể loại:</strong>
                        {courseData.Type && courseData.Type.map(type => (
                          <Badge key={type.category_id} bg="info" className="ms-2">
                            {getCategoryTitle(type)}
                          </Badge>
                        ))}
                      </ListGroup.Item>
                    </ListGroup>
                  </Card.Body>
                </Col>
              </Row>
            </Card>

            <h3 className="mt-4">Chương trình học</h3>
            <Accordion defaultActiveKey="0" className="mb-4">
              {courseData.Heading && courseData.Heading.map((heading, index) => (
                <Accordion.Item key={heading.heading_id} eventKey={index} className="mb-3">
                  <Accordion.Header>{heading.heading_title}</Accordion.Header>
                  <Accordion.Body>
                    <Card.Text className="text-muted">{heading.heading_description}</Card.Text>
                    {heading.document && heading.document.length > 0 && (
                      <Accordion className="mb-3">
                        <Accordion.Item eventKey="0">
                          <Accordion.Header>Tài liệu</Accordion.Header>
                          <Accordion.Body>
                            <ListGroup className="mb-3">
                              {heading.document.map(doc => (
                                <ListGroup.Item key={doc.document_id}>
                                  <div className="d-flex justify-content-between align-items-center">
                                    <Card.Link href={doc.document_url} target="_blank">
                                      {doc.document_title} 
                                    </Card.Link>
                                    <small className="text-muted">
                                      {new Date(doc.document_upload_date.seconds * 1000).toLocaleDateString('vi-VN')} 
                                      {" - " + new Date(doc.document_upload_date.seconds * 1000).toLocaleTimeString('vi-VN', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false
                                      })}
                                    </small>
                                  </div>
                                </ListGroup.Item>
                              ))}

                            </ListGroup>
                          </Accordion.Body>
                        </Accordion.Item>
                      </Accordion>
                    )}
                    {heading.video && heading.video.length > 0 && (
                      <Accordion className="mb-3">
                        <Accordion.Item eventKey="1">
                          <Accordion.Header>Video</Accordion.Header>
                          <Accordion.Body>
                            <ListGroup className="mb-3">
                              {heading.video.map(video => (
                                <ListGroup.Item key={video.video_id}>
                                  <div className="d-flex justify-content-between align-items-center">
                                    <Card.Link 
                                      href={`https://www.youtube.com/watch?v=${video.video_url}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                    >
                                      {video.video_title}
                                    </Card.Link>
                                    <small className="text-muted">
                                      {new Date(video.video_upload_date.seconds * 1000).toLocaleDateString('vi-VN')} 
                                      {" - " + new Date(video.video_upload_date.seconds * 1000).toLocaleTimeString('vi-VN', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false
                                      })}
                                    </small>
                                  </div>
                                </ListGroup.Item>
                              ))}
                            </ListGroup>
                          </Accordion.Body>
                        </Accordion.Item>
                      </Accordion>
                    )}
                    {heading.quiz && heading.quiz.length > 0 && (
                      <Accordion className="mb-3">
                        <Accordion.Item eventKey="2">
                          <Accordion.Header>Bài tập</Accordion.Header>
                          <Accordion.Body>
                            {heading.quiz.map(quiz => (
                              <Accordion key={quiz.quiz_id} className="mb-3">
                                <Accordion.Item eventKey={quiz.quiz_id}>
                                  <Accordion.Header>
                                    {quiz.quiz_title} <Badge bg="info" className='ml-3'>{quiz.quiz_time} phút</Badge> <Badge bg="warning" className='ml-3'>Yêu cầu tối thiểu: {quiz.quiz_require}%</Badge>
                                  </Accordion.Header>
                                  <Accordion.Body>
                                    <p className="text-muted fw-semibold">{quiz.quiz_subtitle}</p>
                                    {quiz.question && quiz.question.length > 0 && Object.values(quiz.question).map(question => (
                                      <Accordion key={question.question_id} className="mb-3">
                                        <Accordion.Item eventKey={question.question_id}>
                                          <Accordion.Header>
                                            <strong>{question.question_type === 'choice' ? 'Trắc nghiệm' : 'Điền từ'}:</strong> {question.question_content}
                                          </Accordion.Header>
                                          <Accordion.Body>
                                            {question.question_type === 'choice' && (
                                              <div>
                                                <strong>Đáp án:</strong>
                                                <ul>
                                                  {question.question_answer_option.map((option, index) => (
                                                    <li key={index}>{option}</li>
                                                  ))}
                                                </ul>
                                              </div>
                                            )}
                                            <p className="text-muted">Giải thích: {question.question_explain}</p>
                                            <p className="text-success"><strong>Đáp án đúng: {question.question_correct_answer}</strong></p>
                                          </Accordion.Body>
                                        </Accordion.Item>
                                      </Accordion>
                                    ))}

                                  </Accordion.Body>
                                </Accordion.Item>
                              </Accordion>
                            ))}
                          </Accordion.Body>
                        </Accordion.Item>
                      </Accordion>
                    )}
                  </Accordion.Body>
                </Accordion.Item>
              ))}
            </Accordion>
          </>
        ) : (
          <p className='text-center'>Đang tải dữ liệu...</p>
        )}
    </Container>
  );
};

export default AdminCourseDetail;
