import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, query, getDocs, doc, updateDoc, where, getDoc } from "firebase/firestore";
import { DataGrid } from "@mui/x-data-grid";
import { Button, TextField, Grid, Select, MenuItem, FormControl, InputLabel} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Badge, Form, Modal } from "react-bootstrap";
import emailjs from 'emailjs-com';
import AlertPopup from "../../Components/alert.js";
import { writeFile, utils } from "xlsx"; 

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [classFilter, setClassFilter] = useState(""); 
  const [categoryFilter, setCategoryFilter] = useState(""); 
  const [openEmailModal, setOpenEmailModal] = useState(false);  
  const [emailContent, setEmailContent] = useState(""); 
  const [courseIdToSend, setCourseIdToSend] = useState(""); 
  const [courseOwnerEmail, setCourseOwnerEmail] = useState("");
  const [courseOwnerName, setCourseOwnerName] = useState("");
  const [alert, setAlert] = useState({ message: '', severity: '' });
  const navigate = useNavigate();

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const coursesRef = collection(db, "Courses");
      const coursesQuery = query(coursesRef, where("course_type", "==", "course"), where("course_state", "==", true));
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

  const fetchCategories = async () => {
    try {
      const categoriesRef = collection(db, "Categories");
      const querySnapshot = await getDocs(categoriesRef);
      
      const categoriesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })).filter((category) => !["grade10", "grade11", "grade12"].includes(category.category_id));
  
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error fetching categories: ", error);
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchUsers();
    fetchCategories();
  }, []);

  const getTeacherName = (ownerId) => {
    const user = users.find((user) => user.id === ownerId);
    return user ? user.user_name : "Không có giáo viên";
  };

  const handleToggleCourseState = async (courseId, courseLock) => {
    try {

      const courseRef = doc(db, "Courses", courseId);
      const courseSnapshot = await getDoc(courseRef);
      
      if (courseSnapshot.exists()) {
        const courseData = courseSnapshot.data();
        const courseTitle = courseData.course_title;
        const courseOwnerId = courseData.course_owner_id;
  
        const owner = users.find(user => user.id === courseOwnerId);
  
        if (owner) {
          setCourseOwnerEmail(owner?.user_email || "");
          setCourseOwnerName(owner?.user_name || "");
          setCourseIdToSend(courseId);
          setEmailContent(`Chào bạn, khóa học ${courseTitle} với ID: ${courseId} hiện ${courseLock ? 'đã được mở khóa' : 'đang bị ẩn'}.`);
          setOpenEmailModal(true);
        } else {
          console.error("Không tìm thấy thông tin giáo viên");
        }
        
        if (courseLock) {
          await updateDoc(courseRef, {
            course_lock: false,
          });
        } else {
          await updateDoc(courseRef, {
            course_state: false,
            course_lock: true,
          });
        }
        
        fetchCourses();
      } else {
        console.error("Không tìm thấy khóa học");
      }
    } catch (error) {
      console.error("Error updating course state: ", error);
    }
  };
  

  const filteredCourses = courses.filter((course) => {
    const matchesSearchTerm = course.course_title.toLowerCase().includes(searchTerm.toLowerCase()) || course.course_id.toLowerCase().includes(searchTerm.toLowerCase()) || course.course_owner_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? course.course_state.toString() === statusFilter : true;
    const matchesClass = classFilter ? course.course_grade.toString() === classFilter : true;
    const matchesCategory = categoryFilter ? course.category_id === categoryFilter : true;
    return matchesSearchTerm && matchesStatus && matchesClass && matchesCategory;
  });

  const handleViewCourse = (courseId) => {
    navigate(`/admin/khoa-hoc/${courseId}`);
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
  };

  const handleClassFilterChange = (event) => {
    setClassFilter(event.target.value);
  };

  const handleCategoryFilterChange = (event) => {
    setCategoryFilter(event.target.value);
  };

  const columns = [
    { field: "course_id", headerName: "Mã khóa học", width: 200 },
    {
      field: 'course_img',
      headerName: 'Ảnh khóa học',
      width: 123,
      renderCell: (params) => (
        <img
          src={params.row.course_img || 'default-avatar.png'}
          alt="image"
          style={{ width: 40, height: 40, borderRadius: '50%' }}
        />
      ),
    },
    { field: "course_title", headerName: "Tiêu đề", width: 350 },
    {
      field: "category_id",
      headerName: "Môn",
      width: 200,
      renderCell: (params) => {
        const category = categories.find((cat) => cat.id === params.row.category_id);
        return category ? category.category_title : "Không có môn";
      },
    },
    { field: "course_grade", headerName: "Lớp", width: 80 },
    { field: "course_owner_id", headerName: "Giáo viên", width: 150, renderCell: (params) => getTeacherName(params.row.course_owner_id) },
    {
      field: "course_lock",
      headerName: "Trạng thái",
      width: 150,
      renderCell: (params) => (
        <Badge bg={params.row.course_lock ? "danger" : "success"}>
          {params.row.course_lock ? "Đang ẩn" : "Đang hoạt động"}
        </Badge>
      ),
    },
    {
      field: "course_upload",
      headerName: "Ngày đăng",
      width: 200,
      renderCell: (params) => {
        const upload = params.row.course_upload;
        return upload ? format(upload.toDate(), "dd/MM/yyyy hh:mm:ss") : "-";
      },
    },
    {
      field: "actions",
      headerName: "Thao tác",
      width: 350,
      renderCell: (params) => (
        <div>
          <Button
            variant="outlined"
            color={params.row.course_lock ? "success" : "error"}
            onClick={() => handleToggleCourseState(params.row.id, params.row.course_lock)}
            startIcon={params.row.course_lock ? <LockOpenIcon /> : <LockIcon />}
          >
            {params.row.course_lock ? "Mở khóa" : "Ẩn"}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleViewCourse(params.row.id)}
            style={{ marginLeft: "10px" }}
          >
            Xem Chi Tiết
          </Button>
        </div>
      ),
    },
  ];
  const sendEmail = async () => {
    const serviceID = "service_2v1enie"; 
    const templateID = "template_xt5k4ih";
    const userID = "3L_JhyRcHE13gMQfP"; 

    const templateParams = {
      to_name: courseOwnerName,
      to_email: courseOwnerEmail,
      subject: `Thông báo ${emailContent.includes('mở') ? 'mở khóa khóa học' : 'ẩn khóa học'}`,
      message: emailContent,
    };

    try {
      await emailjs.send(serviceID, templateID, templateParams, userID);
      setOpenEmailModal(false);
      setAlert({
        message: "Email đã được gửi thành công!",
        severity: "success",
      });
    } catch (error) {
      console.error("Failed to send email", error);
      setAlert({
        message: "Gửi email thất bại, vui lòng thử lại!",
        severity: "danger",
      });
    }
  };
  const exportToExcel = (data) => {
    const formattedData = data.map((course) => {
      return {
        ...course,
        course_upload: new Date(course.course_upload.seconds * 1000).toLocaleString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
      };
    });
  
    const worksheet = utils.json_to_sheet(formattedData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "KhoaHoc");
    writeFile(workbook, "DanhSachKhoaHoc.xlsx");
  };
  return (
    <div>
     <AlertPopup alert={alert} setAlert={setAlert} />
      <div style={{ marginBottom: "20px" }}>
        <TextField
          label="Tìm kiếm khóa học"
          variant="outlined"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Grid container spacing={3} style={{ marginBottom: "20px" }}>
        <Grid item xs={3}>
          <FormControl fullWidth>
            <InputLabel>Trạng thái</InputLabel>
            <Select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              label="Trạng thái"
            >
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="true">Đang hoạt động</MenuItem>
              <MenuItem value="false">Đã ẩn</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={3}>
          <FormControl fullWidth>
            <InputLabel>Lớp</InputLabel>
            <Select
              value={classFilter}
              onChange={handleClassFilterChange}
              label="Lớp"
            >
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="10">Lớp 10</MenuItem>
              <MenuItem value="11">Lớp 11</MenuItem>
              <MenuItem value="12">Lớp 12</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={3}>
          <FormControl fullWidth>
            <InputLabel>Môn</InputLabel>
            <Select
              value={categoryFilter}
              onChange={handleCategoryFilterChange}
              label="Môn"
            >
              <MenuItem value="">Tất cả</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.category_title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <div style={{ height: 600, width: "100%" }}>
        <DataGrid
          rows={filteredCourses}
          columns={columns}
          pageSize={5}
          loading={loading}
          disableSelectionOnClick
          rowsPerPageOptions={[5, 10, 25]}
        />
      </div>
      <Modal show={openEmailModal} onHide={()=>setOpenEmailModal(false)} centered size="lg" aria-labelledby="modal-title" aria-describedby="modal-description">
      <Modal.Header closeButton>
        <Modal.Title id="modal-title">Gửi thông báo qua Email</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
        <Form.Group controlId="recipientEmail">
          <Form.Label>Email người nhận</Form.Label>
          <Form.Control
            type="email"
            value={courseOwnerEmail}
            readOnly 
          />
        </Form.Group>
          <Form.Group style={{marginTop:8}} controlId="emailContent">
            <Form.Label>Nội dung</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
              placeholder="Nhập nội dung email"
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={()=>setOpenEmailModal(false)}>
          Hủy
        </Button>
        <Button variant="primary" onClick={sendEmail}>
          Gửi Email
        </Button>
      </Modal.Footer>
    </Modal>
    <Button variant="contained" style={{marginTop:5}} color="secondary" onClick={() => exportToExcel(filteredCourses)}>
        Xuất Excel
      </Button>
    </div>
  );
};

export default CourseManagement;
