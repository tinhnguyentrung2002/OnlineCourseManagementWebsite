import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Badge,
  Button,
  Modal,
  Form,
  Spinner
} from "react-bootstrap";
import { db } from "../../firebase.js";
import { collection, getDocs, doc, getDoc, query, where, updateDoc, setDoc, deleteDoc } from "firebase/firestore";
import { DataGrid } from "@mui/x-data-grid";
import { useUser } from "../../context/UserContext.js";
import { useNavigate } from 'react-router-dom';
import { format } from "date-fns";
import emailjs from 'emailjs-com';
import AlertPopup from "../../Components/alert.js";
const RequestManagement = () => {
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [response, setResponse] = useState('');
  const [filterState, setFilterState] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [emailContent, setEmailContent] = useState(""); 
  const [courseOwnerEmail, setCourseOwnerEmail] = useState("");
  const [courseOwnerName, setCourseOwnerName] = useState("");
  const [alert, setAlert] = useState({ message: '', severity: '' });
  const uid = useUser();
  const navigate = useNavigate(); 

  useEffect(() => {
    
    fetchCourses();
    fetchUsers();
    fetchRequests();
  }, []);
  const fetchCourses = async () => {
    try {
      setLoading(true);
      const coursesRef = collection(db, "Courses");
      const coursesQuery = query(coursesRef, where("course_type", "==", "course"));
      const querySnapshot = await getDocs(coursesQuery);
      
      const filteredCourses = [];

      for (const docSnapshot of querySnapshot.docs) {
        const courseData = docSnapshot.data();
        const typeRef = collection(doc(db, "Courses", docSnapshot.id), "Type");
        const typeQuery = query(typeRef, where("category_child_id", "==", ""));
        
        const typeSnapshot = await getDocs(typeQuery);
        
        typeSnapshot.forEach((typeDoc) => {
          const typeData = typeDoc.data();
          if (!["grade10", "grade11", "grade12"].includes(typeData.category_id)) {
            filteredCourses.push({
              id: docSnapshot.id,
              ...courseData,
              category_id: typeData.category_id,
            });
          }
        });
      }

      setCourses(filteredCourses);
    } catch (error) {
      console.error("Error fetching courses: ", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const usersRef = collection(db, "Users");
      const querySnapshot = await getDocs(usersRef);
      const usersData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users: ", error);
    }
  };
  const fetchRequests = async () => {
    try {
      const requestsQuery = query(
        collection(db, "Requests")
      );
      
      const querySnapshot = await getDocs(requestsQuery);
      
      setRequests(
        querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    } catch (error) {
      console.error("Error fetching requests: ", error);
    } finally {
      setLoading(false); 
    }
  };
  const handleViewCourse = (courseId, temp) => {
    navigate(`/admin/khoa-hoc/${courseId}`, { state: { temp } });
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
 const copySubcollectionDocs = async (sourceDocRef, destinationDocRef, subcollectionName, courseId) => {
    const subcollectionRef = collection(sourceDocRef, subcollectionName);
    const snapshot = await getDocs(subcollectionRef);

    const copyPromises = snapshot.docs.map( async (docSnap) => {

      const destSubcollectionRef = doc(destinationDocRef, subcollectionName, docSnap.id);
      await setDoc(destSubcollectionRef, docSnap.data());
    //   const newDocRef = doc(destSubcollectionRef);
    if (subcollectionName === "Heading") {
        const sourceHeadingRef = doc(db, "TempCourses", courseId, subcollectionName, docSnap.id)
        copyNestedSubcollections(sourceHeadingRef, destSubcollectionRef, courseId);
      }
    });
  
    await Promise.all(copyPromises);
  };
  
  const copyNestedSubcollections = async (sourceDocRef, destinationDocRef, courseId) => {
    const subcollections = ['quiz', 'document', 'video'];
    
    for (const subcollection of subcollections) {
      await copySubcollectionDocs(sourceDocRef, destinationDocRef, subcollection, courseId);
    }
  
    const quizRef = collection(sourceDocRef, 'quiz');
    const quizSnapshot = await getDocs(quizRef);
    for (const quizDoc of quizSnapshot.docs) {
    //   const questionsRef = collection(quizDoc.ref, 'questions');
      const questionDestination = doc(destinationDocRef, 'quiz', quizDoc.id);
      await copySubcollectionDocs(quizDoc.ref, questionDestination , 'questions');
    }
  };
  const copyDocumentWithSubcollections = async (sourceDocRef, destinationDocRef, subcollectionNames, courseId) => {
    try {
      const sourceSnapshot = await getDoc(sourceDocRef);
      if (sourceSnapshot.exists()) {
        await setDoc(destinationDocRef, sourceSnapshot.data());
  
        for (const subcollectionName of subcollectionNames) {
          await copySubcollectionDocs(sourceDocRef, destinationDocRef, subcollectionName, courseId);

        }
  
        console.log('Đã sao chép tài liệu và subcollections');
      } else {
        console.log('Tài liệu nguồn không tồn tại');
      }
    } catch (error) {
      console.error('Lỗi khi sao chép tài liệu hoặc subcollections:', error);
    }
  };
  const handleViewDetails = async (request) => {
    if(request.request_type === "approval")
    {
      const courseRef = doc(db, "TempCourses", request.request_course_id);
      const courseSnapshot = await getDoc(courseRef);
      const courseTitle = courseSnapshot.exists()
        ? courseSnapshot.data().course_title
        : "Khóa học không tồn tại";
  
      setCurrentRequest({ ...request, courseTitle });
      if (courseSnapshot.exists()) {
        const courseData = courseSnapshot.data();
        const courseOwnerId = courseData.course_owner_id;
     
        const owner = users.find(user => user.id === courseOwnerId);
  
        if (owner) {
          setCourseOwnerEmail(owner?.user_email || "");
          setCourseOwnerName(owner?.user_name || "");
        } else {
          console.error("Không tìm thấy thông tin giáo viên");
        }
      }
    }    if(request.request_type === "unlock")
      {
        const courseRef = doc(db, "Courses", request.request_course_id);
        const courseSnapshot = await getDoc(courseRef);
        const courseTitle = courseSnapshot.exists()
          ? courseSnapshot.data().course_title
          : "Khóa học không tồn tại";
    
        setCurrentRequest({ ...request, courseTitle });
        if (courseSnapshot.exists()) {
          const courseData = courseSnapshot.data();
          const courseOwnerId = courseData.course_owner_id;
       
          const owner = users.find(user => user.id === courseOwnerId);
    
          if (owner) {
            setCourseOwnerEmail(owner?.user_email || "");
            setCourseOwnerName(owner?.user_name || "");
          } else {
            console.error("Không tìm thấy thông tin giáo viên");
          }
        }
      }
    else{
      setAlert({
        message: "Có lỗi xảy ra!",
        severity: "danger",
      });
    }
   
    setOpenModal(true);
  };


  const handleCloseModal = () => {
    setOpenModal(false);
    setCurrentRequest(null);
    setResponse('');
  };

  const handleApprove = async () => {
    try {
      if(response === null)
      {
        alert('Vui lòng nhập nội dung phản hồi')
        return;
      }
      setLoading(true)
    
      const requestRef = doc(db, "Requests", currentRequest.id);
      await updateDoc(requestRef, {
        request_state: "approval",
        request_reply: response
      });
      if (currentRequest.request_type === "unlock") {
        const courseRef = doc(db, "Courses", currentRequest.request_course_id);
        await updateDoc(courseRef, {
          course_lock: false,
          course_state: true
        });
        sendEmail(1)
      }
      else{
        const courseDocRef = doc(db, "Courses", currentRequest.request_course_id);
  
        const tempCourseRef = doc(db, "TempCourses", currentRequest.request_course_id);
        const sub = (["Comment", "Type", "Heading"])
        await copyDocumentWithSubcollections(tempCourseRef, courseDocRef,sub, currentRequest.request_course_id);
        await updateDoc(courseDocRef, {
          course_state: true
        });
        await deleteDocumentWithSubcollections(tempCourseRef,sub); 
        sendEmail(0)
      }
     
      setOpenModal(false);
      setLoading(false)
      setResponse(null);
      fetchRequests();
    } catch (error) {
      console.error("Lỗi khi duyệt yêu cầu: ", error);
      setLoading(false)
      setResponse(null);
    }
  };

  const handleDeny = async () => {
    try {
      if(response === null)
        {
          alert('Vui lòng nhập nội dung phản hồi')
          return;
        }
      setLoading(true)
      const requestRef = doc(db, "Requests", currentRequest.id);
      await updateDoc(requestRef, {
        request_state: "deny",
        request_reply: response
      });
      sendEmail(2)
      setOpenModal(false);
      setLoading(false)
      setResponse(null);
      fetchRequests();
    } catch (error) {
      console.error("Lỗi khi từ chối yêu cầu: ", error);
      setResponse(null);
    }
     
  };

  const filteredRequests = requests.filter((request) => {
    const stateMatch =
      filterState === "all" || request.request_state === filterState;
    const typeMatch = filterType === "all" || request.request_type === filterType;
    return stateMatch && typeMatch;
  });

  const columns = [
    { field: "request_id", headerName: "Mã yêu cầu", width: 250 },
    {
      field: "request_type",
      headerName: "Loại yêu cầu",
      width: 120,
      renderCell: (params) => {
        const type = params.value;
        let badgeText = "";
        let badgeColor = "";

        switch (type) {
          case "approval":
            badgeText = "Duyệt khóa học";
            badgeColor = "primary";  
            break;
          case "unlock":
            badgeText = "Mở khóa";
            badgeColor = "info";  
            break;
          default:
            badgeText = "Không xác định";
            badgeColor = "secondary"; 
        }

        return <Badge bg={badgeColor}>{badgeText}</Badge>;
      },
    },
    {
      field: "request_state",
      headerName: "Trạng thái",
      width: 120,
      renderCell: (params) => {
        const state = params.value;
        let badgeText = "";
        let badgeColor = "";

        switch (state) {
          case "pending":
            badgeText = "Chờ duyệt";
            badgeColor = "warning";
            break;
          case "deny":
            badgeText = "Từ chối";
            badgeColor = "danger";
            break;
          case "approval":
            badgeText = "Chấp nhận";
            badgeColor = "success";
            break;
          default:
            badgeText = "Không xác định";
            badgeColor = "secondary";
        }

        return <Badge bg={badgeColor}>{badgeText}</Badge>;
      },
    },
    { field: "request_sender_id", headerName: "ID giáo viên", width: 200 },
    { field: "request_content", headerName: "Nội dung yêu cầu", width: 300 },
    {
      field: "request_date",
      headerName: "Ngày gửi",
      width: 200,
      renderCell: (params) => {
        const upload = params.row.request_date || "";
        return upload ? format(upload.toDate(), "dd/MM/yyyy hh:mm:ss") : "-";
      },
    },
    {
      field: "action",
      headerName: "Hành động",
      width: 500,
      renderCell: (params) => {
        const { request_state, id, request_type } = params.row;
  
        if (request_state !== "pending") {
          return null;
        }
  
        return (
          <>
            {request_type === "approval" ?  <Button variant="primary" onClick={() => handleViewCourse(params.row.request_course_id, 1)}>
            Xem khóa học
          </Button> :  <Button variant="primary" onClick={() => handleViewCourse(params.row.request_course_id, 0)}>
            Xem khóa học
          </Button>}
           
          <Button variant="success" className="ms-2" onClick={() => handleViewDetails(params.row)}>
            Xem yêu cầu
          </Button>
          </>
        );
      },
    },
  ];
  const sendEmail = async (type) => {
    const serviceID = "service_2v1enie"; 
    const templateID = "template_xt5k4ih";
    const userID = "3L_JhyRcHE13gMQfP"; 
    const templateParams = {
      to_name: courseOwnerName,
      to_email: courseOwnerEmail,
      subject: type ===  0 ?`Thông báo duyệt thành công khóa học có ID ${currentRequest.request_course_id}` :  type === 1 ?`Thông báo mở khóa khóa học có ID ${currentRequest.request_course_id}` : `Thông báo từ chối yêu cầu đối với khóa học có ID ${currentRequest.request_course_id}`,
      message: type === 0 ? `Chào bạn, khóa học với ID: ${currentRequest.request_course_id} đã được duyệt` : type === 1 ?`Chào bạn, khóa học với ID: ${currentRequest.request_course_id} hiện đã được mở khóa` : `Chào bạn, yêu cấu đối với khóa học có ID: ${currentRequest.request_course_id} đã bị từ chối, vui lòng chỉnh sửa thông tin khóa học phù hợp`,
    };

    try {
      await emailjs.send(serviceID, templateID, templateParams, userID);
    } catch (error) {
      console.error("Failed to send email", error);
      setAlert({
        message: "Gửi email thất bại, vui lòng thử lại!",
        severity: "danger",
      });
    }
  };
  return (
    <Container className="py-4">
           <AlertPopup alert={alert} setAlert={setAlert} />
      <Row className="mb-3">
        <Col md={3}>
          <Form.Group>
            <Form.Label>Trạng thái</Form.Label>
            <Form.Select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
            >
              <option value="all">Tất cả</option>
              <option value="pending">Chờ duyệt</option>
              <option value="deny">Từ chối</option>
              <option value="approval">Chấp nhận</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group>
            <Form.Label>Loại yêu cầu</Form.Label>
            <Form.Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">Tất cả</option>
              <option value="approval">Duyệt khóa học</option>
              <option value="unlock">Mở khóa</option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      {loading ? (
        <div className="text-center">
          <Spinner animation="border" role="status" />
          <p className="mt-2">Đang tải dữ liệu...</p>
        </div>
      ) : (
        <div style={{ height: 600, width: "100%" }}>
          <DataGrid
            rows={filteredRequests}
            columns={columns}
            pageSize={5}
            rowsPerPageOptions={[5]}
            disableSelectionOnClick
          />
        </div>
      )}

      <Modal show={openModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Chi tiết yêu cầu</Modal.Title>
        </Modal.Header> 
        <Modal.Body>
        {currentRequest && (
          <>
              <p>
                <strong>Mã yêu cầu:</strong> {currentRequest.request_id}
              </p>  
              <p>
                <strong>Khóa học cần xử lý:</strong> {currentRequest.courseTitle}
              </p>
              <p>
                <strong>Loại yêu cầu:</strong>{" "}
                <Badge bg={currentRequest.request_type === "approval" ? "primary" : "info"}>
                  {currentRequest.request_type === "approval" ? "Duyệt khóa học" : "Mở khóa"}
                </Badge>
              </p>
              <strong>Trạng thái:</strong>{" "}
              <Badge
                bg={
                  currentRequest.request_state === "pending"
                    ? "warning"
                    : currentRequest.request_state === "deny"
                    ? "danger"
                    : "success"
                }
              >
                {currentRequest.request_state === "pending"
                  ? "Chờ duyệt"
                  : currentRequest.request_state === "deny"
                  ? "Từ chối"
                  : "Chấp nhận"}
              </Badge>
              <p>
              <strong>Ngày gửi:</strong>
              {currentRequest.request_date ? format(currentRequest.request_date.toDate(), "dd/MM/yyyy HH:mm:ss") : "-"}
              </p>
              <Form.Group>
                <Form.Label>Nội dung yêu cầu:</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={currentRequest.request_content}
                  readOnly
                />
              </Form.Group>

              <Form.Group className="mt-3">
                <Form.Label>Phản hồi:</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                />
              </Form.Group>
       
              </>
                  )}
        </Modal.Body>
        <Modal.Footer>
          <Button disabled={loading} variant="secondary" onClick={handleCloseModal}>
            Đóng
          </Button>
          <Button disabled={loading}  variant="success" onClick={handleApprove}>
            Duyệt
          </Button>
          <Button disabled={loading}  variant="danger" onClick={handleDeny}>
            Từ chối
          </Button>
        </Modal.Footer>
         
      </Modal>
    </Container>
  );
};

export default RequestManagement;
