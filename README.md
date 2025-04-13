### HỆ THỐNG QUẢN LÝ KHÓA HỌC TRỰC TUYẾN CHO CÁC TRƯỜNG THPT
##### Giới Thiệu
***
- Hệ thống quản lý khóa học trực tuyến được xây dựng nhằm phục vụ nhu cầu học tập của học sinh THPT trong thời đại số. Với mục tiêu phát triển một nền tảng học trực tuyến dễ sử dụng, giúp học sinh và giáo viên có thể học tập và giảng dạy thuận tiện thông qua điện thoại di động và website.
    
- Ứng dụng di động học trực tuyến được phát triển trên nền tảng Android, sử dụng Java và Firebase. Website quản lý khóa học được phát triển để hỗ trợ giáo viên và quản trị viên trong việc quản lý các khóa học, lớp học, người dùng và các hoạt động thanh toán.
  
![image](https://firebasestorage.googleapis.com/v0/b/courseonline-6050b.appspot.com/o/WebsiteQuanTri.png?alt=media&token=00b608f4-4469-4a09-8327-0ce4c1ae4529)

##### Nghiệp vụ chung: 
***
- Học Sinh: Sau khi đăng nhập, học sinh có thể tìm kiếm khóa học, tham gia lớp học, xem bài giảng, và làm bài tập.
- Giáo Viên: Giáo viên có thể tạo khóa học, quản lý lớp học, xem báo cáo thống kê.
- Quản Trị Viên: Quản trị viên có quyền quản lý người dùng, khóa học, và các hóa đơn thanh toán.
##### Công nghệ sử dụng: 
***
- Android Studio
- Java
- Firebase
##### Sơ đồ Usecase tổng quát: 
***
![image](https://firebasestorage.googleapis.com/v0/b/courseonline-6050b.appspot.com/o/Usecase.png?alt=media&token=38309341-053b-4a1c-a0e1-2e6aa3c7d0ab)
##### Lược đồ cơ sở dữ liệu: 
***
![image](https://firebasestorage.googleapis.com/v0/b/courseonline-6050b.appspot.com/o/LuocDoCSDL.png?alt=media&token=113aca07-1467-43e9-99ea-24a83641d368)
##### Chức năng chung:
***
-	Đăng nhập/đăng ký/quên mật khẩu: Đăng ký một tài khoản để đăng nhập vào hệ thống, nếu quên mật khẩu có thể dùng chức năng quên mật khẩu để đổi lại mật khẩu mới
-	Thông tin cá nhân: Mỗi người dùng có thể quản lý, cập nhật thông tin cá nhân của bản thân.
##### Chức năng học sinh: 
***
-	Xem/tìm kiếm khóa học: Bên trong ứng dụng học sinh có thể xem và tìm kiếm các khóa học phù hợp, các khóa học được chia theo từng danh mục, thể loại, theo lớp để tiện cho học sinh dễ tìm ra khóa học phù hợp.
-	Tham gia lớp học: Khác với khóa học học sinh phải thanh toán để sở hữu khóa học thì đối với lớp học, học sinh có thể tham gia qua mã ghi danh và mật khẩu hoặc có thể được thêm bởi giáo viên mà không cần thanh toán.
-	Thanh toán/Xem lịch sử thanh toán: Sau khi tìm được khóa học, học sinh có thể tiến hành thanh toán, ứng dụng cung cấp ba phương thức thanh toán khác nhau để thanh toán khóa học là: zalo pay, google pay, điểm tích lũy. Sau khi thanh toán, hóa đơn thanh toán sẽ được lưu lại, học sinh có thể xem lại bên trong phần cài đặt của ứng dụng.  Bên cạnh đó học sinh vẫn có thể tham gia trực tiếp các khóa học miễn phí mà không cần qua thanh toán.
-	Chi tiết khóa học/lớp học: Mỗi khóa học sẽ bao gồm các chi tiết như tên khóa học, mô tả, số lượng học sinh tham gia, đánh giá, tiến độ bài giảng, tiến độ bài tập. Các khóa học sẽ có các chương, bên trong mỗi chương là các tài nguyên học tập bao gồm: video và tài liệu bài giảng, bài tập trắc nghiệm, ứng dụng còn cung cấp, xem lịch sử làm bài, chức năng phân tích câu hỏi và đáp án với bot cho phần bài tập. Riêng lớp học sẽ có thêm nhóm thảo luận và thống kê chi tiết tiến độ học tập.
-	Xếp hạng: Ứng dụng sẽ xếp hạng người dùng trong ứng dụng dựa trên điểm tích lũy, điểm tích lũy có thể thu thập dựa trên việc tương tác với ứng dụng như: đăng nhập mỗi ngày, duy trì vị trí xếp hạng, thanh toán khóa học. Điểm tích lũy có thể dùng để đổi khóa học và mỗi số lượng điểm tích lũy khác nhau, các người dùng sẽ có những biểu tượng cấp độ khác nhau nhằm kích thích sự tương tác của người dùng với ứng dụng.
-	Đánh giá khóa học: Sau khi tham gia khóa học, học sinh có thể đánh giá sao và để lại ý kiến cho khóa học.
-	Hẹn giờ học: Học sinh có thể bật tắt hẹn giờ, khi đến giờ đã chọn thì ứng dụng sẽ gửi thông báo hẹn giờ đến thiết bị.
-	Nhóm thảo luận: Tùy mỗi lớp học sẽ có một nhóm thảo luận riêng, ở đây học sinh có thể đăng các chủ đề để cùng những học sinh khác thảo luận, đây là tính năng chỉ có ở lớp học, không có ở khóa học.
##### Chức năng giáo viên: 
***
-	Thống kê: Tại dashboard của website quản lý, giáo viên có thể xem các thống kê về khóa học, lớp học của họ, cũng như lợi nhuận, điểm đánh giá.
-	Quản lý khóa học/lớp học: Giáo viên được phép tạo các khóa học/lớp học và quản lý ngay trên website.
-	Sao chép thông tin lớp học: Giáo viên có thể tạo ra nhiều bản sao của lớp học nếu có nhu cầu dạy lại khóa mới mà không cần phải tạo mới lớp học.
##### Chức năng quản trị viên:
***
-	Thống kê: Tại dashboard của website quản lý, quản trị viên có thể xem các thống kê về khóa học, lớp học trên hệ thống, cũng như lợi nhuận, số lượng người dùng.
-	Quản lý người dùng: Quản trị viên được phép thêm người dùng mới hoặc cấm những người dùng nếu họ vi phạm điều khoản của hệ thống.
-	Quản lý môn: Quản trị viên có thể cập nhật các danh mục các môn cho ứng dụng.
-	Quản lý xếp hạng: Quản trị viên xem được bảng xếp hạng của người dùng.
-	Quản lý hóa đơn: Quản trị viên xem được tất cả hóa đơn thanh toán của người dùng khi họ hoàn tất thanh toán khóa học.
-	Quản lý khóa học/lớp học: Quản trị viên được phép khóa/mở khóa khóa học của giáo viên.
-	Duyệt/Ẩn khóa học, lớp học: Quản trị viên sẽ duyệt những khóa học của những giáo viên trước khi đưa khóa học lên ứng dụng cũng như có thể gỡ những khóa học không phù hợp tiêu chuẩn khỏi ứng dụng.
##### Dưới đây là link source code website quản trị của giáo viên và quản trị viên:
[Link source code ứng dụng](https://github.com/tinhnguyentrung2002/projectCourseOnline)
##### Video demo - Click vào link ảnh phía dưới để mở video:
***
- Phút 0: Demo ứng dụng
- Phút 10.55 : Demo website quản lý
***
[![Xem demo](https://img.youtube.com/vi/FGceJd4UqW0/maxresdefault.jpg)](https://www.youtube.com/watch?v=FGceJd4UqW0)
