import React, { useState, useEffect } from "react";
import { db } from "../../firebase"; 
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { TextField, Button, Grid } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { format } from "date-fns";
import { writeFile, utils } from "xlsx"; 
const StudentManagement = () => {
  const [users, setUsers] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(""); 

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, "Users"), where("user_permission", "==", "1"));
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
  const columns = [
    {
      field: "user_avatar",
      headerName: "Ảnh đại diện",
      width: 100,
      renderCell: (params) => (
        <img
          src={params.row.user_avatar}
          alt={params.row.user_name}
          style={{ width: "40px", height: "40px", borderRadius: "50%" }}
        />
      ),
    },
    { field: "user_name", headerName: "Tên người dùng", width: 200 },
    { field: "user_email", headerName: "Email", width: 250 },
    { field: "user_uid", headerName: "UID", width: 250 },
    { field: "user_points", headerName: "Điểm", width: 100 },
    {
        field: "user_lastLogin",
        headerName: "Lần đăng nhập cuối",
        width: 150,
        renderCell: (params) => {
          const lastLoginTimestamp = params.row.user_lastLogin;
          return lastLoginTimestamp ? format(lastLoginTimestamp.toDate(), "dd/MM/yyyy hh:mm:ss") : "-";
        },
      },
      {
        field: "user_streakLogin",
        headerName: "Chuỗi đăng nhập",
        width: 100,
        renderCell: (params) => {
          return params.row.user_streakLogin || "-";
        },
      },
    {
        field: "actions",
        headerName: "Hành động",
        width: 200,
        renderCell: (params) => {
          const isBanned = params.row.user_account_state === "ban";
          return (
            <Button
              variant="contained"
              color={isBanned ? "primary" : "error"}
              onClick={() =>
                isBanned
                  ? handleUnbanAccount(params.row.id)
                  : handleBanAccount(params.row.id)
              }
            >
              {isBanned ? "Mở khóa tài khoản" : "Khóa tài khoản"}
            </Button>
          );
        },
      },
  ];
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
    utils.book_append_sheet(workbook, worksheet, "HocSinh");
    writeFile(workbook, "DanhSachHocSinh.xlsx");
  };
  return (
    <div>
      <TextField
        label="Tìm kiếm người dùng"
        variant="outlined"
        fullWidth
        value={searchTerm}
        onChange={handleSearchChange}
        style={{ marginBottom: "20px" }}
      />

      <div style={{ height: 600, width: "100%" }}>
        <DataGrid
          rows={filteredUsers} 
          columns={columns} 
          pageSize={5} 
          loading={loading} 
          disableSelectionOnClick 
          rowsPerPageOptions={[5, 10, 25]}
        />
      </div>
      <Button variant="contained" style={{marginTop:5}} color="secondary" onClick={() => exportToExcel(filteredUsers)}>
        Xuất Excel
      </Button>
    </div>
  );
};

export default StudentManagement;
