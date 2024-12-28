import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Badge, ListGroup, Accordion, Alert} from 'react-bootstrap';
import { db } from "../firebase";
import { query, where, getDocs, collection, doc, getDoc } from "firebase/firestore";
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import defaultImage from "../assets/default_image.png";
import "../css/Teacher/customDetailCourse.css";
import AlertPopup from './alert';
import { useUser } from "../context/UserContext.js";
const ClassDetail = () => {
  const { courseId } = useParams();
  const [courseData, setCourseData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState("details");
  const [alert, setAlert] = useState({ message: '', severity: '' });
  const [error, setError] = useState(null);
  const [recommendedCourses, setRecommendedCourses] = useState([]);
  const [discussionData, setDiscussionData] = useState(null);
  const [hasDiscussion, setHasDiscussion] = useState(false);
  const navigate = useNavigate();
  const uid = useUser();
  useEffect(() => {
    fetchCourseData();
    fetchCategories();
    fetchRecommendedCourses();
    fetchDiscussion();
  }, [courseId]);
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    fetchCourseData()
  };
  const fetchCourseData = async () => {
    try {
      const courseCollectionRef = collection(db, "Courses");
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
        await setCourseData(fetchedCourse);
      } else {
        setError("Lớp học không tồn tại");
      }
    } catch (err) {
      setError("Có lỗi xảy ra khi lấy dữ liệu lớp học: " + err.message);
    }
  };
  const fetchDiscussion = async () => {
    try {
      const q = query(
        collection(db, 'Discussions'),
        where('course_id', '==', courseId)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const discussionDoc = querySnapshot.docs[0];
        setDiscussionData(discussionDoc.data());
        setHasDiscussion(true);
      } else {
        setDiscussionData(null);
        setHasDiscussion(false);
      }
    } catch (error) {
      console.error('Error fetching discussions:', error);
    }
  };


  const fetchRecommendedCourses = async () => {
    try {
      const courseDocRef = doc(db, "Courses", courseId);
      const courseDoc = await getDoc(courseDocRef);
      
      if (courseDoc.exists()) {
        const courseData = courseDoc.data();
        const recommendedCourseIds = courseData.course_recommend || [];
        if (recommendedCourseIds.length > 0) {
          const recommendedCoursesPromises = recommendedCourseIds.map(async (recommendedCourseId) => {
            const recommendedCourseRef = doc(db, "Courses", recommendedCourseId);
            const recommendedCourseDoc = await getDoc(recommendedCourseRef);
            return recommendedCourseDoc.exists() ? recommendedCourseDoc.data() : null;
          });

          const recommendedCourses = await Promise.all(recommendedCoursesPromises);
          setRecommendedCourses(recommendedCourses.filter(course => course !== null));
        }
      }
    } catch (error) {
      console.error("Error fetching recommended courses: ", error);
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
      const headingRef = doc(db, "Courses", courseRef.id, "Heading", heading.id);
      heading.document = await fetchSubCollection('document', headingRef);
      heading.video = await fetchSubCollection('video', headingRef);
      heading.quiz = await fetchSubCollection('quiz', headingRef);

      heading.video.sort((a, b) => a.video_upload_date.toMillis() - b.video_upload_date.toMillis());
      heading.document.sort((a, b) => a.document_upload_date.toMillis() - b.document_upload_date.toMillis());
    
      for (let quiz of heading.quiz) {
        const quizRef = doc(db, "Courses", courseRef.id, "Heading", heading.id, "quiz", quiz.id);
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
    navigate('/admin/quan-ly-lop-hoc');
  };
  if (error) {
    return (
      <Container className="mt-5">
        <Alert variant="danger" className="text-center" style={{zIndex:1}}>
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
          className={`tab ${activeTab === 'details' ? 'active' : ''}`} 
          onClick={() => handleTabChange('details')}
        >
          Chi tiết
        </button>
      </div>

   {activeTab === 'details' ? 
        courseData ? (
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
                        <div>
                        <Badge bg="success" className="mb-2">Lớp {courseData.course_grade}</Badge>
                        <Badge className='ml-2' bg={courseData.course_state === true ? 'primary' : 'secondary'}>
                        {courseData.course_state ? "Đang hoạt động" : "Đã kết thúc"}
                      </Badge>
                        </div>
                     
                        <Card.Text className="text-muted">{courseData.course_description}</Card.Text>
                      </div>
                    
                      {/* <i class="fa-solid fa-key" style={{cursor:'pointer'}} onClick={confirmJoin}></i> */}
                     
                    </div>
                    <ListGroup variant="flush" className="mt-3">
                      <ListGroup.Item><strong>Thời gian bắt đầu:</strong> {new Date(courseData.course_start_time.toMillis()).toLocaleDateString()}</ListGroup.Item>
                      <ListGroup.Item><strong>Thời gian kết thúc:</strong> {new Date(courseData.course_end_time.toMillis()).toLocaleDateString()}</ListGroup.Item>
                      <ListGroup.Item><strong>Thời gian đăng:</strong> {new Date(courseData.course_upload.seconds * 1000).toLocaleDateString('vi-VN')}</ListGroup.Item>
                      <ListGroup.Item><strong>Số thành viên tham gia:</strong> {Array.isArray(courseData.course_member) ? courseData.course_member.length : 0}</ListGroup.Item>
                      <ListGroup.Item><strong>Nhóm thảo luận:</strong> {discussionData ? discussionData.discussion_title : 'Không có nhóm thảo luận'}</ListGroup.Item>
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
            <div className="mt-4">
              <h3>Khóa học đề xuất</h3>
              {recommendedCourses.length > 0 ? (
                <ListGroup>
                  {recommendedCourses.map((recommendedCourse) => (
                    <ListGroup.Item key={recommendedCourse.course_id}>
                      <div className="d-flex justify-content-between align-items-center">
                        <span>{recommendedCourse.course_title}</span>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <p>Không có khóa học đề xuất nào.</p>
              )}
            </div>
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
        ) :   <p className='text-center'>Trống</p>}
   
    </Container>
  );
};

export default ClassDetail;
