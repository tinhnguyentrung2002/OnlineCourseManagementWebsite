import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Badge, ListGroup, Accordion, Alert, Button, Modal, Form} from 'react-bootstrap';
import { db } from "../firebase";
import { query, where, getDocs, collection, doc, deleteDoc, setDoc, getDoc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import defaultImage from "../assets/default_image.png";
import "../css/Teacher/customDetailCourse.css";
import EditCourse from '../Components/EditCourse';
import AlertPopup from './alert';
import { useUser } from "../context/UserContext.js";

const CourseDetail = () => {
  const { courseId } = useParams();
  const [courseData, setCourseData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestContent, setRequestContent] = useState("");
  const [request, setIsRequest] = useState(false);
  const [alert, setAlert] = useState({ message: '', severity: '' });
  const [error, setError] = useState(null);
  const location = useLocation();
  const temp = location.state?.temp || 0;
  const uid = useUser();
  const navigate = useNavigate();
  const getCollectionPath = () => (temp === 0 ? "Courses" : "TempCourses");
  useEffect(() => {
    fetchCourseData();
    fetchCategories();
    checkRequestState();
  }, [courseId,temp]);
  const checkRequestState = async () => {
    if (temp === 1) {
    const q = query(
      collection(db, "Requests"),
      where("request_course_id", "==", courseId),
      where("request_type", "==", "approval"),
      where("request_state", "==", "pending")
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      setIsRequest(true);
    }
  }else{
    const q = query(
      collection(db, "Requests"),
      where("request_course_id", "==", courseId),
      where("request_type", "==", "unlock"),
      where("request_state", "==", "pending")
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      setIsRequest(true);
    }
  }


  };
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
  const toggleCourseState = async () => {
    const courseRef1 = doc(db, "Courses", courseId);
    const courseSnap = await getDoc(courseRef1);

    if (courseSnap.exists()) {
      const data = courseSnap.data();

      if (data.course_lock) {
        setAlert({
          message: "Khóa học đang bị khóa do vi phạm tiêu chuẩn, vui lòng mở khóa trước.",
          severity: "warning",
        });
        return;
      }

      console.log("Khóa học không bị khóa. Tiếp tục xử lý...");
    }
    const courseRef = doc(db, 'Courses', courseData.course_id);
    const newState = !courseData.course_state;

    try {
      await updateDoc(courseRef, { course_state: newState });
      setCourseData({ ...courseData, course_state: newState });
    } catch (error) {
      console.error('Error updating course state: ', error);
      setError('Có lỗi xảy ra khi thay đổi trạng thái khóa học');
    }
  };
  const requestUnlock = async () => {
    const requestContent = `Mở khóa khóa học ${courseData.course_id}`;
    
    try {
      const requestRef = await addDoc(collection(db, 'Requests'), {
        request_content: requestContent,
        request_course_id: courseData.course_id,
        request_sender_id: uid,
        request_state: 'pending',
        request_type: 'unlock',
        request_date: serverTimestamp(),
      });

      await updateDoc(requestRef, { request_id: requestRef.id });
      checkRequestState()
      setError('');
      setAlert({
        message: "Yêu cầu mở khóa đã được gửi",
        severity: "success",
      });
    } catch (error) {
      setError('Có lỗi xảy ra khi gửi yêu cầu mở khóa');
      console.error(error);
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
  const copySubcollectionDocs = async (sourceDocRef, destinationDocRef, subcollectionName) => {
    const subcollectionRef = collection(sourceDocRef, subcollectionName);
    const snapshot = await getDocs(subcollectionRef);
    
    const copyPromises = snapshot.docs.map( async (docSnap) => {

      const destSubcollectionRef = doc(destinationDocRef, subcollectionName, docSnap.id);
      await setDoc(destSubcollectionRef, docSnap.data());
    //   const newDocRef = doc(destSubcollectionRef);
    if (subcollectionName === "Heading") {
        const sourceHeadingRef = doc(db, "Courses", courseData.course_id, subcollectionName, docSnap.id)
        copyNestedSubcollections(sourceHeadingRef, destSubcollectionRef);
      }
    });
  
    await Promise.all(copyPromises);
  };
  
  const copyNestedSubcollections = async (sourceDocRef, destinationDocRef) => {
    const subcollections = ['quiz', 'document', 'video'];
    
    for (const subcollection of subcollections) {
      await copySubcollectionDocs(sourceDocRef, destinationDocRef, subcollection);
    }
  
    const quizRef = collection(sourceDocRef, 'quiz');
    const quizSnapshot = await getDocs(quizRef);
    for (const quizDoc of quizSnapshot.docs) {
    //   const questionsRef = collection(quizDoc.ref, 'questions');
      const questionDestination = doc(destinationDocRef, 'quiz', quizDoc.id);
      await copySubcollectionDocs(quizDoc.ref, questionDestination , 'questions');
    }
  };
  
  const copyDocumentWithSubcollections = async (sourceDocRef, destinationDocRef, subcollectionNames) => {
    try {
      const sourceSnapshot = await getDoc(sourceDocRef);
      if (sourceSnapshot.exists()) {
        await setDoc(destinationDocRef, sourceSnapshot.data());
  
        for (const subcollectionName of subcollectionNames) {
          await copySubcollectionDocs(sourceDocRef, destinationDocRef, subcollectionName);

        }
  
        console.log('Đã sao chép tài liệu và subcollections');
      } else {
        console.log('Tài liệu nguồn không tồn tại');
      }
    } catch (error) {
      console.error('Lỗi khi sao chép tài liệu hoặc subcollections:', error);
    }
  };
  
  
  const handleDeleteCourse = async () => {
    try {
      if (temp === 1) {
        const courseDocRef = doc(db, "TempCourses", courseData.course_id);
        const sub = (["Comment", "Type", "Heading"])
        await deleteDocumentWithSubcollections(courseDocRef,sub); 
      } else {
        const courseDocRef = doc(db, "Courses", courseData.course_id);
        await updateDoc(courseDocRef, {
          course_state: false
        });
        const tempCourseRef = doc(db, "TempCourses", courseData.course_id);
        const sub = (["Comment", "Type", "Heading"])
        await copyDocumentWithSubcollections(courseDocRef, tempCourseRef, sub);
        await deleteDocumentWithSubcollections(courseDocRef, sub);
        
      }
      navigate('/giao-vien/quan-ly-khoa-hoc');  
    } catch (err) {
      setError("Có lỗi xảy ra khi xử lý khóa học: " + err.message);
    }
  };
  const confirmDelete = () => setShowDeleteModal(true);
  const confirmRequest = () => setShowRequestModal(true);
  const handleBackEvent = () => {
    navigate('/giao-vien/quan-ly-khoa-hoc');
  };
  const handleCloseRequestModal = () => {
    setShowRequestModal(false);
    setRequestContent("");
    setError(null);  
  };
  const handleRequest = async () => {
    if (!requestContent.trim()) {
      setAlert({ message: "Vui lòng nhập nội dung yêu cầu.", severity: "warning" });
      return;
    }

    try {
      const newRequestRef = doc(collection(db, "Requests"));
      const requestId = newRequestRef.id;
      const requestData = {
        request_id: requestId,
        request_sender_id: uid,
        request_content: requestContent,
        request_reply: "",
        request_state: "pending",
        request_type: "approval",
        request_course_id: courseId,
        request_date: serverTimestamp()
      };

      await setDoc(newRequestRef, requestData);
      setAlert({ message: "Gửi yêu cầu thành công", severity: "success" });
      setRequestContent("");
      setError(null);
      handleCloseRequestModal();
      checkRequestState()
    } catch (error) {
      setError("Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.");
    }
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
        <button 
        disabled={request}
          className={`tab ${isEditing ? 'active' : ''}`} 
          onClick={() => setIsEditing(true)}
        >
          Chỉnh sửa
        </button>
      </div>

      {isEditing ? (
        <EditCourse coursedata={courseData} temp={temp} />
      ) : (
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
                        <Badge bg="success" className="mb-2">Lớp {courseData.course_grade}</Badge>
                        <Card.Text className="text-muted">{courseData.course_description}</Card.Text>
                      </div>
                      {temp === 0 &&  <Badge bg={courseData.course_state === true ? 'primary' : 'secondary'}>
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
            {temp === 1 && (
                      <div className="mt-2">
                         <Button 
                            variant="warning" 
                            onClick={confirmRequest} 
                            disabled={request}
                          >
                            
                            {request ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: '10px' }}></i>Đang đợi duyệt</> : "Yêu cầu duyệt"}  
                        </Button>
                        <Button variant="danger" className="ms-3" onClick={confirmDelete}     disabled={request}>
                          Xóa dự án
                        </Button>
                      </div>
                    )}
                      {temp === 0 && (
                      <div className="mt-2">
                         <Button
                          variant={courseData?.course_state ? 'danger' : 'primary'}
                          onClick={toggleCourseState}
                          disabled={request}
                        >
                          {courseData?.course_state ? 'Ẩn khóa học' : 'Hiện khóa học'}
                        </Button>
                        {courseData.course_lock ? !request && (
                          <Button 
                            variant="warning" 
                            onClick={requestUnlock} 
                            className="ms-3"
                          >
                               {request ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: '10px' }}></i>Đang đợi duyệt</> : "Yêu cầu mở khóa"}  
                          </Button>
                        ) : <></>}
                        
                      </div>
                    )}
                  <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
              <Modal.Header closeButton>
                <Modal.Title>Xác nhận xóa</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                {temp === 1?" Bạn có chắc chắn muốn xóa khóa học này? Sau khi xóa sẽ không thể phục hồi" : " Bạn có chắc chắn muốn gỡ khóa học này?" }
               
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                  Hủy
                </Button>
                <Button variant="danger" onClick={handleDeleteCourse}>
                  Xác nhận
                </Button>
              </Modal.Footer>
            </Modal>

            <Modal show={showRequestModal} onHide={handleCloseRequestModal} centered>
          <Modal.Header closeButton>
          <Modal.Title>Yêu cầu duyệt khóa học</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form>
            <Form.Group controlId="requestContent">
              <Form.Label>Nội dung yêu cầu</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={requestContent}
                onChange={(e) => setRequestContent(e.target.value)}
                placeholder="Nhập nội dung yêu cầu duyệt khóa học..."
              />
            </Form.Group>
            <Form.Text className="text-muted">
              Loại yêu cầu: Duyệt khóa học
            </Form.Text>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseRequestModal}>
            Hủy
          </Button>
          <Button variant="primary" onClick={handleRequest}>
            Gửi yêu cầu
          </Button>
        </Modal.Footer>
      </Modal>
          </>
        ) : (
          <p className='text-center'>Đang tải dữ liệu...</p>
        )
      )}
    </Container>
  );
};

export default CourseDetail;
