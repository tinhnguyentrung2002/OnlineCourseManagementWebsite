import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, query, where, getDocs, addDoc, doc, updateDoc, setDoc } from "firebase/firestore";
import { TextField, Button, Grid, Modal, Box } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { format } from "date-fns";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { writeFile, utils } from "xlsx"; 


const TeacherManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false); 
  const [email, setEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [loadingAdd, setLoadingAdd] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, "Users"), where("user_permission", "==", "2"));
      const querySnapshot = await getDocs(q);

      const usersList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users: ", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return (

      user.user_name.toLowerCase().includes(lowercasedSearchTerm) ||
      user.user_uid.toLowerCase().includes(lowercasedSearchTerm) ||
      user.user_email.toLowerCase().includes(lowercasedSearchTerm)
    );
  });

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddTeacher = async () => {
    if (!email || !userName) {
      alert("Vui lòng điền đầy đủ thông tin!");
      return;
    }

    setLoadingAdd(true);
    try {
      const auth = getAuth();

      const userCredential = await createUserWithEmailAndPassword(auth, email, email); 
      const user = userCredential.user; 

      const teacherRef = doc(db, "Users", user.uid);
    
    await setDoc(teacherRef, {
      user_email: email,
      user_name: userName,
      user_permission: "2",
      user_uid: user.uid,
      user_lastLogin: new Date(),
      user_account_state: "work",
      user_avatar: "", 
      user_about_me: "", 
      user_facebook: "",
      user_youtube: "",
    });

      alert("Thêm giáo viên thành công!");
      setOpen(false);
      setEmail("")
      setUserName("")
    } catch (error) {
      console.error("Lỗi khi thêm giáo viên: ", error);
      alert("Có lỗi xảy ra khi thêm giáo viên.");
    } finally {
      setLoadingAdd(false);
    }
  };

  const handleBanAccount = async (userId) => {
    try {
      const userRef = doc(db, "Users", userId);
      await updateDoc(userRef, {
        user_account_state: "ban",
      });
      console.log("Tài khoản đã bị khóa");
      fetchUsers();
    } catch (error) {
      console.error("Lỗi khi khóa tài khoản: ", error);
    }
  };

  const handleUnbanAccount = async (userId) => {
    try {
      const userRef = doc(db, "Users", userId);
      await updateDoc(userRef, {
        user_account_state: "work",
      });
      console.log("Tài khoản đã được mở khóa");
      fetchUsers();
    } catch (error) {
      console.error("Lỗi khi mở khóa tài khoản: ", error);
    }
  };



  const exportToExcel = (data) => {
    const formattedData = data.map((user) => {
      return {
        ...user,
        user_lastLogin: new Date(user.user_lastLogin.seconds * 1000).toLocaleString('vi-VN', {
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
    utils.book_append_sheet(workbook, worksheet, "GiaoVien");
    writeFile(workbook, "DanhSachGiaoVien.xlsx");
  };

  const columns = [
    { field: "user_avatar", headerName: "Ảnh đại diện", width: 150, renderCell: (params) => (<img src={params.row.user_avatar} alt={params.row.user_name} style={{ width: "40px", height: "40px", borderRadius: "50%" }} />) },
    { field: "user_name", headerName: "Tên người dùng", width: 200 },
    { field: "user_email", headerName: "Email", width: 300 },
    { field: "user_uid", headerName: "UID", width: 350 },
    { field: "user_lastLogin", headerName: "Lần đăng nhập cuối", width: 180, renderCell: (params) => { const lastLoginTimestamp = params.row.user_lastLogin; return lastLoginTimestamp ? format(lastLoginTimestamp.toDate(), "dd/MM/yyyy hh:mm:ss") : "-"; } },
    { field: "actions", headerName: "Hành động", width: 200, renderCell: (params) => { const isBanned = params.row.user_account_state === "ban"; return (<Button variant="contained" color={isBanned ? "primary" : "error"} onClick={() => isBanned ? handleUnbanAccount(params.row.id) : handleBanAccount(params.row.id)}>{isBanned ? "Mở khóa tài khoản" : "Khóa tài khoản"}</Button>); } },
  ];

  return (
    <div>
      <Modal open={open} onClose={() => setOpen(false)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
          }}
        >
          <h2>Thêm giáo viên mới</h2>
          <TextField
            label="Email"
            variant="outlined"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ marginBottom: "20px" }}
          />
          <TextField
            label="Tên người dùng"
            variant="outlined"
            fullWidth
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            style={{ marginBottom: "20px" }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleAddTeacher}
            disabled={loadingAdd}
          >
            {loadingAdd ? "Đang thêm..." : "Thêm giáo viên"}
          </Button>
        </Box>
      </Modal>

          <div>
          <TextField label="Tìm kiếm người dùng" variant="outlined" fullWidth value={searchTerm} onChange={handleSearchChange} style={{ marginBottom: "20px", marginRight:"20px", width:500 }} />
        <Button variant="contained" style={{height:55}} color="primary" onClick={() => setOpen(true)}>
            Thêm giáo viên
        </Button>
          </div>
     
      <div style={{ height: 600, width: "100%" }}>
        <DataGrid rows={filteredUsers} columns={columns} pageSize={5} loading={loading} disableSelectionOnClick rowsPerPageOptions={[5, 10, 25]} />
      </div>

      <Button variant="contained" style={{marginTop:5}} color="secondary" onClick={() => exportToExcel(filteredUsers)}>
        Xuất Excel
      </Button>
    </div>
  );
};

export default TeacherManagement;
