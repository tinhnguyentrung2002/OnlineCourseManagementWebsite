import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, query, getDocs, doc, getDoc } from "firebase/firestore";
import { DataGrid } from "@mui/x-data-grid";
import { Button, TextField, MenuItem, Select, FormControl, InputLabel, Modal, Box, Typography, Grid, Divider } from "@mui/material";
import ZaloPayIcon from "../../assets/icon_zalo_square.png";
import GooglePayIcon from "../../assets/google_pay_icon.png";
import PointsIcon from "../../assets/points_icon.png";
import { Badge } from "react-bootstrap";
import { format } from "date-fns";
import { writeFile, utils } from "xlsx"; 

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [courseDetails, setCourseDetails] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const ordersRef = collection(db, "Orders");
      const ordersQuery = query(ordersRef);

      const querySnapshot = await getDocs(ordersQuery);

      const ordersData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setOrders(ordersData);
    } catch (error) {
      console.error("Error fetching orders: ", error);
    } finally {
      setLoading(false);
    }
  };


  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
  };

  const handlePaymentFilterChange = (event) => {
    setPaymentFilter(event.target.value);
  };

  const columns = [
    { field: "order_id", headerName: "Mã Đơn Hàng", width: 200 },
    { field: "order_item_id", headerName: "Mã Khóa Học", width: 200 },
    { field: "order_payer_id", headerName: "Mã Người Dùng", width: 300 },
    { field: "order_amount", headerName: "Số Tiền", width: 150, renderCell: (params) => `${params.row.order_amount.toLocaleString()} VND` },
    { 
        field: "order_date", 
        headerName: "Ngày Đặt Hàng", 
        width: 200, 
        renderCell: (params) => {
          const date = new Date(params.row.order_date.seconds * 1000);
          return format(date, 'dd/MM/yyyy HH:mm:ss');
        }
      },
    { field: "order_pay_method", headerName: "Phương Thức Thanh Toán", width: 230 ,renderCell: (params) => getPaymentIcon(params.row.order_pay_method) },
    {
        field: "order_status", 
        headerName: "Trạng Thái", 
        width: 150,
        renderCell: (params) => (
          <Badge bg={params.row.order_status === 1 ? "success" : "danger"}>   {params.row.order_status === 1 ? "Thành Công" : "Thất Bại"}</Badge>    
        ),
      },
  ];

  useEffect(() => {
    fetchOrders();
  }, []);

  const getPaymentIcon = (payMethod) => {
    if (payMethod === "ZaloPay") {
      return <img src={ZaloPayIcon} alt="ZaloPay" style={{ width: 30, height: 30 }} />;
    }
    if (payMethod === "GooglePay") {
      return <img src={GooglePayIcon} alt="GooglePay" style={{ width: 30, height: 30 }} />;
    }
    if (payMethod === "Points") {
      return <img src={PointsIcon} alt="Points" style={{ width: 30, height: 30 }} />;
    }
    return null;
  };

  const filteredOrders = orders.filter((order) => {
    const matchSearchTerm = order.order_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter ? order.order_status === parseInt(statusFilter) : true;
    const matchPaymentMethod = paymentFilter ? order.order_pay_method === paymentFilter : true;

    return matchSearchTerm && matchStatus && matchPaymentMethod;
  });
  const exportToExcel = (data) => {
    const formattedData = data.map((order) => {
      return {
        ...order,
        order_date: new Date(order.order_date.seconds * 1000).toLocaleString('vi-VN', {
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
    utils.book_append_sheet(workbook, worksheet, "HoaDon");
    writeFile(workbook, "DanhSachHoaDon.xlsx");
  };
  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <TextField
          label="Tìm Kiếm Theo Mã Đơn Hàng"
          variant="outlined"
          fullWidth
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </div>

      <Grid container spacing={3} style={{ marginBottom: "20px" }}>
        <Grid item xs={12} sm={6} md={4}>
          <FormControl fullWidth variant="outlined">
            <InputLabel>Trạng Thái Lọc</InputLabel>
            <Select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              label="Trạng Thái Lọc"
            >
              <MenuItem value="">Tất Cả</MenuItem>
              <MenuItem value="1">Thành Công</MenuItem>
              <MenuItem value="0">Thất Bại</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <FormControl fullWidth variant="outlined">
            <InputLabel>Phương Thức Thanh Toán</InputLabel>
            <Select
              value={paymentFilter}
              onChange={handlePaymentFilterChange}
              label="Phương Thức Thanh Toán"
            >
              <MenuItem value="">Tất Cả</MenuItem>
              <MenuItem value="ZaloPay">ZaloPay</MenuItem>
              <MenuItem value="GooglePay">GooglePay</MenuItem>
              <MenuItem value="Points">Điểm</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <div style={{ height: 600, width: "100%" }}> 
        <DataGrid
          rows={filteredOrders}
          columns={columns}
          pageSize={5}
          loading={loading}
          disableSelectionOnClick
          rowsPerPageOptions={[5, 10, 25]}
        />
      </div>
      <Button variant="contained" style={{marginTop:5}} color="secondary" onClick={() => exportToExcel(filteredOrders)}>
        Xuất Excel
      </Button>
    </div>
  );
};

export default OrderManagement;
