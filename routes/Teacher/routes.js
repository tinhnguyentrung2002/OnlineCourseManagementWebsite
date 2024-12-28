import Dashboard from "../../Screens/Teacher/Dashboard.js";
import UserProfile from '../../Screens/Teacher/UserProfile.js';
import CourseManagement from '../../Screens/Teacher/CourseManagement.js';
import CourseDetail from "../../Components/CourseDetail.js";
import ClassManagement from '../../Screens/Teacher/ClassManagement.js';
import ClassDetail from "../../Components/ClassDetail.js";
import RequestManagement from "../../Screens/Teacher/RequestManagement.js"
const dashboardRoutes = [
{
    path: "/dashboard",
    name: "Tổng quan",
    icon: "fa-solid fa-chart-pie",
    component: Dashboard,
    layout: "/giao-vien"
},
{
    path: "/user",
    name: "Thông tin cá nhân",
    icon: "fa-solid fa-user",
    component: UserProfile,
    layout: "/giao-vien"
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
    layout: "/giao-vien"
},
{
    path: "/quan-ly-lop-hoc",
    name: "Quản lý lớp học",
    icon: "fa-solid fa-chalkboard-user",
    component: ClassManagement,
    layout: "/giao-vien"
},
{
    path: "/quan-ly-yeu-cau",
    name: "Quản lý yêu cầu",
    icon: "fa-solid fa-note-sticky",
    component: RequestManagement,
    layout: "/giao-vien"
},
{
    path: "/chi-tiet-khoa-hoc/:courseId",
    component: CourseDetail,
    name: "",
    layout: "/giao-vien"
  },
  {
    path: "/chi-tiet-lop-hoc/:courseId",
    component: ClassDetail,
    name: "",
    layout: "/giao-vien"
  },


];

export default dashboardRoutes;
