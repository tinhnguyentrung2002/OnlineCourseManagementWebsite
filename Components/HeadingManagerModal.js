import React, { useEffect, useState, useRef } from 'react';
import { Modal, Button, Form, Tabs, Tab, Card, ListGroup, Accordion, Badge } from 'react-bootstrap';
import { doc, updateDoc, serverTimestamp, arrayUnion, addDoc, collection, getDoc, deleteDoc, Timestamp, getDocs } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, StringFormat } from 'firebase/storage';
import { db, storage } from '../firebase'; 
import AlertPopup from './alert';

const HeadingManagerModal = ({ showModal, resetNewHeading, newHeading, handleEditHeading, fetchCourseData ,handleAddHeading, courseData, setNewHeading, temp }) => {
  const currentHeading = courseData.Heading.find(h => h.heading_id === newHeading.id);
  const [alert, setAlert] = useState({ message: '', severity: '' });
  const getCollectionPath = () => (temp === 0 ? "Courses" : "TempCourses");
  const deleteSubcollectionDocs = async (docRef, subcollectionName) => {
    const subcollectionRef = collection(docRef, subcollectionName);
    const snapshot = await getDocs(subcollectionRef);
    const deletePromises = snapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises); 
  };

  const deleteDocumentWithSubcollections = async (docRef, subcollectionNames) => {
    try {

      for (const subcollectionName of subcollectionNames) {
        await deleteSubcollectionDocs(docRef, subcollectionName);
      }
      await deleteDoc(docRef);
      console.log('Đã xóa');
    } catch (error) {
      console.error('Lỗi khi xóa tài liệu', error);
    }
  };
  return (
    <Modal show={showModal} onHide={resetNewHeading} size='xl'>
        <AlertPopup alert={alert} setAlert={setAlert}/>
      <Modal.Header closeButton>
        <Modal.Title>{newHeading.isEditing ? 'Chỉnh sửa chương' : 'Thêm chương mới'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group controlId="formHeadingTitle">
            <Form.Label>Tên Chương</Form.Label>
            <Form.Control
              type="text"
              placeholder="Nhập tên chương"
              value={newHeading.title}
              onChange={(e) => setNewHeading({ ...newHeading, title: e.target.value })}
              required
            />
          </Form.Group>
          <Form.Group controlId="formHeadingDescription">
            <Form.Label>Mô Tả Chương</Form.Label>
            <Form.Control
              as="textarea"
              rows={5}
              placeholder="Nhập mô tả chương"
              value={newHeading.description}
              onChange={(e) => setNewHeading({ ...newHeading, description: e.target.value })}
              required
            />
          </Form.Group>
        </Form>
        {newHeading.isEditing ?  <Tabs defaultActiveKey="documents" className="mt-3">
          <Tab eventKey="documents" title="Tài liệu">
            <DocumentManager
              documents={currentHeading?.document}
              fetchCourseData={fetchCourseData}
              getCollectionPath={getCollectionPath}
              course_id = {courseData.course_id}
              heading_id={newHeading.id}
              setAlert ={setAlert}
        
            />
          </Tab>
          <Tab eventKey="videos" title="Video bài giảng">
            <VideoManager
              videos={currentHeading?.video}
              fetchCourseData={fetchCourseData}
              getCollectionPath={getCollectionPath}
              course_id = {courseData.course_id}
              heading_id={newHeading.id}
              setAlert={setAlert}
         
            />
          </Tab>
          <Tab eventKey="quizzes" title="Bài tập">
            <QuizManager
             quizzes={currentHeading?.quiz}
             fetchCourseData={fetchCourseData}
             getCollectionPath={getCollectionPath}
             course_id = {courseData.course_id}
             heading_id={newHeading.id}
             setAlert={setAlert}
             deleteAll = {deleteDocumentWithSubcollections}
            />
          </Tab>
        </Tabs> : <></>}
       
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={resetNewHeading}>
          Đóng
        </Button>
        <Button variant="primary" onClick={newHeading.isEditing ? handleEditHeading : handleAddHeading}>
          {newHeading.isEditing ? 'Cập nhật chương' : 'Thêm chương'}
        </Button>
      </Modal.Footer>
    </Modal>
  );

};

const DocumentManager = ({ documents, fetchCourseData, getCollectionPath,course_id, heading_id, setAlert}) => {
  const [sortedDocuments, setSortedDocument] = useState(null);
  useEffect(()=>{
    if (documents) {
      const temp = documents.sort((a, b) => {
        const dateA = new Timestamp(a.document_upload_date);
        const dateB = new Timestamp(b.document_upload_date);
    
        return dateA - dateB;
      });
      setSortedDocument(temp)
    }
  },[documents])

  const [loading, setLoading] = useState(false)
  const [percent, setPercent] = useState(null)
  const fileInputRef = useRef(null); 
  const handleClick = () => {
    fileInputRef.current.value = ""
  }
  const [newDocument, setNewDocument] = useState({
    document_title: '',
    file: null, 
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setNewDocument({ ...newDocument, file: file });
    } else {
      alert('Vui lòng chọn file PDF');
    }
  };

  const uploadFile = async () => {
    setLoading(true)
    if (!newDocument.file) {
      setLoading(false)
      alert('Vui lòng chọn file PDF để tải lên');
      return;
    }
    if (!newDocument.document_title) {
      setLoading(false)
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }
  
    const storageRef = ref(storage, `documents/${newDocument.document_title}-${Date.now()}`);
    const uploadTask = uploadBytesResumable(storageRef, newDocument.file);
  

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setPercent(progress + '%')
      },
      (error) => {
        console.error('Upload file thất bại:', error);
        alert('Có lỗi xảy ra khi tải lên file');
      },
      async () => {
       
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        
        const documentData = {
          document_title: newDocument.document_title,
          document_url: downloadURL,
          document_upload_date: serverTimestamp(),
        };
  
        const headingRef = await addDoc(collection(db, getCollectionPath(), course_id, 'Heading', heading_id, 'document'), documentData); 
        await updateDoc(headingRef, {
          document_id: headingRef.id
        }).then(()=>{
          fetchCourseData()
          setPercent(null)
          handleClick()
        });
  
        setNewDocument({ document_title: '', file: null }); 
        setLoading(false)
      }
    );
  };

  const onDelete = async (id)=>{
    setLoading(true)
    const documentRef = doc(db, getCollectionPath(), course_id, 'Heading', heading_id, 'document', id);
    await deleteDoc(documentRef)
    // await deleteDoc(documentRef).then(async ()=>{
     
    // });
    await fetchCourseData()
    setLoading(false)
    setAlert({ message: "Xóa document thành công", severity: "success" });
  }
  const handleAddDocument = (e) => {
    e.preventDefault();
    uploadFile(); 
  };
  return (
    <Card className="mb-4">
      <Card.Body>
        <Card.Title className='mb-4'>Tài liệu hiện có</Card.Title>
        { documents &&documents.length !==0 ? <ListGroup>
          {sortedDocuments?.map((doc) => (
            <ListGroup.Item key={doc.document_url} className="d-flex justify-content-between align-items-center">
              <a href={doc.document_url} target="_blank" rel="noopener noreferrer">
                {doc.document_title} - <small> {new Date(doc.document_upload_date.seconds * 1000).toLocaleDateString('vi-VN')} 
                                      {" - " + new Date(doc.document_upload_date.seconds * 1000).toLocaleTimeString('vi-VN', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false
                                      })}</small>
              </a>
             
              <Button variant="danger" onClick={() => onDelete(doc.document_id)} disabled={loading}> Xóa</Button>
              
            </ListGroup.Item>
          ))}
        </ListGroup> :  <p className='text-center mt-2 mb-2'>Trống</p>}
        

        <Card.Title className="mt-4">Thêm tài liệu mới</Card.Title>
        <Form onSubmit={handleAddDocument}>
          <Form.Group controlId="documentTitle" className="mt-2">
            <Form.Control
              type="text"
              placeholder="Tiêu đề tài liệu"
              value={newDocument.document_title}
              onChange={(e) => setNewDocument({ ...newDocument, document_title: e.target.value })}
              required
            />
          </Form.Group>
          <Form.Group controlId="documentFile" className="mt-2">
            <Form.Label>Chọn file PDF</Form.Label>
            <Form.Control
              type="file"
              accept=".pdf"
              ref={fileInputRef}
              onChange={handleFileChange}
              required
            />
          </Form.Group>
          <Button type="submit" variant="primary" className="mt-4" disabled={loading}>
          {loading ? (
              <>
                <i className="fas fa-sync-alt" style={{ marginRight: '10px' }}></i>
                Thêm tài liệu {percent}
              </>
            ) : (
              <>
                <i className="fas fa-sync-alt" style={{ marginRight: '10px' }}></i>
                Thêm tài liệu
              </>
            )}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
};

const VideoManager = ({ videos, fetchCourseData, getCollectionPath, course_id, heading_id, setAlert }) => {
  const [newVideo, setNewVideo] = useState({ video_url: '', video_title: '' });
  const [sortedVideos, setSortedVideo] = useState(null);
  const [loading, setLoading] = useState(false)
  useEffect(()=>{
    if (videos) {
      const temp = videos.sort((a, b) => {
        const dateA = new Timestamp(a.video_upload_date);
        const dateB = new Timestamp(b.video_upload_date);
    
        return dateA - dateB;
      });
      setSortedVideo(temp)
    }
  },[videos])

  function getVideoId(videoUrl) {
    if (!videoUrl || videoUrl.trim().length === 0) {
      return null;
    }

    const expression = /(?<=watch\?v=|youtu.be\/|\/v\/|embed\/)[^#\&\?\\n]*/;
    const match = videoUrl.match(expression);
    if (match) {
      return match[0];  
    } else {
      alert("Link không phù hợp. Vui lòng nhập URL YouTube hợp lệ.");
    }

    return null;
  }

  const onAdd = async (url) => {
    setLoading(true)
    const videoId = getVideoId(url);
    if (!videoId) {
      setLoading(false)
      return;
    }
    if (!newVideo.video_title) {
      setLoading(false)
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }
    const videoData = {
      video_title: newVideo.video_title,
      video_url: videoId, 
      video_upload_date: serverTimestamp(),
    };

    try {
      const videoRef =  await addDoc(
        collection(db, getCollectionPath(), course_id, 'Heading', heading_id, 'video'),
        videoData
      );
      
      await updateDoc(videoRef, {
        video_id: videoRef.id
      }).then(async()=>{
        await fetchCourseData()
        setLoading(false)
      });

      setAlert({ type: 'success', message: 'Video đã được thêm thành công!' });
      setNewVideo({ video_url: '', video_title: '' });
    } catch (error) {
      console.error('Lỗi khi thêm video:', error);
      setAlert({ type: 'error', message: 'Có lỗi xảy ra khi thêm video.' });
    }
  };

  const onDelete = async (videoId) => {
    setLoading(true)
    const videoRef = doc(db, getCollectionPath(), course_id, 'Heading', heading_id, 'video', videoId);
    await deleteDoc(videoRef).then(async ()=>{
      await fetchCourseData()
      setLoading(false)
    });
    setAlert({ message: "Xóa video thành công", severity: "success" });
  };

  return (
    <Card className="mb-4">
      <Card.Body>
        <Card.Title>Video hiện có</Card.Title>
        {videos && videos.length === 0 ? (
          <p className='text-center mt-2 mb-2'>Trống</p>
        ) : (
          <ListGroup>
            {sortedVideos?.map((video) => (
              <ListGroup.Item key={video.video_id} className="d-flex justify-content-between align-items-center">
                <a   href={`https://www.youtube.com/watch?v=${video.video_url}`}  target="_blank" rel="noopener noreferrer">
                  {video.video_title} - <small> {new Date(video.video_upload_date.seconds * 1000).toLocaleDateString('vi-VN')} 
                                      {" - " + new Date(video.video_upload_date.seconds * 1000).toLocaleTimeString('vi-VN', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false
                                      })}</small>
                </a>
                <Button variant="danger" onClick={() => onDelete(video.video_id)} disabled={loading}>
                  Xóa
                </Button>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}

        <Card.Title className="mt-4">Thêm video mới</Card.Title>
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            onAdd(newVideo.video_url);
          }}
        >
          <Form.Group controlId="videoTitle" className="mt-2">
            <Form.Control
              type="text"
              placeholder="Tiêu đề video"
              value={newVideo.video_title}
              onChange={(e) => setNewVideo({ ...newVideo, video_title: e.target.value })}
              required
            />
          </Form.Group>

          <Form.Group controlId="videoUrl" className="mt-2">
            <Form.Control
              type="url"
              placeholder="Link youtube"
              value={newVideo.video_url}
              onChange={(e) => setNewVideo({ ...newVideo, video_url: e.target.value })}
              required
            />
          </Form.Group>

          <Button type="submit" variant="primary" className="mt-2" disabled={loading}>
            Thêm video
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
};

const QuizManager = ({ quizzes, fetchCourseData, getCollectionPath, course_id, heading_id, setAlert, deleteAll }) => {
  const [newQuiz, setNewQuiz] = useState({ quiz_title: '', quiz_subtitle: '', quiz_time: '', quiz_require: '' });
  const [expanded, setExpanded] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [newQuestion, setNewQuestion] = useState({ question_content: '', question_answer_option: [], question_correct_answer: '', question_type: '' , question_explain:''});
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questionToEdit, setQuestionToEdit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);

  const onAddQuiz = async () => {
    if (!newQuiz.quiz_title || !newQuiz.quiz_subtitle || !newQuiz.quiz_time|| !newQuiz.quiz_require) {
      setLoading(false)
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }
    setLoading(true);
    const quizData = {
      course_id,
      heading_id,
      quiz_title: newQuiz.quiz_title,
      quiz_subtitle: newQuiz.quiz_subtitle,
      quiz_time: String(newQuiz.quiz_time),
      quiz_require: String(newQuiz.quiz_require),
    };

    try {
      const quizRef = await addDoc(
        collection(db, getCollectionPath(), course_id, 'Heading', heading_id, 'quiz'),
        quizData
      );

      await updateDoc(quizRef, { quiz_id: quizRef.id });

      await fetchCourseData();
      setLoading(false);
      setAlert({ type: 'success', message: 'Bài tập đã được thêm thành công!' });
      setNewQuiz({ quiz_title: '', quiz_subtitle: '', quiz_time: '', quiz_require: '' });
    } catch (error) {
      console.error('Lỗi khi thêm bài tập:', error);
      setAlert({ type: 'error', message: 'Có lỗi xảy ra khi thêm bài tập.' });
    }
  };
  const handleCloseModal = () => {
    setShowQuestionModal(false);
    setNewQuestion({
      question_content: '',
      question_answer_option: ['', '', '', ''], 
      question_correct_answer: '',
      question_type:'',
      question_explain:''
    });
    setQuestionToEdit(null)
  };
  const onUpdateQuiz = async () => {
    if (selectedQuiz) {
      if (!newQuiz.quiz_title || !newQuiz.quiz_subtitle || !newQuiz.quiz_time|| !newQuiz.quiz_require) {
        setLoading(false)
        alert('Vui lòng điền đầy đủ thông tin');
        return;
      }
      setLoading(true);
      const quizData = {
        quiz_title: newQuiz.quiz_title,
        quiz_subtitle: newQuiz.quiz_subtitle,
        quiz_time: String(newQuiz.quiz_time),
        quiz_require: String(newQuiz.quiz_require),
      };

      try {
        const quizRef = doc(db, getCollectionPath(), course_id, 'Heading', heading_id, 'quiz', selectedQuiz.quiz_id);
        await updateDoc(quizRef, quizData);

        await fetchCourseData();
        setLoading(false);
        setAlert({ type: 'success', message: 'Bài tập đã được cập nhật thành công!' });
        // setNewQuiz({ quiz_title: '', quiz_subtitle: '', quiz_time: '', quiz_require: '' });
        // setExpanded(null);
      } catch (error) {
        console.error('Lỗi khi cập nhật bài tập:', error);
        setAlert({ type: 'error', message: 'Có lỗi xảy ra khi cập nhật bài tập.' });
      }
    }
  };
  const handleAccordionClick = (quiz, event) => {
    if (event.target.closest('.accordion-body, .btn')) {
      event.stopPropagation();
      return;
    }
  
    if (expanded === quiz.quiz_id) {
      setExpanded(null); 
      setNewQuiz({ quiz_title: '', quiz_subtitle: '', quiz_time: '', quiz_require: '' });
      setSelectedQuiz(null);
    } else {
      setExpanded(quiz.quiz_id);
      setSelectedQuiz(quiz);
      setNewQuiz({
        quiz_title: quiz.quiz_title,
        quiz_subtitle: quiz.quiz_subtitle,
        quiz_time: quiz.quiz_time,
        quiz_require: quiz.quiz_require,
      });
    }
  };
  const onAddQuestion = async (quiz_id) => {
    if (newQuestion.question_content && (newQuestion.question_type === 'choice' ? newQuestion.question_answer_option.length ===4 : true)) {
      try {
        if (!newQuestion.question_content || !newQuestion.question_type || !newQuestion.question_correct_answer) {
          setLoading(false)
          alert('Vui lòng điền đầy đủ thông tin');
          return;
        }
        setLoading(true)
        const questionData = {
          question_correct_answer: newQuestion.question_correct_answer,
          question_type: newQuestion.question_type,
          question_explain: newQuestion.question_explain,
          question_content: newQuestion.question_content,
        };
        if (newQuestion.question_type === 'choice') {
          if (!newQuestion.question_answer_option) {
            setLoading(false)
            alert('Vui lòng điền đầy đủ thông tin');
            return;
          }
          questionData.question_answer_option = newQuestion.question_answer_option;
        }
  
        if (questionToEdit) {
          if (!newQuestion.question_content || !newQuestion.question_type || !newQuestion.question_correct_answer) {
            setLoading(false)
            alert('Vui lòng điền đầy đủ thông tin');
            return;
          }
          await updateDoc(
            doc(db, getCollectionPath(), course_id, 'Heading', heading_id, 'quiz', quiz_id, 'questions', questionToEdit.question_id),
            questionData
          );
 
          setAlert({ type: 'success', message: 'Câu hỏi đã được cập nhật thành công!' });
        } else {
          const questionRef = await addDoc(
            collection(db, getCollectionPath(), course_id, 'Heading', heading_id, 'quiz', quiz_id, 'questions'),
            questionData
          );

          await updateDoc(questionRef, {
            question_id: questionRef.id,
          });
  
          setAlert({ type: 'success', message: 'Câu hỏi đã được thêm thành công!' });
        }
        setShowQuestionModal(false);

        await fetchCourseData();
     
        setLoading(false)
      } catch (error) {
        console.error('Lỗi khi xử lý câu hỏi:', error);
        setAlert({ type: 'error', message: 'Có lỗi xảy ra khi thêm/cập nhật câu hỏi.' });
      }
    } else {
      setAlert({ type: 'error', message: 'Vui lòng điền đầy đủ thông tin câu hỏi!' });
    }
  };
  

  const onEditQuestion = (question) => {
    setQuestionToEdit(question);
    setNewQuestion({
      question_content: question.question_content,
      question_answer_option: question.question_answer_option || [],
      question_correct_answer: question.question_correct_answer,
      question_type: question.question_type,
      question_explain: question.question_explain,
    });
    setShowQuestionModal(true);
  };
  const onDeleteQuestion = (quiz_id, question_id) => {
    setQuestionToDelete({ quiz_id, question_id });
    setShowDeleteModal(true); 
  };
  const onDeleteQuiz = async (quizId) => {
    setLoading(true)
    const quizRef = doc(db, getCollectionPath(), course_id, 'Heading', heading_id, 'quiz', quizId);
    const subcollectionNames = ['history', 'questions'];
    await deleteAll(quizRef, subcollectionNames)
    await fetchCourseData()
    if (expanded === quizId) {
      setExpanded(null); 
      setNewQuiz({ quiz_title: '', quiz_subtitle: '', quiz_time: '', quiz_require: '' });
      setSelectedQuiz(null);
    }
    setLoading(false)
    setAlert({ message: "Xóa bài tập thành công", severity: "success" });
  };
  const handleDeleteQuestion = async () => {
    if (questionToDelete) {
      try {
        setLoading(true)
        const questionRef = doc(db, getCollectionPath(), course_id, 'Heading', heading_id, 'quiz', questionToDelete.quiz_id, 'questions', questionToDelete.question_id);
        await deleteDoc(questionRef); 
     
        await fetchCourseData();
        setShowDeleteModal(false);
        setQuestionToDelete(null)
        setAlert({ type: 'success', message: 'Câu hỏi đã được xóa thành công!' });
        setLoading(false)
      } catch (error) {
        console.error('Lỗi khi xóa câu hỏi:', error);
        setAlert({ type: 'error', message: 'Có lỗi xảy ra khi xóa câu hỏi.' });
      }
    }
  };
  const handleFormSubmit = () => {
    if (!newQuestion.question_type) {
      alert("Vui lòng chọn loại câu hỏi!");
      return; 
    }
    onAddQuestion(selectedQuiz.quiz_id);
  };
  useEffect(() => {
    if (questionToEdit) {
      setNewQuestion({
        question_content: questionToEdit.question_content || '',
        question_answer_option: questionToEdit.question_answer_option || ['', '', '', ''], 
        question_correct_answer: questionToEdit.question_correct_answer || '',
        question_type: questionToEdit.question_type,
        question_explain:questionToEdit.question_explain
      });
    } else {
      setNewQuestion({
        question_content: '',
        question_answer_option: ['', '', '', ''], 
        question_correct_answer: '',
        question_type:'',
        question_explain:''
      });
    }
  }, [showQuestionModal, questionToEdit]);
  return (
    <Card className="mb-4" >
      <Card.Body >
        <Card.Title >Bài tập hiện có</Card.Title>
        {quizzes &&quizzes.length !== 0 ? (
          <Accordion  className="mt-2">
            {quizzes?.map((quiz) => (
             
              <Accordion.Item
                key={quiz.quiz_id}
                eventKey={quiz.quiz_id}
                onClick={(e) => handleAccordionClick(quiz, e)} 
              >
                <Accordion.Header>
                  {quiz.quiz_title} <Badge bg="info" className="ml-3">{quiz.quiz_time} phút</Badge> <Badge bg="warning" className="ml-3">Yêu cầu tối thiểu: {quiz.quiz_require}%</Badge>
                </Accordion.Header>
                <Accordion.Body onClick={(e) => e.stopPropagation()}>
                  <p className="text-muted fw-semibold">{quiz.quiz_subtitle}</p>
                  {quiz.question && quiz.question.length > 0 && quiz.question.map((question) => (
                    <Accordion onClick={(e) => e.stopPropagation()} key={question.question_id} className="mb-3">
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
                          <Button variant="warning" disabled={loading} onClick={() => onEditQuestion(question)} style={{ color: 'white', fontStyle: 'bold', marginRight: '4px' }}>Chỉnh sửa</Button>
                          <Button variant="danger" disabled={loading} onClick={() => onDeleteQuestion(quiz.quiz_id, question.question_id)}>Xóa</Button>
                        </Accordion.Body>
                      </Accordion.Item>
                    </Accordion>
                  ))}
                  <Button variant="primary" onClick={() => setShowQuestionModal(true)} disabled={loading} style={{ fontStyle: 'bold', marginRight: '4px' }}>
                    Thêm câu hỏi
                  </Button>
                  <Button variant="danger" onClick={() => onDeleteQuiz(quiz.quiz_id)} disabled={loading}>Xóa</Button>
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        ) : (
          <p className="text-center mt-2 mb-2">Trống</p>
        )}

        <Card.Title className="mt-4">{expanded ? 'Cập nhật bài tập' : 'Thêm bài tập mới'}</Card.Title>
        <Form onSubmit={(e) => { e.preventDefault(); setNewQuiz({ quiz_title: '', quiz_subtitle: '', quiz_time: '', questions: [] }); }}>
          <Form.Group controlId="quizTitle" className='mt-2'>
            <Form.Control type="text" placeholder="Tiêu đề trắc nghiệm" value={newQuiz.quiz_title} onChange={(e) => setNewQuiz({ ...newQuiz, quiz_title: e.target.value })} required />
          </Form.Group>
          <Form.Group controlId="quizSubtitle" className='mt-2'>
            <Form.Control type="text" placeholder="Mô tả trắc nghiệm" value={newQuiz.quiz_subtitle} onChange={(e) => setNewQuiz({ ...newQuiz, quiz_subtitle: e.target.value })} required />
          </Form.Group>
          <Form.Group controlId="quizTime" className='mt-2'>
            <Form.Control type="number" placeholder="Thời gian làm bài (phút)" value={newQuiz.quiz_time} onChange={(e) => setNewQuiz({ ...newQuiz, quiz_time: e.target.value })} required />
          </Form.Group>
          <Form.Group controlId="quizTime" className='mt-2'>
            <Form.Control type="number" placeholder="Yêu cầu hoàn thành (%)" value={newQuiz.quiz_require} min={0} max={100} onChange={(e) => setNewQuiz({ ...newQuiz, quiz_require: e.target.value })} required />
          </Form.Group>
          <Button variant={expanded ? "warning" : "primary"} className='mt-2' disabled={loading} onClick={expanded  ? onUpdateQuiz : onAddQuiz}>
                    {expanded ? 'Cập nhật bài tập' : 'Thêm bài tập'}
                  </Button>
        </Form>
        <Modal show={showQuestionModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{questionToEdit ? 'Cập nhật câu hỏi' : 'Thêm câu hỏi mới'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="questionText">
              <Form.Label>Câu hỏi</Form.Label>
              <Form.Control
                type="text"
                placeholder="Nhập câu hỏi"
                value={newQuestion.question_content}
                onChange={(e) => setNewQuestion({ ...newQuestion, question_content: e.target.value })}
                required
              />
            </Form.Group>
            {questionToEdit ? <></>:  <Form.Group controlId="questionType">
              <Form.Label>Loại câu hỏi</Form.Label>
              <Form.Control
                as="select"
                value={newQuestion.question_type}
                onChange={(e) => setNewQuestion({ ...newQuestion, question_type: e.target.value })}
              >
                <option value="">Chọn loại câu hỏi</option>
                <option value="text">Điền từ</option>
                <option value="choice">Trắc nghiệm</option>
              </Form.Control>
            </Form.Group>}
           
            {newQuestion.question_type === 'choice' && (
              <>
                <Form.Group controlId="questionOptions" className="mt-2">
                  <Form.Label>Đáp án</Form.Label>
                  {newQuestion.question_answer_option.map((option, index) => (
                    <Form.Control
                      className='mt-2'
                      key={index}
                      type="text"
                      placeholder={`Đáp án ${index + 1}`}
                      value={option}
                      onChange={(e) => {
                        const updatedOptions = [...newQuestion.question_answer_option];
                        updatedOptions[index] = e.target.value;
                        setNewQuestion({ ...newQuestion, question_answer_option: updatedOptions });
                      }}
                      required
                    />
                  ))}
                </Form.Group>

                <Form.Group controlId="correctAnswer" className="mt-2">
                  <Form.Label>Đáp án đúng</Form.Label>
                  <Form.Control
                    as="select"
                    value={newQuestion.question_correct_answer ? newQuestion.question_correct_answer : "" }
                    onChange={(e) => setNewQuestion({ ...newQuestion, question_correct_answer: e.target.value })}
                    required
                  >
                     <option key={0} value={""}>Chọn câu trả lời đúng</option>
                    {newQuestion.question_answer_option.map((option, index) => (
                      <option key={index+1} value={option}>{option}</option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </>
            )}
            {newQuestion.question_type === 'text' && (
              <>
                <Form.Group controlId="correctAnswer" className="mt-2">
                  <Form.Label>Đáp án đúng</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Nhập đáp án đúng"
                    value={newQuestion.question_correct_answer ? newQuestion.question_correct_answer : "" }
                    onChange={(e) => setNewQuestion({ ...newQuestion, question_correct_answer: e.target.value })}
                    required
                  />
                </Form.Group>
              </>
            )}

            <Form.Group controlId="questionExplain" className="mt-2">
              <Form.Label>Giải thích đáp án</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={newQuestion.question_explain}
                onChange={(e) => setNewQuestion({ ...newQuestion,question_explain: e.target.value })}
                required
              />
            </Form.Group>

            <Button
              variant="primary"
              onClick={() => handleFormSubmit()}
              className="mt-3"
            >
              {questionToEdit ? 'Cập nhật câu hỏi' : 'Thêm câu hỏi'}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Xác nhận xóa</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Bạn có chắc chắn muốn xóa câu hỏi này không?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Hủy
          </Button>
          <Button variant="danger" onClick={handleDeleteQuestion}>
            Xóa
          </Button>
        </Modal.Footer>
      </Modal>
      </Card.Body>
    </Card>
  );
};



export default HeadingManagerModal;
