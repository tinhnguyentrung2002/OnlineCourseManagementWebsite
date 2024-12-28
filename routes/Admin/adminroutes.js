import Dashboard from "../../Screens/Admin/Dashboard.js";
import CourseManagement from '../../Screens/Admin/CourseManagement.js';
import AdminCourseDetail from "../../Components/AdminCourseDetail.js";
import ClassManagement from '../../Screens/Admin/ClassManagement.js';
import AdminClassDetail from "../../Components/AdminClassDetail.js";
import RequestManagement from '../../Screens/Admin/RequestManagement.js'
import StudentManagement from "../../Screens/Admin/StudentManagement.js";
import TeacherManagement from "../../Screens/Admin/TeacherManagement.js";
import CategoryManagement from "../../Screens/Admin/CategoryManagement.js";
import RankManagement from "../../Screens/Admin/RankManagement.js";
import OrderManagement from "../../Screens/Admin/OrderManagement.js";
const dashboardRoutes = [
{
    path: "/dashboard",
    name: "Tổng quan",
    icon: "fa-solid fa-chart-pie",
    component: Dashboard,
    layout: "/admin"
},
{
    path: "/quan-ly-the-loai",
    name: "Quản lý thể loại",
    icon: "fa-solid fa-list",
    component: CategoryManagement,
    layout: "/admin"
},
{
    path: "/quan-ly-xep-hang",
    name: "Quản lý xếp hạng",
    icon: "fa-solid fa-ranking-star",
    component: RankManagement,
    layout: "/admin"
},
{
    path: "/quan-ly-hoa-don",
    name: "Quản lý hóa đơn",
    icon: "fa-solid fa-file-invoice-dollar",
    component: OrderManagement,
    layout: "/admin"
},

// {
//     path: "/table",
//     name: "Quản lý khóa học",
//     icon: "nc-icon nc-notes",
//     component: TableList,
//     layout: "/giao-vien"
// },
{
    path: "/quan-ly-khoa-hoc",
    name: "Quản lý khóa học",
    icon: "fa-solid fa-chalkboard",
    component: CourseManagement,
    layout: "/admin"
},
{
    path: "/quan-ly-lop-hoc",
    name: "Quản lý lớp học",
    icon: "fa-solid fa-chalkboard-user",
    component: ClassManagement,
    layout: "/admin"
},
{
    path: "/quan-ly-yeu-cau",
    name: "Quản lý yêu cầu",
    icon: "fa-solid fa-note-sticky",
    component: RequestManagement,
    layout: "/admin"
},
{
    path: "/quan-ly-nguoi-hoc",
    name: "Quản lý người học",
    icon: "fa-solid fa-user",
    component: StudentManagement,
    layout: "/admin"
},
{
    path: "/quan-ly-giao-vien",
    name: "Quản lý giáo viên",
    icon: "fa-solid fa-user-tie",
    component: TeacherManagement,
    layout: "/admin"
},
// {
//     path: "/quan-ly-the-loai",
//     name: "Quản lý yêu cầu",
//     icon: "nc-icon nc-paper-2",
//     component: RequestManagement,
//     layout: "/admin"
// },
// {
//     path: "/quan-ly-hoa-don",
//     name: "Quản lý yêu cầu",
//     icon: "nc-icon nc-paper-2",
//     component: RequestManagement,
//     layout: "/admin"
// },
{
    path: "/khoa-hoc/:courseId",
    component: AdminCourseDetail,
    name: "",
    layout: "/admin"
  },
  {
    path: "/lop-hoc/:courseId",
    component: AdminClassDetail,
    name: "",
    layout: "/admin"
  },


];

export default dashboardRoutes;
