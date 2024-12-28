import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Badge, ListGroup, Accordion, Alert, Button, Modal, Form, ModalFooter} from 'react-bootstrap';
import { db } from "../firebase";
import { query, where, getDocs, collection, doc, deleteDoc, setDoc, getDoc, updateDoc, serverTimestamp, addDoc } from "firebase/firestore";
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import defaultImage from "../assets/default_image.png";
import "../css/Teacher/customDetailCourse.css";
import EditCourse from '../Components/EditCourse';
import LearnerList from './LearnerList.js';
import AlertPopup from './alert';
import { useUser } from "../context/UserContext.js";
import EditClass from './EditClass.js';

const ClassDetail = () => {
  const [loading, setLoading] = useState(false)
  const { courseId } = useParams();
  const [courseData, setCourseData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState("details");
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showDiscussionModal, setDiscussionModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [alert, setAlert] = useState({ message: '', severity: '' });
  const [error, setError] = useState(null);
  const [copyName, setCopyName] = useState('');
  const [coursePrivateKey, setCoursePrivateKey] = useState('');
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [isFinish, setIsFinish] = useState(false);
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
        setIsFinish(fetchedCourse.course_state);
        fetchedCourse.Heading = await fetchHeadings(doc.ref);
        fetchedCourse.Type = await fetchSubCollection('Type', doc.ref);
        setCoursePrivateKey(fetchedCourse.course_private_key)
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
  const createDiscussion = async () => {
    try {
        setLoading(true)
      const discussionData = {
        discussion_title: courseData.course_title,  
        discussion_thumbnail: courseData.course_img,  
        course_id: courseId, 
        discussion_upload: serverTimestamp()  
      };
      
     
      const discussionRef = await addDoc(collection(db, 'Discussions'), discussionData);
      
  
  
      await updateDoc(discussionRef, {
        discussion_id: discussionRef.id
      });
      const discussionInfo = {
        discussion_id: discussionRef.id,
        join_time: serverTimestamp() 
      };
      const participantInfo = {
        allowNotification: false,
        userId: uid,
        userMessagingToken: "",
        userState:"out-topics"
      }
      await setDoc(doc(db, 'Users', uid, 'DiscussionGroups', discussionRef.id), discussionInfo);
      await setDoc(doc(db, 'Discussions',discussionRef.id, "DiscussionParticipants", uid), participantInfo);
      
      

      setAlert({ message: "Tạo nhóm thảo luận thành công", severity: "success" });
      fetchDiscussion();
      setLoading(false)
      console.log('Nhóm thảo luận đã được tạo thành công!');
    } catch (error) {
      console.error('Có lỗi khi tạo nhóm thảo luận:', error);
      setAlert({ message: "Có lỗi khi tạo nhóm thảo luận", severity: "danger" });
      setLoading(false)
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
        if(subcollectionName === "Topics")
        {
            const topicsSnapshot = await getDocs(collection(docRef, "Topics"));
          for (const topicDoc of topicsSnapshot.docs) {
            const topicRef = doc(docRef, "Topics", topicDoc.id);
            const subsubcollections = ["Messages"];
            for (const subsub of subsubcollections) {
                  await deleteSubcollectionDocs(topicRef, subsub);
              }
              await deleteDoc(topicRef);
          }
        }
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
        if (subcollectionName === "Type") {
            console.log(docSnap.data())
            console.log(docSnap.id)
        }

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
        await updateDoc(destinationDocRef, sourceSnapshot.data());
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
  
  const handleCopyCourse = async () => {
    try {
        setLoading(true)
      if (copyName.length === 0) {
        setLoading(false)
        setAlert({ message: "Vui lòng nhập đầy đủ thông tin", severity: "warning" });
        return;
      }
      const copyData = {
        copy_name: copyName,
        copy_upload: serverTimestamp(),
        copy_user_id: uid
      };
  
      const copyRef = await addDoc(collection(db, "Copies"), copyData);
      await updateDoc(copyRef , {
        copy_id: copyRef.id
      });
      const copyRef1 = doc(db, "Copies", copyRef.id);
      const courseDocRef = doc(db, "Courses", courseData.course_id);
  
      const sub = ["Type", "Heading"];
      await copyDocumentWithSubcollections(courseDocRef, copyRef1, sub);
      setShowCopyModal(false);
      setCopyName(null);
      setLoading(false)
      setAlert({ message: "Đã sao chép thông tin lớp học thành công!", severity: "success" });
    } catch (err) { 
        setCopyName(null)
        setLoading(false)
      setError("Có lỗi xảy ra khi sao chép lớp học: " + err.message);
    }
  };
  
  
  const handleFinishCourse = async () => {
    try {
        const courseDocRef = doc(db, "Courses", courseData.course_id);
        await updateDoc(courseDocRef, {
          course_state: false
        });
        await fetchCourseData()
        setShowFinishModal(false)
    } catch (err) {
      setError("Có lỗi xảy ra khi xử lý lớp học: " + err.message);
    }
  };
  const generatePrivateKey = () => {
    const newPrivateKey = generateRandomPassword(8);
    setCoursePrivateKey(newPrivateKey);
    const courseDocRef = doc(db, "Courses", courseData.course_id);
    updateDoc(courseDocRef, {course_private_key: newPrivateKey});
  };
  const generateRandomPassword = (length) => {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var password = "";
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }
    console.log(password)
    return password;
  }

  const handleRemoveCourse = async () => {
    try {
        const courseDocRef = doc(db, "Courses", courseData.course_id);
        const sub = (["Type", "Heading"])
        await deleteDocumentWithSubcollections(courseDocRef,sub); 
        await handleDeleteDiscussion()
        setDiscussionData(null)
      navigate('/giao-vien/quan-ly-lop-hoc');  
    } catch (err) {
      setError("Có lỗi xảy ra khi xử lý lớp học: " + err.message);
    }
}
const handleDeleteDiscussion = async () => {
    try {
        setLoading(true)
        const courseDocRef = doc(db, "Discussions", discussionData.discussion_id);
        const sub = (["DiscussionParticipants", "Topics"])
        await deleteDocumentWithSubcollections(courseDocRef,sub); 
        fetchDiscussion();
        setLoading(false)
        setDiscussionModal(false)
        setAlert({ message: "Xóa nhóm thảo luận thành công", severity: "success" });
    } catch (err) {
      setError("Có lỗi xảy ra khi xử lý lớp học: " + err.message);
      setAlert({ message: "Xóa nhóm thảo luận thất bại", severity: "danger" });
      setLoading(false)
    }
}
  const confirmFinish = () => setShowFinishModal(true);
  const confirmDiscussion = () => setDiscussionModal(true);
  const confirmRemove = () => setShowRemoveModal(true);
  const confirmJoin = () => setShowJoinModal(true);
  const confirmCopy = () => setShowCopyModal(true);
  const closeCopyModal = () =>{
    setShowCopyModal(false)
    setCopyName(null)
  }
  const handleBackEvent = () => {
    navigate('/giao-vien/quan-ly-lop-hoc');
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
        <button 
          disabled={!isFinish}
          className={`tab ${activeTab === 'edit' ? 'active' : ''}`} 
          onClick={() => handleTabChange('edit')}
        >
          Chỉnh sửa
        </button>
        <button 
          disabled={!isFinish}
          className={`tab ${activeTab === 'learners' ? 'active' : ''}`} 
          onClick={() => handleTabChange('learners')}
        >
          Danh sách học sinh
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
              <h2 className="text-center flex-grow-1 mb-0">Chi tiết lớp học</h2>
            </div>
            <Card className="shadow-sm border-0 mb-4 ml-2 mr-2">
              <Row className="g-0">
                <Col md={4}>
                  <Card.Img src={courseData.course_img || defaultImage}  className="h-100 object-fill" />
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
                    
                      <i class="fa-solid fa-key" style={{cursor:'pointer'}} onClick={confirmJoin}></i>
                     
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
              <h3>Lớp học đề xuất</h3>
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
                <p>Không có lớp học đề xuất nào.</p>
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
       
          <div className="mt-2">
              {courseData.course_state && (  <Button variant="warning" disabled={loading} style={{color:'white'}} className="" onClick={confirmFinish} >
                          Kết thúc
                </Button>)}
              
                <Button disabled={loading} variant="primary"  className="ml-2" onClick={confirmCopy} >
                          Sao chép lớp học
                </Button>
                <Button disabled={loading} variant="danger" className="ml-2" onClick={confirmRemove} >
                          Gỡ lớp học
                </Button>
                {hasDiscussion ? (
                    <>
                    <Button disabled={loading} variant="dark" className='ml-2' onClick={confirmDiscussion}>
                    Xóa nhóm thảo luận
                    </Button>
                    </>
                ) : (
                    <Button variant="dark" disabled={loading} className='ml-2' onClick={createDiscussion}>
                    Thêm nhóm thảo luận
                    </Button>
                )}
           
            </div>
            
            <Modal show={showFinishModal} onHide={() => setShowFinishModal(false)}>
              <Modal.Header closeButton>
                <Modal.Title>Xác nhận kết thúc</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                Bạn có chắc chắn muốn kết thúc lớp học này? Sau khi kết thúc sẽ không thể mở lại và sẽ không thể thêm học viên mới nữa
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowFinishModal(false)}>
                  Hủy
                </Button>
                <Button variant="danger" onClick={handleFinishCourse}>
                  Xác nhận
                </Button>
              </Modal.Footer>
            </Modal>
            <Modal show={showRemoveModal} onHide={() => setShowRemoveModal(false)}>
              <Modal.Header closeButton>
                <Modal.Title>Xác nhận gỡ lớp học</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                Bạn có chắc chắn muốn gỡ lớp học này? Sau khi gỡ sẽ không thể phục hồi
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowRemoveModal(false)}>
                  Hủy
                </Button>
                <Button variant="danger" onClick={handleRemoveCourse}>
                  Xác nhận
                </Button>
              </Modal.Footer>
            </Modal>
            <Modal show={showJoinModal} onHide={() => setShowJoinModal(false)}>
              <Modal.Header closeButton>
                <Modal.Title>Thông tin ghi danh lớp học</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <p><strong>Mã lớp học: </strong>{courseData.course_id}</p>
                <p><strong>Khóa ghi danh: </strong>{coursePrivateKey}<i class="fa-solid fa-rotate ml-2" style={{cursor:'pointer'}} onClick={generatePrivateKey}></i></p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowJoinModal(false)}>
                  Đóng
                </Button>
              </Modal.Footer>
            </Modal>
            <Modal show={showCopyModal} onHide={() => closeCopyModal()}>
              <Modal.Header closeButton>
                <Modal.Title>Sao chép thông tin lớp học</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Form>
                  <Form.Group controlId="copyName">
                    <Form.Label>Tên bản sao</Form.Label>
                    <Form.Control 
                      type="text" 
                      placeholder="Nhập tên bản sao"
                      value={copyName}
                      onChange={(e) => setCopyName(e.target.value)} 
                      required
                    />
                  </Form.Group>        
                </Form>
              </Modal.Body>
              <ModalFooter>
              <Button variant="primary" disabled={loading} onClick={handleCopyCourse}>Xác nhận</Button>
              </ModalFooter>
            </Modal>
            <Modal show={showDiscussionModal} onHide={() => setDiscussionModal(false)}>
              <Modal.Header closeButton>
                <Modal.Title>Xác nhận xóa nhóm thảo luận</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                Bạn có chắc chắn muốn xóa nhóm thảo luận này? Sau khi xóa sẽ không thể phục hồi dữ liệu
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setDiscussionModal(false)}>
                  Hủy
                </Button>
                <Button variant="danger" onClick={handleDeleteDiscussion}>
                  Xác nhận
                </Button>
              </Modal.Footer>
            </Modal>
          </>
        ) : (
          <p className='text-center'>Đang tải dữ liệu...</p>
        ): activeTab === 'edit' ? (
            <EditClass coursedata={courseData} setAlert={setAlert} />
          ) : activeTab === 'learners' ? (
            <LearnerList setAlert={setAlert} courseId={courseData?.course_id} courseMembers = {courseData?.course_member} fetchCourseData={fetchCourseData}/>
          ) : null}
   
    </Container>
  );
};

export default ClassDetail;
