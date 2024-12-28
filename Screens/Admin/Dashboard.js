import React, { useEffect, useState, useRef } from "react";
import { Bar, Pie } from 'react-chartjs-2';
import { db } from '../../firebase.js';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Legend, BarElement , ArcElement, Tooltip } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Select, MenuItem, InputLabel, FormControl, CircularProgress, Box, Grid } from '@mui/material';
import { useUser } from "../../context/UserContext";
import {
  Button,
  Card,
  Container,  
  Row,
  Col,
  Spinner,
  Badge
} from "react-bootstrap";
import { DataGrid } from "@mui/x-data-grid";
import {collection, query, where, getDocs, getCountFromServer } from "firebase/firestore";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';    
import { format } from "date-fns";

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Legend, BarElement, ArcElement, Tooltip, ChartDataLabels);

function Dashboard() {
  const uid = useUser();
  const colors = ['#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF'];
  const [totalCourse, setTotalCourse] = useState(0);
  const [totalStudent, setTotalStudent] = useState(0);
  const [totalTeacher, setTotalTeacher] = useState(0);
  const [avgRate, setAvgRate] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [barChartData, setBarChartData] = useState({
    labels: [],
    datasets: [],
  });
  const [pricePieData, setPricePieData] = useState({ labels: [], datasets: [] });
  const [typePieData, setTypePieData] = useState({ labels: [], datasets: [] });
  const [classAndCoursePieData, setClassAndCoursePieData] = useState({ labels: [], datasets: [] });
  const [highlightIndexPie, setHighlightIndexPie] = useState(null);
  const [highlightIndexPie1, setHighlightIndexPie1] = useState(null);
  const [highlightIndexPie2, setHighlightIndexPie2] = useState(null);
  const [highlightIndexBar, setHoverIndexBar] = useState(null);
  const [sortOption, setSortOption] = useState('members');
  const [pieSortOption, setPieSortOption] = useState('subjects');
  const [courseLimit, setCourseLimit] = useState(5);
  const [loading, setLoading] = useState(false);
  const [isExport, setExportState] = useState(false);
  const chartRef = useRef(null);
  const cardRef = useRef(null);
  const pieRef = useRef(null);
  const pieRef1 = useRef(null);
  const pieRef2 = useRef(null);
  const [requests, setRequests] = useState([]);
  const base64String = "data:font/ttf;base64,...";

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  useEffect(() => {
    fetchCourses();
    fetchData();
    fetchPricePieChartData();
    fetchClassAndCoursePieChartData();
    fetchTypePieChartData();
    fetchRequests();
  }, [uid, sortOption, courseLimit, pieSortOption]);
  const fetchRequests = async () => {
    try {

      const requestsRef = collection(db, "Requests");
      const q = query(requestsRef, where("request_state", "==", "pending"));
  
      const querySnapshot = await getDocs(q);
  
      setRequests(
        querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    } catch (error) {
      console.error("Error fetching requests: ", error);
    } finally {

    }
  };
  const fetchData = async () => {
    // const avgRateQuery = query(collection(db, "Courses"), where("course_type", "==", "course"));
    // getDocs(avgRateQuery).then(snapshot => {
    //   let totalRate = 0;
    //   let count = 0;
    //   snapshot.forEach(doc => {
    //     totalRate += doc.data().course_rate || 0;
    //     count++;
    //   });
    //   const averageRate = count ? totalRate / count : 0;
    //   setAvgRate(parseFloat(averageRate.toFixed(2)));
    // }).catch(error => console.error("Lỗi khi thống kê: ", error));

    try {
      
      const totalStudentQuery = query(collection(db, "Users"), where("user_permission", "==", "1"));
      const snapshot = await getDocs(totalStudentQuery);
      

      const totalMembers = snapshot.size;  
  
      setTotalStudent(totalMembers);  
    } catch (error) {
      console.error("Lỗi khi thống kê số học viên: ", error);
    }
    try {
      
      const totalStudentQuery = query(collection(db, "Users"), where("user_permission", "==", "2"));
      const snapshot = await getDocs(totalStudentQuery);
      

      const totalMembers1 = snapshot.size;  
  
      setTotalTeacher(totalMembers1);  
    } catch (error) {
      console.error("Lỗi khi thống kê số học viên: ", error);
    }
    const totalCourseQuery = query(collection(db, "Courses"));
    getCountFromServer(totalCourseQuery).then(countSnapshot => {
      setTotalCourse(countSnapshot.data().count);
    }).catch(error => console.error("Lỗi khi thống kê: ", error));

    const revenueQuery = query(collection(db, "Courses"), where("course_type", "==", "course"));
    getDocs(revenueQuery).then(querySnapshot => {
      let totalRevenue = 0;
      querySnapshot.forEach(doc => {
        const data = doc.data();
        const coursePrice = data.course_price || 0;
        const courseMembers = data.course_member || 0;
        totalRevenue += coursePrice * courseMembers * 0.2;
      });
      setRevenue(formatCurrency(totalRevenue));
    }).catch(error => console.error("Lỗi khi tính doanh thu: ", error));

  
  };
  const fetchCourses = async () => {
    try {
      const coursesCollection = collection(db, 'Courses');
      const coursesQuery = query(coursesCollection);
      const coursesSnapshot = await getDocs(coursesQuery);
      const courses = coursesSnapshot.docs.map(doc => doc.data());
      let sortedCourses = [...courses];
  
      if (sortOption === 'profit') {
        sortedCourses.sort((a, b) => {
          const aProfit = a.course_type === 'course' 
            ? (a.course_price * a.course_member * 0.8) 
            : 0;
          const bProfit = b.course_type === 'course' 
            ? (b.course_price * b.course_member * 0.8) 
            : 0;
          return aProfit - bProfit;
        });
      } else if (sortOption === 'profit_desc') {
        sortedCourses.sort((a, b) => {
          const aProfit = a.course_type === 'course' 
            ? (a.course_price * a.course_member * 0.8) 
            : 0;
          const bProfit = b.course_type === 'course' 
            ? (b.course_price * b.course_member * 0.8) 
            : 0;
          return bProfit - aProfit;
        });
      } else if (sortOption === 'members') {
        sortedCourses.sort((a, b) => {
          const aMembers = a.course_type === 'course' 
            ? a.course_member 
            : (a.course_member ? a.course_member.length : 0); 
          const bMembers = b.course_type === 'course' 
            ? b.course_member 
            : (b.course_member ? b.course_member.length : 0);
          return aMembers - bMembers;
        });
      } else if (sortOption === 'members_desc') {
        sortedCourses.sort((a, b) => {
          const aMembers = a.course_type === 'course' 
            ? a.course_member 
            : (a.course_member ? a.course_member.length : 0);
          const bMembers = b.course_type === 'course' 
            ? b.course_member 
            : (b.course_member ? b.course_member.length : 0);
          return bMembers - aMembers;
        });
      } else if (sortOption === 'rate') {
        sortedCourses.sort((a, b) => {
          const aRate = a.course_type === 'course' ? a.course_rate : 0;
          const bRate = b.course_type === 'course' ? b.course_rate : 0;
          return aRate - bRate;
        });
      } else if (sortOption === 'rate_desc') {
        sortedCourses.sort((a, b) => {
          const aRate = a.course_type === 'course' ? a.course_rate : 0;
          const bRate = b.course_type === 'course' ? b.course_rate : 0;
          return bRate - aRate;
        });
      }
  
      const limitedCourses = sortedCourses.slice(0, courseLimit);
  
      if (limitedCourses.length > 0) {
        const courseNames = limitedCourses.map(course => course.course_title);
        const courseRates = limitedCourses.map(course => course.course_type === 'course' ? course.course_rate : 0);
        const courseMembers = limitedCourses.map(course => course.course_type === 'course' ? course.course_member : (course.course_member ? course.course_member.length : 0)); // Nếu "class", tính bằng size của mảng
        const coursePrices = limitedCourses.map(course => course.course_type === 'course' ? course.course_price : 0);
        const profits = coursePrices.map((price, index) => coursePrices[index] * courseMembers[index] * 0.8);
        
        setBarChartData({
          labels: courseNames.map(name => shortenCourseName(name, 30)),
          datasets: [
            { label: 'Đánh giá', data: courseRates, backgroundColor: 'rgba(75, 192, 192, 0.2)' },
            { label: 'Học viên', data: courseMembers, backgroundColor: 'rgba(255, 99, 132, 0.2)' },
            { label: 'Lợi nhuận', data: profits, backgroundColor: 'rgba(153, 102, 255, 0.2)' },
          ],
        });
      } else {
        setBarChartData({ labels: [], datasets: [] });
      }
    } catch (error) {
      console.error("Lỗi dữ liệu: ", error);
    }
  };
  

  const fetchPricePieChartData = async () => {
    const coursesRef = collection(db, 'Courses');
    const q = query(coursesRef);
    const querySnapshot = await getDocs(q);

    let freeCount = 0;
    let paidCount = 0;

    querySnapshot.forEach((doc) => {
      const course = doc.data();
      if (course.course_price === 0) {
        freeCount++;
      } else {
        paidCount++;
      }
    });

    setPricePieData({
      labels: ['Miễn phí', 'Có phí'],

      datasets: [{
        data: [freeCount, paidCount],
        backgroundColor: colors,
        hoverBackgroundColor: colors.map(color => darkenColor(color, 20)), 
      }],
    });
  };
  const fetchClassAndCoursePieChartData = async () => {
    const coursesRef = collection(db, 'Courses');
    const q = query(coursesRef);
    const querySnapshot = await getDocs(q);

    let classCount = 0;
    let courseCount = 0;

    querySnapshot.forEach((doc) => {
      const course = doc.data();
      if (course.course_type=== "course") {
        courseCount++;
      } else {
        classCount++;
      }
    });

    setClassAndCoursePieData({
      labels: ['Khóa học', 'Lớp học'],

      datasets: [{
        data: [courseCount,classCount],
        backgroundColor: colors,
        hoverBackgroundColor: colors.map(color => darkenColor(color, 20)), 
      }],
    });
  };
  const fetchTypePieChartData = async () => {
    const coursesQuery = query(collection(db, 'Courses'));
    const coursesSnapshot = await getDocs(coursesQuery);
    const courseIds = coursesSnapshot.docs.map(doc => doc.id);

    const categoriesSnapshot = await getDocs(collection(db, 'Categories'));
    const gradeIds = ['grade10', 'grade11', 'grade12']; 
    const categoryMap = {}; 
    const gradeMap = {}; 
    
    categoriesSnapshot.forEach(doc => {
        const data = doc.data();
        if (gradeIds.includes(data.category_id)) {
            gradeMap[data.category_id] = data.category_title; 
        } else {
            categoryMap[data.category_id] = data.category_title; 
        }
    });

    const gradeCount = {};
    const subjectCount = {};
    for (const courseId of courseIds) {
        const typeSnapshot = await getDocs(collection(db, 'Courses', courseId, 'Type'));
        typeSnapshot.forEach(doc => {
            const data = doc.data();
         
            if (data.category_child_id === "") {
           
                if (gradeIds.includes(data.category_id)) {               
                    gradeCount[data.category_id] = (gradeCount[data.category_id] || 0) + 1;
                } else {
                    subjectCount[data.category_id] = (subjectCount[data.category_id] || 0) + 1;
                }
            }
        });
    }
    const labels = pieSortOption === 'grades' 
        ? Object.keys(gradeCount).map(id => gradeMap[id])
        : Object.keys(subjectCount).map(id => categoryMap[id]);
    
    const data = pieSortOption === 'grades' 
        ? Object.values(gradeCount) 
        : Object.values(subjectCount);

    setTypePieData({
        labels: labels,
        datasets: [{
            label: 'Số lượng',
            data: data,
            backgroundColor: colors,
            hoverBackgroundColor: colors.map(color => darkenColor(color, 20)),
        }],
    });
  };
  const refreshData = () => {
    setLoading(true);
    setTimeout(() => {
      fetchCourses();
      fetchData();
      fetchPricePieChartData();
      fetchClassAndCoursePieChartData();
      fetchTypePieChartData();
      fetchRequests();
      setLoading(false);
    }, 1000);
  };
 
  const exportToPDF = () => {
    setExportState(true);
    const doc = new jsPDF({});
    const now = new Date();
  
    doc.addFileToVFS('TimesNewRoman.ttf', base64String);
    doc.addFont('TimesNewRoman.ttf', 'TimesNewRoman', 'normal');
    doc.setFont('TimesNewRoman');
  
  
    const formattedDate = now.toISOString().slice(0, 10).replace(/-/g, '_');
    const formattedTime = now.toTimeString().slice(0, 8).replace(/:/g, '_');
    const fileName = `ThongKe_Admin_(${formattedDate})(${formattedTime}).pdf`;
  
    setTimeout(async () => {
      doc.setFontSize(20);
      doc.setFont('TimesNewRoman', 'bold');
      doc.text('Statistical Report - Role: Admin', 60, 30);
      doc.setFontSize(10);
      doc.setFont('TimesNewRoman', 'normal');
      doc.setTextColor(150);
      doc.text(`${now.toLocaleString()}`, 85, 40);
      doc.setFontSize(10);
      doc.setFont('TimesNewRoman', 'normal');
      doc.setTextColor(150);
      const usersQuery = query(collection(db, 'Users'));
      const usersSnapshot = await getDocs(usersQuery);
      if (!usersSnapshot.empty) {
        const userData = usersSnapshot.docs[0].data();
        const userName = userData.user_name;
      doc.text(`Admin: ` + userName , 90, 50);}else{  doc.text(`Admin: Unknown ` , 90, 50);}
  
      const exportChart = (ref, xOffset ,yOffset, w, h) => {
        return new Promise((resolve, reject) => {
          if (ref.current) {
            html2canvas(ref.current).then(canvas => {
              const imgData = canvas.toDataURL('image/png');
              doc.addImage(imgData, 'PNG', xOffset, yOffset, w, h);
              resolve();
            }).catch(reject);
          } else {
            console.error("Lỗi khi xuất file.");
            alert("Không thể xuất biểu đồ. Vui lòng thử lại sau.");
            reject(new Error("Ref không hợp lệ"));
          }
        });
      };
      const wait = (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms));
      };
      Promise.all([
        exportChart(cardRef, 5 ,60, 200, 30), 
        exportChart(chartRef,5 ,90, 200, 60),
        exportChart(pieRef2, 5 ,156, 60, 50),
        exportChart(pieRef, 75 ,156, 60, 50),
      ])
      .then(() => {
        setPieSortOption('subjects');
        return wait(100).then(() => exportChart(pieRef1, 145, 156, 60, 50));
      })
      .then(() => {
        setPieSortOption('grades');
        return wait(100).then(() => exportChart(pieRef1, 5, 212, 60, 50));
       
      })
      .then(() => {
        doc.save(fileName);
      })
      .catch(error => {
        console.error("Lỗi khi xuất file: ", error);
      })
      .finally(() => {
        setExportState(false);
        setPieSortOption('subjects');
      });
    }, 1000);
  };
  
  

  const shortenCourseName = (name, maxLength) => {
    return name.length > maxLength ? name.slice(0, maxLength) + '...' : name;
  };
  const handleHoverPieChart = (event) => {
    const activePoints = event.chart.getElementsAtEventForMode(event.native, 'nearest', { intersect: true }, false);
    if (activePoints.length) {
      const index = activePoints[0].index;
      setHighlightIndexPie(index);
    } else {
      setHighlightIndexPie(null);
    }
  };
  const handleClassAndCoursePieChart = (event) => {
    const activePoints = event.chart.getElementsAtEventForMode(event.native, 'nearest', { intersect: true }, false);
    if (activePoints.length) {
      const index = activePoints[0].index;
      setHighlightIndexPie2(index);
    } else {
      setHighlightIndexPie2(null);
    }
  };
  const handleHoverTypePieChart = (event) => {
    const activePoints = event.chart.getElementsAtEventForMode(event.native, 'nearest', { intersect: true }, false);
    if (activePoints.length) {
      const index = activePoints[0].index;
      setHighlightIndexPie1(index);
    } else {
      setHighlightIndexPie1(null);
    }
  };
  const handleHoverBarChart = (event) => {
    const chart = event.chart;
    const activePoints = chart.getElementsAtEventForMode(event.native, 'nearest', { intersect: true }, false);
    if (activePoints.length) {
      setHoverIndexBar(activePoints[0].datasetIndex);
    } else {
      setHoverIndexBar(null); 
    }
  };

  const darkenColor = (color, percent) => {
    const num = parseInt(color.slice(1), 16),
      amt = Math.round(2.55 * percent),
      R = (num >> 16) + amt,
      G = (num >> 8 & 0x00FF) + amt,
      B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 + (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 + (B < 255 ? (B < 1 ? 0 : B) : 255)).toString(16).slice(1);
  };
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
  ];

  return (
    <>
   <Container fluid>
   <Box sx={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '20px' }}>
          <Button style={{marginRight:'10px'}}
            onClick={refreshData}
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin" style={{ marginRight: '10px' }}></i>
                Đang làm mới
              </>
            ) : (
              <>
                <i className="fas fa-sync-alt" style={{ marginRight: '10px' }}></i>
                Làm mới
              </>
            )}
          </Button>

          <Button
            onClick={exportToPDF}
            disabled={isExport}         
          >
             {isExport ? (
              <>
                <i className="fas fa-spinner fa-spin" style={{ marginRight: '10px' }}></i>
                Đang xuất file
                
              </>
            ) : (
              <>
                <i className="fas fa-sync-alt" style={{ marginRight: '10px' }}></i>
                Xuất PDF
              </>
            )}
          </Button>
        </Box>
        <Row ref={cardRef}>
       
          <Col lg="3" sm="6">
            <Card className="card-stats">
              <Card.Body>
                <Row className="align-items-center" style={{ height: 123 }}>
                  <Col xs="5">
                    <div className="icon-big text-center icon-warning">
                      <i className="fa-solid fa-book text-primary"></i>
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Khóa học</p>
                      <Card.Title as="h4">{totalCourse}</Card.Title>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
          <Col lg="3" sm="6">
            <Card className="card-stats">
              <Card.Body>
                <Row className="align-items-center" style={{ height: 123 }}>
                  <Col xs="5">
                    <div className="icon-big text-center icon-warning">
                      <i className="fa-solid fa-dollar-sign text-success"></i>
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Lợi nhuận</p>
                      <Card.Title as="h4">{revenue}</Card.Title>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
          <Col lg="3" sm="6">
            <Card className="card-stats">
              <Card.Body>
                <Row className="align-items-center" style={{ height: 123 }}>
                  <Col xs="5">
                    <div className="icon-big text-center icon-warning">
                      <i className="fa-solid fa-user-group text-danger"></i>
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Người học</p>
                      <Card.Title as="h4">{totalStudent}</Card.Title>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
          <Col lg="3" sm="6">
            <Card className="card-stats">
              <Card.Body>
                <Row className="align-items-center" style={{ height: 123 }}>
                  <Col xs="5">
                    <div className="icon-big text-center icon-warning">
                      <i className="fa-solid fa-user-group text-danger"></i>
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Giáo viên</p>
                      <Card.Title as="h4">{totalTeacher}</Card.Title>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        <Row>
          <Col md="12">
            <Card ref={chartRef}>
              <Card.Header>
                <h4 className="card-title">Biểu đồ thống kê số liệu khóa học</h4>
              </Card.Header>
              <Card.Body className="mt-3">
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Số lượng khóa học hiển thị</InputLabel>
                      <Select
                        style={{height:40}}
                        value={courseLimit}
                        onChange={(e) => setCourseLimit(Number(e.target.value))}
                        label="Số lượng khóa học hiển thị"
                      >
                        <MenuItem value={5}>5</MenuItem>
                        <MenuItem value={10}>10</MenuItem>
                        <MenuItem value={15}>15</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Sắp xếp theo</InputLabel>
                      <Select
                        style={{height:40}}
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                        label="Sắp xếp theo">
                        <MenuItem value="profit">Lợi nhuận (tăng dần)</MenuItem>
                        <MenuItem value="profit_desc">Lợi nhuận (giảm dần)</MenuItem>
                        <MenuItem value="members">Số học viên (tăng dần)</MenuItem>
                        <MenuItem value="members_desc">Số học viên (giảm dần)</MenuItem>
                        <MenuItem value="rate">Đánh giá (tăng dần)</MenuItem>
                        <MenuItem value="rate_desc">Đánh giá (giảm dần)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                {loading ? (
                  <Box sx={{ textAlign: 'center', marginTop: '20px' }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <Box sx={{ height: '238px', width: '100%', marginTop: 3,overflow: 'hidden' }}>
                    {barChartData && barChartData.labels && barChartData.labels.length > 0 ? (
                      <Bar
                        data={barChartData}
                        options={{
                          onHover: handleHoverBarChart,
                          responsive: true,
                          maintainAspectRatio: false,
                    
                          plugins: {
                            legend: { position: 'top' },
                            title: { display: true, text: 'Thống kê khóa học' },
                            tooltip: {
                              callbacks: {
                                label: (tooltipItem) => {
                                  const datasetLabel = tooltipItem.dataset.label || '';
                                  const value = tooltipItem.raw;
                      
                                  if (datasetLabel === 'Lợi nhuận') {
                                    return `${datasetLabel}: ${formatCurrency(value)}`;
                                  }
                                  return `${datasetLabel}: ${value}`;
                                }
                              }
                            }
                          },
                        }}
                      />
                    ) : (
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <CircularProgress />
                      </Box>
                    )}
                  </Box>
                )}
              </Card.Body>
              <Card.Footer>        
              </Card.Footer>
          </Card>
          </Col>
        </Row>
        <Row>
        <Col md="4">
            <Card ref={pieRef2}>
              <Card.Header>
                <h4 className="card-title">Thống kê lớp học và khóa học</h4>
              </Card.Header>
              <Card.Body  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '311px' }}>  
              {loading ? (
                  <Box sx={{ textAlign: 'center', marginTop: '20px' }}>
                    <CircularProgress />
                  </Box>
                ) : (       
                  <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '250px', width: '100%', marginTop: 3,overflow: 'hidden' }}>
                     {classAndCoursePieData && classAndCoursePieData.labels && classAndCoursePieData.labels.length > 0 ? (
              <Pie 
                data={{
                  labels: classAndCoursePieData.labels,
                  datasets: [{
                    data: classAndCoursePieData.datasets[0]?.data,
                    backgroundColor: classAndCoursePieData.datasets[0]?.backgroundColor,

                    borderColor: highlightIndexPie2 !== null ? colors[highlightIndexPie2] : colors,
                    hoverBackgroundColor: classAndCoursePieData.datasets[0]?.hoverBackgroundColor,
                    borderWidth: classAndCoursePieData.labels.map((_, index) => (highlightIndexPie2 === index ? 4 : 0)),
          
                  }],
                }} 
                options={{
                  onHover: handleClassAndCoursePieChart,
                  plugins: {
                    tooltip: {
                      callbacks: {
                        label: (tooltipItem) => {
                          const label = tooltipItem.label;
                          const value = tooltipItem.raw;
                          const total = tooltipItem.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = ((value / total) * 100).toFixed(2);
                          return ` ${label}: ${value} (${percentage}%)`;
                        }
                      }
                    },
                    datalabels: {
                      display: true,
                      anchor: 'center',
                      align: 'center',
                      formatter: (value, context) => {
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(2);
                        if(percentage !== 0)
                        return `${percentage} %`;
                      else return ""
                      },
                      color: '#fff',
                      font: {
                        weight: 'bold',
                      },
                    }
                    
                  }
                }} 
                
              />
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            )}
              </Box>
               )}
              </Card.Body>
            </Card>
          </Col>
          <Col md="4">
            <Card ref={pieRef}>
              <Card.Header>
                <h4 className="card-title">Thống kê khóa học theo phí</h4>
              </Card.Header>
              <Card.Body  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '311px' }}>  
              {loading ? (
                  <Box sx={{ textAlign: 'center', marginTop: '20px' }}>
                    <CircularProgress />
                  </Box>
                ) : (       
                  <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '250px', width: '100%', marginTop: 3,overflow: 'hidden' }}>
                     {pricePieData && pricePieData.labels && pricePieData.labels.length > 0 ? (
              <Pie 
                data={{
                  labels: pricePieData.labels,
                  datasets: [{
                    data: pricePieData.datasets[0]?.data,
                    backgroundColor: pricePieData.datasets[0]?.backgroundColor,

                    borderColor: highlightIndexPie !== null ? colors[highlightIndexPie] : colors,
                    hoverBackgroundColor: pricePieData.datasets[0]?.hoverBackgroundColor,
                    borderWidth: pricePieData.labels.map((_, index) => (highlightIndexPie === index ? 4 : 0)),
          
                  }],
                }} 
                options={{
                  onHover: handleHoverPieChart,
                  plugins: {
                    tooltip: {
                      callbacks: {
                        label: (tooltipItem) => {
                          const label = tooltipItem.label;
                          const value = tooltipItem.raw;
                          const total = tooltipItem.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = ((value / total) * 100).toFixed(2);
                          return ` ${label}: ${value} (${percentage}%)`;
                        }
                      }
                    },
                    datalabels: {
                      display: true,
                      anchor: 'center',
                      align: 'center',
                      formatter: (value, context) => {
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(2);
                        if(percentage !== 0)
                        return `${percentage} %`;
                      else return ""
                      },
                      color: '#fff',
                      font: {
                        weight: 'bold',
                      },
                    }
                    
                  }
                }} 
                
              />
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            )}
              </Box>
               )}
              </Card.Body>
            </Card>
          </Col>
          <Col md="4">
            <Card ref={pieRef1}>
              <Card.Header>
                <div className="d-flex justify-content-between align-items-center">
                  {pieSortOption === "subjects" ?   <h4 className="card-title mb-0">Thống kê theo môn</h4> :  pieSortOption === "grades" ? <h4 className="card-title mb-0">Thống kê theo lớp</h4> :  <h4 className="card-title mb-0">Thống kê theo cấp độ</h4>}
                  <FormControl style={{ width: "150px"}}>
                    <InputLabel id="course-type-label">Chọn thể loại thống kê</InputLabel>
                    <Select
                      style={{height:40}}
                      value={pieSortOption}
                      labelId="course-type-label"
                      onChange={(e) => setPieSortOption(e.target.value)}
                      label="Thống kê theo thể loại"
                    >
                      <MenuItem value={"subjects"}>Môn học</MenuItem>
                      <MenuItem value={"grades"}>Lớp</MenuItem>
                    </Select>
                  </FormControl>
                </div>
              </Card.Header>
              <Card.Body  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
              {loading ? (
                  <Box sx={{ textAlign: 'center', marginTop: '20px' }}>
                    <CircularProgress />
                  </Box>
                ) : (       
                  <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '250px', width: '100%', marginTop:1, overflow: 'hidden' }}>
                     {typePieData && typePieData.labels && typePieData.labels.length > 0 ? (         
              <Pie 
                data={{
                  labels: typePieData.labels,
                  datasets: [{
                    data: typePieData.datasets[0]?.data,
                    backgroundColor: typePieData.datasets[0]?.backgroundColor,

                    borderColor: highlightIndexPie1 !== null ? colors[highlightIndexPie1] : colors,
                    hoverBackgroundColor: typePieData.datasets[0]?.hoverBackgroundColor,
                    borderWidth: typePieData.labels.map((_, index) => (highlightIndexPie1 === index ? 4 : 0)),
          
                  }],
                }} 
                options={{
                  onHover: handleHoverTypePieChart,
                  plugins: {
                    tooltip: {
                      callbacks: {
                        label: (tooltipItem) => {
                          const label = tooltipItem.label;
                          const value = tooltipItem.raw;
                          const total = tooltipItem.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = ((value / total) * 100).toFixed(2);
                          return ` ${label}: ${value} (${percentage}%)`;
                        }
                      }
                    },
                    datalabels: {
                      display: true,
                      anchor: 'center',
                      align: 'center',
                      formatter: (value, context) => {
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(2);
                        if(percentage !== 0)
                        return `${percentage} %`;
                      else return ""
                      },
                      color: '#fff',
                      font: {
                        weight: 'bold',
                      },
                    }
                    
                  }
                }} 
              />
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            )}
              </Box>
               )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
        <Row>
          <Col md="12">
            <Card>
              <Card.Header>
                <h4 className="card-title">Yêu cầu chờ duyệt</h4>
              </Card.Header>
              <Card.Body>
              <Box>
              {loading ? (
                    <div className="text-center">
                      <Spinner animation="border" role="status" />
                      <p className="mt-2">Đang tải dữ liệu...</p>
                    </div>
                  ) : (
                    <div style={{ height: 400, width: "100%" }}>
                      <DataGrid
                        rows={requests}
                        columns={columns}
                        pageSize={5}
                        rowsPerPageOptions={[5]}
                        disableSelectionOnClick
                      />
                    </div>
                  )}
                </Box>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
}

export default Dashboard;

