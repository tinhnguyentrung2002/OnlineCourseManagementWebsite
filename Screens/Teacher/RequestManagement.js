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
import { collection, getDocs, doc, getDoc, query,where } from "firebase/firestore";
import { DataGrid } from "@mui/x-data-grid";
import { useUser } from "../../context/UserContext.js";
import { format } from "date-fns";
const RequestManagement = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [filterState, setFilterState] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const uid = useUser();
  useEffect(() => {
    const fetchRequests = async (uid) => {
      try {
        const requestsQuery = query(
          collection(db, "Requests"),
          where("request_sender_id", "==", uid)
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


    fetchRequests(uid);
  }, []);
  const handleViewDetails = async (request) => {
    if(request.request_type === "approval")
    {
      const courseRef = doc(db, "TempCourses", request.request_course_id);
      const courseSnapshot = await getDoc(courseRef);
      const courseTitle = courseSnapshot.exists()
        ? courseSnapshot.data().course_title
        : "Khóa học không tồn tại";
    setCurrentRequest({ ...request, courseTitle });
 
    }else{
      const courseRef = doc(db, "Courses", request.request_course_id);
      const courseSnapshot = await getDoc(courseRef);
      const courseTitle = courseSnapshot.exists()
        ? courseSnapshot.data().course_title
        : "Khóa học không tồn tại";
        
    setCurrentRequest({ ...request, courseTitle });
 
    }
      setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setCurrentRequest(null);
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
      width: 180,
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
      width: 180,
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
    { field: "request_reply", headerName: "Phản hồi", width: 300 },
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
      width: 180,
      renderCell: (params) => (
        <Button variant="primary" onClick={() => handleViewDetails(params.row)}>
          Xem chi tiết
        </Button>
      ),
    },
   
  ];

  return (
    <Container className="py-4">
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
        <p>
        <p>
          <strong>Loại yêu cầu:</strong>{" "}
          <Badge
            bg={
              currentRequest.request_type === "approval"
                ? "primary"
                : "info"
            }
          >
            {currentRequest.request_type === "approval"
              ? "Duyệt khóa học"
              : "Mở khóa"}
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
        </p>
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
            value={currentRequest.request_reply || "Chưa có phản hồi từ admin"}
            readOnly
          />
        </Form.Group>

     
      </>
    )}
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={handleCloseModal}>
      Đóng
    </Button>
  </Modal.Footer>
</Modal>

    </Container>
  );
};

export default RequestManagement;
